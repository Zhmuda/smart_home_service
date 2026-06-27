import re
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Reminder, Scenario, ScenarioRun
from app.scenario_engine import _last_snapshot, device_states, run_scenario
from app.yandex_client import client

router = APIRouter(prefix="/alice", tags=["alice"])

ON_OFF = "devices.capabilities.on_off"
GREETING = (
    "Привет! Вот что я умею. "
    "Сводка: «как дома» — температура, влажность, статус устройств и последний сценарий. "
    "Климат: «какая температура» или «какая влажность». "
    "Устройства: «включи» или «выключи» плюс название, «какие устройства офлайн». "
    "Сценарии: «запусти сценарий» плюс название, «когда последний раз сработал сценарий». "
    "Напоминания: «напомни» — создать, «измени напоминание» — изменить название или перенести время. "
    "Для выхода скажите «стоп»."
)
FALLBACK = (
    "Не поняла команду. Попробуйте: «как дома», «какая температура», «включи …», "
    "«запусти сценарий …», «напомни», «измени напоминание»."
)
EXIT_WORDS = ("выход", "хватит", "стоп", "пока")

# Состояние диалога: session_id -> {"step": str, "subject": str}
_session_state: dict[str, dict] = {}


def _parse_duration(text: str) -> timedelta | None:
    patterns = [
        (r'(\d+)\s*минут', lambda m: timedelta(minutes=int(m.group(1)))),
        (r'(\d+)\s*час', lambda m: timedelta(hours=int(m.group(1)))),
        (r'(\d+)\s*секунд', lambda m: timedelta(seconds=int(m.group(1)))),
        (r'(\d+)\s*день|(\d+)\s*дня|(\d+)\s*дней', lambda m: timedelta(days=int(next(g for g in m.groups() if g)))),
        (r'полчаса', lambda m: timedelta(minutes=30)),
        (r'час', lambda m: timedelta(hours=1)),
    ]
    for pattern, fn in patterns:
        m = re.search(pattern, text)
        if m:
            return fn(m)
    return None


def _reply(text: str, end_session: bool = False) -> dict[str, Any]:
    return {"text": text, "tts": text, "end_session": end_session}


def _find_property(devices: list[dict], instance: str) -> tuple[dict, float] | None:
    for device in devices:
        for prop in device.get("properties", []):
            state = prop.get("state")
            if state and state.get("instance") == instance:
                return device, state.get("value")
    return None


def _stem(word: str) -> str:
    # Crude fix for Russian noun case endings ("лампочка" vs "лампочку") —
    # drop the last 1-2 letters so simple substring matching survives declension.
    return word[:-2] if len(word) > 5 else word[:-1] if len(word) > 3 else word


def _name_matches(name: str, command: str) -> bool:
    words = [w for w in name.lower().split() if len(w) > 2]
    return bool(words) and all(_stem(w) in command for w in words)


def _find_device_by_name(devices: list[dict], command: str) -> dict | None:
    for device in devices:
        if _name_matches(device.get("name") or "", command):
            return device
    return None


def _find_scenario_by_name(scenarios: list[Scenario], command: str) -> Scenario | None:
    for scenario in scenarios:
        if _name_matches(scenario.name, command):
            return scenario
    return None


def _snapshot_value(instance: str) -> float | None:
    if _last_snapshot is None:
        return None
    for (_, _, inst), value in _last_snapshot.items():
        if inst == instance:
            return value
    return None


