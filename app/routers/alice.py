import re
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import CalendarEvent, Expense, Reminder, Saving, SavingGoal, Scenario, ScenarioRun, ShoppingItem
from app.scenario_engine import _last_snapshot, device_states, run_scenario
from app.yandex_client import client

router = APIRouter(prefix="/alice", tags=["alice"])

GREETING = (
    "Привет! Вот что я умею. "
    "«Как дома» — сводка по дому. "
    "«Напомни» — напоминание. "
    "«Добавь [товар] в список» — покупки. "
    "«Записи [сумма] рублей на [категория]» — расходы. "
    "«Положи [сумма] в копилку» — накопления. "
    "«Запланируй дело» — добавить в семейный календарь. "
    "«Что на [дату]» — события на день. "
    "Для выхода — «стоп»."
)
FALLBACK = (
    "Не поняла команду. Попробуйте: «как дома», «напомни», «добавь в список», "
    "«записи расход», «положи в копилку», «запланируй дело», «что на завтра»."
)

_WEEKDAYS = {
    "понедельник": 0, "вторник": 1, "среду": 2, "среда": 2,
    "четверг": 3, "пятницу": 4, "пятница": 4,
    "субботу": 5, "суббота": 5, "воскресенье": 6,
}
_MONTHS = {
    "январ": 1, "феврал": 2, "март": 3, "апрел": 4,
    "май": 5, "мая": 5, "июн": 6, "июл": 7, "август": 8,
    "сентябр": 9, "октябр": 10, "ноябр": 11, "декабр": 12,
}
_MONTH_NAMES = {
    1: "января", 2: "февраля", 3: "марта", 4: "апреля",
    5: "мая", 6: "июня", 7: "июля", 8: "августа",
    9: "сентября", 10: "октября", 11: "ноября", 12: "декабря",
}


def _parse_russian_date(text: str) -> str | None:
    now = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=3)))  # Moscow
    today = now.date()

    if "послезавтра" in text:
        return (today + timedelta(days=2)).strftime("%Y-%m-%d")
    if "завтра" in text:
        return (today + timedelta(days=1)).strftime("%Y-%m-%d")
    if "сегодня" in text:
        return today.strftime("%Y-%m-%d")

    for name, wd in _WEEKDAYS.items():
        if name in text:
            days_ahead = (wd - today.weekday()) % 7 or 7
            return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    for stem, month_num in _MONTHS.items():
        if stem in text:
            m = re.search(r'(\d{1,2})\s+' + stem[:3], text)
            if m:
                day = int(m.group(1))
                try:
                    from datetime import date
                    d = date(today.year, month_num, day)
                    if d < today:
                        d = date(today.year + 1, month_num, day)
                    return d.strftime("%Y-%m-%d")
                except ValueError:
                    pass
    return None


def _parse_time_range(text: str) -> tuple[str | None, str | None]:
    m = re.search(r'с\s+(\d{1,2})(?::(\d{2}))?\s+до\s+(\d{1,2})(?::(\d{2}))?', text)
    if m:
        h1, m1, h2, m2 = m.groups()
        return f"{int(h1):02d}:{m1 or '00'}", f"{int(h2):02d}:{m2 or '00'}"
    m = re.search(r'в\s+(\d{1,2})(?::(\d{2}))?', text)
    if m:
        h, mn = m.groups()
        return f"{int(h):02d}:{mn or '00'}", None
    return None, None


def _format_event_time(start: str | None, end: str | None) -> str:
    if start and end:
        return f" с {start} до {end}"
    if start:
        return f" в {start}"
    return ""


def _query_calendar(text: str, db: Session) -> str:
    date_str = _parse_russian_date(text)
    if not date_str:
        now = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=3)))
        date_str = now.date().strftime("%Y-%m-%d")

    events = db.query(CalendarEvent).filter(CalendarEvent.event_date == date_str).order_by(CalendarEvent.start_time).all()
    d = datetime.strptime(date_str, "%Y-%m-%d")
    label = f"{d.day} {_MONTH_NAMES[d.month]}"

    if not events:
        return f"На {label} ничего не запланировано."
    parts = [f"На {label}:"]
    for ev in events:
        time_str = _format_event_time(ev.start_time, ev.end_time)
        parts.append(f"у {ev.person} — {ev.title}{time_str}")
    return ". ".join(parts) + "."
