import asyncio
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.models import DeviceStateEvent, Scenario, ScenarioRun
from app.ws import manager
from app.yandex_client import client

POLL_INTERVAL_SECONDS = 30

scheduler = AsyncIOScheduler()

StateKey = tuple[str, str, str]

_last_snapshot: dict[StateKey, Any] | None = None
_value_since: dict[StateKey, tuple[Any, datetime]] = {}

engine_status: dict[str, Any] = {"ok": True, "last_poll_at": None, "last_error": None}

# device_id -> "online" | "offline", refreshed every poll tick. GET /user/info doesn't
# report this per-device, only GET /devices/{id} does, so it's fetched separately.
device_states: dict[str, str] = {}


async def refresh_device_states(device_ids: list[str]) -> None:
    results = await asyncio.gather(*(client.get_device(did) for did in device_ids), return_exceptions=True)
    for device_id, result in zip(device_ids, results):
        if isinstance(result, Exception):
            continue
        state = result.get("state")
        if state:
            device_states[device_id] = state


def annotate_device_states(user_info: dict) -> dict:
    for device in user_info.get("devices", []):
        device["state"] = device_states.get(device["id"], "unknown")
    return user_info


def build_snapshot(user_info: dict) -> tuple[dict[StateKey, Any], dict[str, str]]:
    snapshot: dict[StateKey, Any] = {}
    device_names: dict[str, str] = {}
    for device in user_info.get("devices", []):
        device_names[device["id"]] = device.get("name")
        for item in device.get("capabilities", []) + device.get("properties", []):
            state = item.get("state")
            if not state or state.get("instance") is None:
                continue
            key = (device["id"], item["type"], state["instance"])
            snapshot[key] = state.get("value")
    return snapshot, device_names


def evaluate_operator(operator: str, current: Any, target: Any) -> bool:
    if current is None:
        return False
    try:
        if operator == "eq":
            return current == target
        if operator == "ne":
            return current != target
        if operator == "gt":
            return current > target
        if operator == "gte":
            return current >= target
        if operator == "lt":
            return current < target
        if operator == "lte":
            return current <= target
    except TypeError:
        return False
    return False


def evaluate_rule(rule: dict, snapshot: dict[StateKey, Any]) -> bool:
    key = (rule["device_id"], rule["capability_type"], rule["instance"])
    current = snapshot.get(key)
    if not evaluate_operator(rule.get("operator", "eq"), current, rule.get("value")):
        return False
    for_seconds = rule.get("for_seconds")
    if for_seconds:
        since = _value_since.get(key)
        if since is None or since[0] != current:
            return False
        if (datetime.utcnow() - since[1]).total_seconds() < for_seconds:
            return False
    return True


def evaluate_conditions(conditions: list[dict], snapshot: dict[StateKey, Any]) -> bool:
    for group in conditions:
        rules = group.get("rules", [])
        if rules and not any(evaluate_rule(rule, snapshot) for rule in rules):
            return False
    return True


async def run_scenario(
    db: Session,
    scenario: Scenario,
    trigger_kind: str,
    snapshot: dict[StateKey, Any] | None = None,
) -> ScenarioRun:
    if snapshot is None:
        user_info = await client.get_user_info()
        snapshot, _ = build_snapshot(user_info)

    if not evaluate_conditions(scenario.conditions, snapshot):
        run = ScenarioRun(
            scenario_id=scenario.id,
            trigger_kind=trigger_kind,
            status="condition_not_met",
            detail=None,
        )
        db.add(run)
        db.commit()
        return run

    results = []
    has_error = False
    for action in scenario.actions:
        delay = action.get("delay_seconds") or 0
        if delay:
            await asyncio.sleep(delay)
        try:
            res = await client.send_actions(
                action["device_id"],
                [{"type": action["type"], "state": {"instance": action["instance"], "value": action["value"]}}],
            )
            results.append({"action": action, "result": res})
        except Exception as e:
            has_error = True
            results.append({"action": action, "error": str(e)})

    run = ScenarioRun(
        scenario_id=scenario.id,
        trigger_kind=trigger_kind,
        status="error" if has_error else "ok",
        detail=results,
    )
    db.add(run)
    db.commit()
    return run


async def poll_tick() -> None:
    global _last_snapshot
    now = datetime.utcnow()
    try:
        user_info = await client.get_user_info()
    except Exception as e:
        engine_status["ok"] = False
        engine_status["last_poll_at"] = now.isoformat()
        engine_status["last_error"] = str(e)
        await manager.broadcast({"type": "status", **engine_status})
        return

    await refresh_device_states([d["id"] for d in user_info.get("devices", [])])
    annotate_device_states(user_info)

    db = SessionLocal()
    try:
        snapshot, device_names = build_snapshot(user_info)

        for key, value in snapshot.items():
            prev = _value_since.get(key)
            if prev is None or prev[0] != value:
                _value_since[key] = (value, now)

        if _last_snapshot is not None:
            changed_keys = {key for key, value in snapshot.items() if _last_snapshot.get(key) != value}
            for key in changed_keys:
                device_id, capability_type, instance = key
                db.add(
                    DeviceStateEvent(
                        device_id=device_id,
                        device_name=device_names.get(device_id),
                        capability_type=capability_type,
                        instance=instance,
                        value=snapshot[key],
                        recorded_at=now,
                    )
                )
            if changed_keys:
                db.commit()
                scenarios = db.query(Scenario).filter(Scenario.enabled.is_(True)).all()
                for scenario in scenarios:
                    trig = scenario.trigger
                    if trig.get("kind") != "device_state":
                        continue
                    key = (trig["device_id"], trig["capability_type"], trig["instance"])
                    if key not in changed_keys:
                        continue
                    if evaluate_operator(trig.get("operator", "eq"), snapshot.get(key), trig.get("value")):
                        await run_scenario(db, scenario, "device_state", snapshot)

        _last_snapshot = snapshot

        engine_status["ok"] = True
        engine_status["last_poll_at"] = now.isoformat()
        engine_status["last_error"] = None
        await manager.broadcast({"type": "snapshot", "data": user_info})
        await manager.broadcast({"type": "status", **engine_status})
    finally:
        db.close()