def _time_ago(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = int((now - dt).total_seconds())
    if diff < 60:
        return "только что"
    if diff < 3600:
        return f"{diff // 60} мин. назад"
    if diff < 86400:
        return f"{diff // 3600} ч. назад"
    return f"{diff // 86400} дн. назад"


async def _home_summary(db: Session) -> str:
    parts = []

    temp = _snapshot_value("temperature")
    humidity = _snapshot_value("humidity")
    if temp is not None:
        parts.append(f"температура {temp}°")
    if humidity is not None:
        parts.append(f"влажность {int(humidity)}%")

    offline = [did for did, state in device_states.items() if state != "online"]
    if offline:
        try:
            user_info = await client.get_user_info()
            names = {d["id"]: d["name"] for d in user_info.get("devices", [])}
            offline_names = [names.get(d, d) for d in offline]
            parts.append(f"офлайн: {', '.join(offline_names)}")
        except Exception:
            parts.append(f"офлайн устройств: {len(offline)}")
    else:
        parts.append("все устройства онлайн")

    last = db.query(ScenarioRun).order_by(ScenarioRun.triggered_at.desc()).first()
    if last:
        scenario = db.get(Scenario, last.scenario_id)
        name = scenario.name if scenario else f"#{last.scenario_id}"
        status = "успешно" if last.status == "ok" else last.status
        parts.append(f"последний сценарий «{name}» сработал {_time_ago(last.triggered_at)}, {status}")
    else:
        parts.append("сценарии ещё не запускались")

    return ". ".join(parts).capitalize() + "."


async def _handle_command(command: str, db: Session) -> str:
    if any(w in command for w in ("как дома", "что дома", "сводка", "что происходит", "доклад")):
        return await _home_summary(db)

    if "температур" in command:
        user_info = await client.get_user_info()
        found = _find_property(user_info.get("devices", []), "temperature")
        if not found:
            return "Не нашла датчик температуры."
        device, value = found
        return f"{device['name']}: {value} градусов."

    if "влажност" in command:
        user_info = await client.get_user_info()
        found = _find_property(user_info.get("devices", []), "humidity")
        if not found:
            return "Не нашла датчик влажности."
        device, value = found
        return f"{device['name']}: влажность {value} процентов."

    if "офлайн" in command or "не работа" in command or "доступн" in command:
        offline = [name for name, state in device_states.items() if state != "online"]
        if not offline:
            return "Все устройства онлайн."
        user_info = await client.get_user_info()
        names = {d["id"]: d["name"] for d in user_info.get("devices", [])}
        offline_names = [names.get(d, d) for d in offline]
        return f"Офлайн: {', '.join(offline_names)}."

    if "сценар" in command and ("запусти" in command or "выполни" in command):
        scenarios = db.query(Scenario).filter(Scenario.enabled.is_(True)).all()
        scenario = _find_scenario_by_name(scenarios, command)
        if not scenario:
            return "Не нашла такой сценарий."
        await run_scenario(db, scenario, "manual")
        return f"Запустила сценарий «{scenario.name}»."

    if "сценар" in command:
        last = db.query(ScenarioRun).order_by(ScenarioRun.triggered_at.desc()).first()
        if not last:
            return "Сценарии ещё не запускались."
        scenario = db.get(Scenario, last.scenario_id)
        name = scenario.name if scenario else f"#{last.scenario_id}"
        return f"Последний сценарий «{name}», статус: {last.status}."

    if "включи" in command or "выключи" in command:
        user_info = await client.get_user_info()
        device = _find_device_by_name(user_info.get("devices", []), command)
        if not device:
            return "Не нашла такое устройство."
        value = "включи" in command
        await client.send_actions(device["id"], [{"type": ON_OFF, "state": {"instance": "on", "value": value}}])
        return f"{'Включила' if value else 'Выключила'} «{device['name']}»."

    if any(w in command for w in ("напомни", "напоминание", "напомнить")) and not any(w in command for w in ("измени", "изменить", "редактируй")):
        return "__START_REMINDER__"

    if any(w in command for w in ("измени", "изменить", "редактируй", "перенеси", "переименуй")):
        return "__START_EDIT__"

    return FALLBACK


@router.post("/webhook")
async def alice_webhook(body: dict, db: Session = Depends(get_db)):
    request = body.get("request", {})
    session = body.get("session", {})
    session_id = session.get("session_id", "")
    command = (request.get("command") or "").strip().lower()

    if any(word in command for word in EXIT_WORDS):
        _session_state.pop(session_id, None)
        return {
            "response": _reply("До встречи!", end_session=True),
            "session": session,
            "version": body.get("version", "1.0"),
        }

    state = _session_state.get(session_id)

    # --- Создание напоминания ---
    if state and state["step"] == "awaiting_subject":
        if not command:
            text = "Не расслышала. О чём напомнить?"
        else:
            _session_state[session_id] = {"step": "awaiting_time", "subject": command}
            text = f"Хорошо, напомню о «{command}». Через сколько? Например: «через 30 минут» или «через 2 часа»."

    elif state and state["step"] == "awaiting_time":
        delta = _parse_duration(command)
        if not delta:
            text = "Не поняла время. Скажите, например: «через 30 минут» или «через час»."
        else:
            subject = state["subject"]
            remind_at = datetime.utcnow() + delta
            db.add(Reminder(subject=subject, remind_at=remind_at))
            db.commit()
            _session_state.pop(session_id, None)
            minutes = int(delta.total_seconds() // 60)
            when = f"через {minutes} минут" if minutes < 60 else (f"через {minutes // 60} ч." if not minutes % 60 else f"через {minutes // 60} ч. {minutes % 60} мин.")
            text = f"Напоминание установлено. Напомню о «{subject}» {when}."

    # --- Редактирование напоминания ---
    elif state and state["step"] == "edit_awaiting_which":
        pending = db.query(Reminder).filter(Reminder.sent.is_(False)).all()
        match = next((r for r in pending if _name_matches(r.subject, command)), None)
        if not match:
            names = ", ".join(f"«{r.subject}»" for r in pending[:3]) or "нет активных"
            text = f"Не нашла такое напоминание. Активные: {names}. Повторите название."
        else:
            _session_state[session_id] = {"step": "edit_awaiting_field", "reminder_id": match.id, "subject": match.subject}
            text = f"Нашла «{match.subject}». Что изменить: название или время?"

    elif state and state["step"] == "edit_awaiting_field":
        if "название" in command or "назв" in command or "имя" in command:
            _session_state[session_id] = {**state, "step": "edit_awaiting_name"}
            text = "Как переименовать напоминание?"
        elif any(w in command for w in ("время", "перенести", "перенеси", "перенести")):
            _session_state[session_id] = {**state, "step": "edit_awaiting_newtime"}
            text = "На какое время перенести? Например: «через час» или «через 2 часа»."
        else:
            text = "Скажите «название» чтобы переименовать или «время» чтобы перенести."

    elif state and state["step"] == "edit_awaiting_name":
        if not command:
            text = "Не расслышала. Как переименовать?"
        else:
            reminder = db.get(Reminder, state["reminder_id"])
            if reminder:
                old = reminder.subject
                reminder.subject = command
                db.commit()
            _session_state.pop(session_id, None)
            text = f"Переименовала «{old}» в «{command}»."

    elif state and state["step"] == "edit_awaiting_newtime":
        delta = _parse_duration(command)
        if not delta:
            text = "Не поняла время. Скажите, например: «через час» или «через 30 минут»."
        else:
            reminder = db.get(Reminder, state["reminder_id"])
            if reminder:
                reminder.remind_at = datetime.utcnow() + delta
                reminder.sent = False
                db.commit()
            _session_state.pop(session_id, None)
            minutes = int(delta.total_seconds() // 60)
            when = f"через {minutes} минут" if minutes < 60 else f"через {minutes // 60} ч."
            text = f"Напоминание «{state['subject']}» перенесено на {when}."

    elif session.get("new") and not command:
        text = GREETING

    else:
        text = await _handle_command(command, db)
        if text == "__START_REMINDER__":
            _session_state[session_id] = {"step": "awaiting_subject"}
            text = "О чём напомнить?"
        elif text == "__START_EDIT__":
            pending = db.query(Reminder).filter(Reminder.sent.is_(False)).all()
            if not pending:
                text = "Нет активных напоминаний для редактирования."
            else:
                _session_state[session_id] = {"step": "edit_awaiting_which"}
                names = ", ".join(f"«{r.subject}»" for r in pending[:3])
                text = f"Какое напоминание изменить? Активные: {names}."

    return {
        "response": _reply(text),
        "session": session,
        "version": body.get("version", "1.0"),
    }