EXIT_WORDS = ("выход", "хватит", "стоп", "пока")

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


def _parse_amount(text: str) -> int | None:
    m = re.search(r'(\d+)', text)
    return int(m.group(1)) if m else None


def _reply(text: str, end_session: bool = False) -> dict[str, Any]:
    return {"text": text, "tts": text, "end_session": end_session}


def _stem(word: str) -> str:
    return word[:-2] if len(word) > 5 else word[:-1] if len(word) > 3 else word


def _name_matches(name: str, command: str) -> bool:
    words = [w for w in name.lower().split() if len(w) > 2]
    return bool(words) and all(_stem(w) in command for w in words)


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


def _shopping_list_reply(db: Session) -> str:
    pending = db.query(ShoppingItem).filter(ShoppingItem.bought.is_(False)).all()
    if not pending:
        return "Список покупок пуст."
    names = ", ".join(item.name for item in pending)
    return f"Нужно купить: {names}."


def _monthly_expense_total(db: Session, category: str | None = None) -> str:
    now = datetime.now(timezone.utc)
    q = db.query(func.sum(Expense.amount)).filter(
        extract("year", Expense.created_at) == now.year,
        extract("month", Expense.created_at) == now.month,
    )
    if category:
        q = q.filter(Expense.category.ilike(f"%{category}%"))
    total = q.scalar() or 0
    if category:
        return f"На «{category}» в этом месяце потрачено {total} рублей."
    return f"В этом месяце потрачено {total} рублей."


