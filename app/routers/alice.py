from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Scenario, ScenarioRun
from app.scenario_engine import device_states, run_scenario
from app.yandex_client import client

router = APIRouter(prefix="/alice", tags=["alice"])

ON_OFF = "devices.capabilities.on_off"
GREETING = "Привет! Спросите про температуру, влажность, какие устройства офлайн, когда последний раз сработал сценарий, либо скажите «включи …» / «выключи …» / «запусти сценарий …»."
FALLBACK = "Не поняла вопрос. Спросите про температуру, влажность, устройства офлайн или сценарии — либо команду «включи …» / «выключи …» / «запусти сценарий …»."
EXIT_WORDS = ("выход", "хватит", "стоп", "пока")


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


async def _handle_command(command: str, db: Session) -> str:
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

    return FALLBACK


@router.post("/webhook")
async def alice_webhook(body: dict, db: Session = Depends(get_db)):
    request = body.get("request", {})
    session = body.get("session", {})
    command = (request.get("command") or "").strip().lower()

    if session.get("new") and not command:
        text = GREETING
    elif any(word in command for word in EXIT_WORDS):
        return {
            "response": _reply("До встречи!", end_session=True),
            "session": session,
            "version": body.get("version", "1.0"),
        }
    else:
        text = await _handle_command(command, db)

    return {
        "response": _reply(text),
        "session": session,
        "version": body.get("version", "1.0"),
    }