def _schedule_job_id(scenario_id: int) -> str:
    return f"scenario:{scenario_id}"


def _convert_dow_token(token: str) -> str:
    # Crontab numbers weekdays Sun=0..Sat=6; APScheduler numbers them Mon=0..Sun=6
    # (it matches them against date.weekday()). Convert plain digits/ranges only —
    # symbolic names ('mon', 'sat-sun') are passed through unchanged.
    if "-" in token:
        start, end = token.split("-", 1)
        if start.isdigit() and end.isdigit():
            return f"{(int(start) + 6) % 7}-{(int(end) + 6) % 7}"
        return token
    if token.isdigit():
        return str((int(token) + 6) % 7)
    return token


def _convert_crontab_dow(field: str) -> str:
    if field == "*":
        return field
    return ",".join(_convert_dow_token(t) for t in field.split(","))


def _build_cron_trigger(cron: str) -> CronTrigger:
    minute, hour, day, month, dow = cron.split()
    return CronTrigger(minute=minute, hour=hour, day=day, month=month, day_of_week=_convert_crontab_dow(dow))


async def _run_schedule_scenario(scenario_id: int, trigger_kind: str = "schedule") -> None:
    db = SessionLocal()
    try:
        scenario = db.get(Scenario, scenario_id)
        if scenario and scenario.enabled:
            await run_scenario(db, scenario, trigger_kind)
    finally:
        db.close()


def _sun_job_id(scenario_id: int) -> str:
    return f"sun:{scenario_id}"


def _sun_times_today(for_date) -> dict[str, datetime]:
    from astral import LocationInfo
    from astral.sun import sun

    observer = LocationInfo(latitude=settings.home_latitude, longitude=settings.home_longitude).observer
    return sun(observer, date=for_date, tzinfo=ZoneInfo(settings.timezone))


def sync_sun_jobs(db: Session) -> None:
    for job in scheduler.get_jobs():
        if job.id.startswith("sun:"):
            scheduler.remove_job(job.id)

    scenarios = db.query(Scenario).filter(Scenario.enabled.is_(True)).all()
    sun_scenarios = [s for s in scenarios if s.trigger.get("kind") == "sun"]
    if not sun_scenarios:
        return

    if settings.home_latitude is None or settings.home_longitude is None:
        for scenario in sun_scenarios:
            print(
                f"[scenario_engine] Сценарий '{scenario.name}' использует триггер по закату/восходу, "
                "но HOME_LATITUDE/HOME_LONGITUDE не заданы в .env — триггер не сработает."
            )
        return

    tz = ZoneInfo(settings.timezone)
    now_local = datetime.now(tz)
    times = _sun_times_today(now_local.date())

    for scenario in sun_scenarios:
        trig = scenario.trigger
        base = times.get(trig["event"])
        if base is None:
            continue
        run_at = base + timedelta(minutes=trig.get("offset_minutes", 0))
        if run_at < now_local:
            continue
        scheduler.add_job(
            _run_schedule_scenario,
            DateTrigger(run_date=run_at),
            id=_sun_job_id(scenario.id),
            args=[scenario.id, "sun"],
            replace_existing=True,
        )


def sync_schedule_jobs(db: Session) -> None:
    for job in scheduler.get_jobs():
        if job.id.startswith("scenario:"):
            scheduler.remove_job(job.id)

    scenarios = db.query(Scenario).filter(Scenario.enabled.is_(True)).all()
    for scenario in scenarios:
        trig = scenario.trigger
        if trig.get("kind") != "schedule":
            continue
        scheduler.add_job(
            _run_schedule_scenario,
            _build_cron_trigger(trig["cron"]),
            id=_schedule_job_id(scenario.id),
            args=[scenario.id],
            replace_existing=True,
        )

    sync_sun_jobs(db)


async def _recompute_sun_jobs() -> None:
    db = SessionLocal()
    try:
        sync_sun_jobs(db)
    finally:
        db.close()


def start_engine() -> None:
    db = SessionLocal()
    try:
        sync_schedule_jobs(db)
    finally:
        db.close()
    scheduler.add_job(poll_tick, IntervalTrigger(seconds=POLL_INTERVAL_SECONDS), id="poller", replace_existing=True)
    scheduler.add_job(
        _recompute_sun_jobs,
        CronTrigger(hour=0, minute=5, timezone=ZoneInfo(settings.timezone)),
        id="sun-recompute",
        replace_existing=True,
    )
    scheduler.start()


def stop_engine() -> None:
    scheduler.shutdown(wait=False)