async def _handle_command(command: str, db: Session) -> str:
    if any(w in command for w in ("как дома", "что дома", "сводка", "что происходит", "доклад")):
        return await _home_summary(db)

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

    if any(w in command for w in ("напомни", "напоминание", "напомнить")) and not any(w in command for w in ("измени", "изменить", "редактируй")):
        return "__START_REMINDER__"

    # --- Переименование покупки (одним шагом) ---
    if "переименуй" in command:
        m = re.search(r'переименуй\s+(.+?)\s+в\s+(.+)', command)
        if m:
            old_name, new_name = m.group(1).strip(), m.group(2).strip()
            items = db.query(ShoppingItem).filter(ShoppingItem.bought.is_(False)).all()
            match = next((i for i in items if _stem(old_name[:5]) in i.name.lower()), None)
            if match:
                match.name = new_name
                db.commit()
                return f"Переименовала «{old_name}» в «{new_name}» в списке покупок."
            return f"Не нашла «{old_name}» в списке покупок."
        return "Скажите: «переименуй молоко в кефир»."

    if any(w in command for w in ("измени расход", "исправь расход", "поправь расход")):
        return "__START_EXPENSE_EDIT__"

    if any(w in command for w in ("измени вклад", "измени взнос", "исправь вклад", "исправь взнос")):
        return "__START_DEPOSIT_EDIT__"

    if any(w in command for w in ("измени", "изменить", "редактируй", "перенеси")):
        return "__START_EDIT__"

    # --- Список покупок ---
    if "добавь" in command and "список" in command:
        m = re.search(r'добавь\s+(.+?)\s+в\s+список', command)
        item_name = m.group(1).strip() if m else None
        if not item_name:
            return "Не поняла, что добавить. Скажите: «добавь молоко в список»."
        db.add(ShoppingItem(name=item_name))
        db.commit()
        return f"Добавила «{item_name}» в список покупок."

    if any(w in command for w in ("что нужно купить", "что купить", "список покупок", "что в списке")):
        return _shopping_list_reply(db)

    if command.startswith("купил") or command.startswith("купила"):
        m = re.search(r'купил[а]?\s+(.+)', command)
        item_name = m.group(1).strip() if m else None
        if item_name:
            items = db.query(ShoppingItem).filter(ShoppingItem.bought.is_(False)).all()
            match = next((i for i in items if _stem(item_name[:5]) in i.name.lower()), None)
            if match:
                match.bought = True
                db.commit()
                return f"Отметила «{match.name}» как купленное."
        return "Не нашла такой товар в списке."

    # --- Расходы ---
    if any(w in command for w in ("записи", "потратил", "расход")) and re.search(r'\d+', command):
        amount = _parse_amount(command)
        if not amount:
            return "Не поняла сумму. Скажите: «записи 500 рублей на продукты»."
        cat_m = re.search(r'на\s+(\w+)', command)
        category = cat_m.group(1) if cat_m else "прочее"
        db.add(Expense(amount=amount, category=category))
        db.commit()
        return f"Записала {amount} рублей на «{category}»."

    if "сколько потратили" in command or "расход за месяц" in command or "итог за месяц" in command:
        return _monthly_expense_total(db)

    if re.match(r'сколько на ', command):
        cat_m = re.search(r'сколько на\s+(\w+)', command)
        if cat_m:
            return _monthly_expense_total(db, cat_m.group(1))

    # --- Календарь (запрос) ---
    if any(w in command for w in ("что на", "что у", "что запланировано", "события на", "дела на")):
        return _query_calendar(command, db)

    # --- Календарь (добавление) ---
    if any(w in command for w in ("запланируй", "добавь в календарь", "добавь событие", "добавь дело")):
        return "__START_CALENDAR__"

    # --- Копилка ---
    if ("положи" in command or "добавь" in command) and "копилк" in command:
        amount = _parse_amount(command)
        if not amount:
            return "Не поняла сумму. Скажите: «положи 500 рублей в копилку»."
        goal = db.query(SavingGoal).order_by(SavingGoal.id).first()
        dep = Saving(amount=amount, owner=goal.owner if goal else "Общее", goal_id=goal.id if goal else None)
        db.add(dep)
        db.commit()
        if goal:
            total = db.query(func.sum(Saving.amount)).filter(Saving.goal_id == goal.id).scalar() or 0
            return f"Добавила {amount} рублей в «{goal.name}». Итого: {total} рублей."
        total = db.query(func.sum(Saving.amount)).scalar() or 0
        return f"Добавила {amount} рублей. Итого в копилке: {total} рублей."

    if "сколько в копилке" in command or "копилк" in command:
        goal = db.query(SavingGoal).order_by(SavingGoal.id).first()
        if goal:
            total = db.query(func.sum(Saving.amount)).filter(Saving.goal_id == goal.id).scalar() or 0
            if goal.target:
                pct = int(total / goal.target * 100)
                return f"В копилке «{goal.name}»: {total} рублей из {goal.target} — {pct}%."
            return f"В копилке «{goal.name}»: {total} рублей."
        total = db.query(func.sum(Saving.amount)).scalar() or 0
        return f"В копилке {total} рублей."

    if "на что копим" in command or "цель копилки" in command:
        goals = db.query(SavingGoal).order_by(SavingGoal.id).all()
        if not goals:
            return "Целей для накопления ещё нет."
        parts = []
        for g in goals:
            total = db.query(func.sum(Saving.amount)).filter(Saving.goal_id == g.id).scalar() or 0
            if g.target:
                left = max(0, g.target - total)
                parts.append(f"«{g.name}»: {total} из {g.target} рублей, осталось {left}")
            else:
                parts.append(f"«{g.name}»: {total} рублей")
        return "Копим: " + "; ".join(parts) + "."

    return FALLBACK


@router.post("/webhook")
async def alice_webhook(body: dict, db: Session = Depends(get_db)):
    request = body.get("request", {})
    session = body.get("session", {})
    session_id = session.get("session_id", "")
    command = (request.get("command") or "").strip().lower()

    command_words = set(command.split())
    if any(word in command_words for word in EXIT_WORDS):
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
            when = (
                f"через {minutes} минут" if minutes < 60
                else f"через {minutes // 60} ч." if not minutes % 60
                else f"через {minutes // 60} ч. {minutes % 60} мин."
            )
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
        elif any(w in command for w in ("время", "перенести", "перенеси")):
            _session_state[session_id] = {**state, "step": "edit_awaiting_newtime"}
            text = "На какое время перенести? Например: «через час» или «через 2 часа»."
        else:
            text = "Скажите «название» чтобы переименовать или «время» чтобы перенести."

    elif state and state["step"] == "edit_awaiting_name":
        if not command:
            text = "Не расслышала. Как переименовать?"
        else:
            reminder = db.get(Reminder, state["reminder_id"])
            old = state["subject"]
            if reminder:
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

    # --- Редактирование расхода ---
    elif state and state["step"] == "expense_edit_awaiting_amount":
        amount = _parse_amount(command)
        if not amount or amount <= 0:
            text = "Не поняла сумму. Повторите, например: «600»."
        else:
            exp = db.get(Expense, state["expense_id"])
            old_amount = state["old_amount"]
            if exp:
                exp.amount = amount
                db.commit()
            _session_state.pop(session_id, None)
            text = f"Изменила расход с {old_amount} на {amount} рублей."

    # --- Редактирование взноса в копилку ---
    elif state and state["step"] == "deposit_edit_awaiting_amount":
        amount = _parse_amount(command)
        if not amount or amount <= 0:
            text = "Не поняла сумму. Повторите, например: «1000»."
        else:
            dep = db.get(Saving, state["deposit_id"])
            old_amount = state["old_amount"]
            if dep:
                dep.amount = amount
                db.commit()
            _session_state.pop(session_id, None)
            text = f"Изменила взнос с {old_amount} на {amount} рублей."

    # --- Календарь: добавление ---
    elif state and state["step"] == "cal_awaiting_person":
        if not command:
            text = "Не расслышала. Для кого запланировать?"
        else:
            person = command.strip().capitalize()
            _session_state[session_id] = {"step": "cal_awaiting_title", "person": person}
            text = f"Хорошо, для {person}. Что за дело?"

    elif state and state["step"] == "cal_awaiting_title":
        if not command:
            text = "Не расслышала. Какое дело?"
        else:
            _session_state[session_id] = {**state, "step": "cal_awaiting_datetime", "title": command}
            text = "Когда? Скажите дату, например: «завтра», «в пятницу», «15 июля». Время необязательно."

    elif state and state["step"] == "cal_awaiting_datetime":
        date_str = _parse_russian_date(command)
        if not date_str:
            text = "Не поняла дату. Скажите, например: «завтра», «в пятницу» или «15 июля»."
        else:
            start_time, end_time = _parse_time_range(command)
            db.add(CalendarEvent(
                title=state["title"],
                person=state["person"],
                event_date=date_str,
                start_time=start_time,
                end_time=end_time,
            ))
            db.commit()
            _session_state.pop(session_id, None)
            d = datetime.strptime(date_str, "%Y-%m-%d")
            label = f"{d.day} {_MONTH_NAMES[d.month]}"
            time_str = _format_event_time(start_time, end_time)
            text = f"Записала! У {state['person']} {label}{time_str}: {state['title']}."

    elif session.get("new") and not command:
        text = GREETING

    else:
        text = await _handle_command(command, db)
        if text == "__START_CALENDAR__":
            _session_state[session_id] = {"step": "cal_awaiting_person"}
            text = "Для кого запланировать дело?"
        elif text == "__START_REMINDER__":
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
        elif text == "__START_EXPENSE_EDIT__":
            last_exp = db.query(Expense).order_by(Expense.created_at.desc()).first()
            if not last_exp:
                text = "Нет записанных расходов."
            else:
                _session_state[session_id] = {"step": "expense_edit_awaiting_amount", "expense_id": last_exp.id, "old_amount": last_exp.amount}
                text = f"Последний расход: {last_exp.amount} рублей на «{last_exp.category}». Какая новая сумма?"
        elif text == "__START_DEPOSIT_EDIT__":
            last_dep = db.query(Saving).order_by(Saving.created_at.desc()).first()
            if not last_dep:
                text = "Нет записанных взносов в копилку."
            else:
                _session_state[session_id] = {"step": "deposit_edit_awaiting_amount", "deposit_id": last_dep.id, "old_amount": last_dep.amount}
                text = f"Последний взнос: {last_dep.amount} рублей. Какая новая сумма?"

    return {
        "response": _reply(text),
        "session": session,
        "version": body.get("version", "1.0"),
    }
