from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String

from app.db import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    trigger = Column(JSON, nullable=False)
    conditions = Column(JSON, default=list, nullable=False)
    actions = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ScenarioRun(Base):
    __tablename__ = "scenario_runs"

    id = Column(Integer, primary_key=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=False, index=True)
    triggered_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    trigger_kind = Column(String, nullable=False)
    status = Column(String, nullable=False)
    detail = Column(JSON, nullable=True)


class DeviceStateEvent(Base):
    __tablename__ = "device_state_events"

    id = Column(Integer, primary_key=True)
    device_id = Column(String, nullable=False, index=True)
    device_name = Column(String, nullable=True)
    capability_type = Column(String, nullable=False)
    instance = Column(String, nullable=False)
    value = Column(JSON, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True)
    subject = Column(String, nullable=False)
    remind_at = Column(DateTime, nullable=False, index=True)
    sent = Column(Boolean, default=False, nullable=False)
    repeat = Column(String, nullable=True)  # daily | weekly | monthly | yearly | None
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ShoppingItem(Base):
    __tablename__ = "shopping_items"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    bought = Column(Boolean, default=False, nullable=False)
    owner = Column(String, nullable=False, default="Общее")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True)
    amount = Column(Integer, nullable=False)
    category = Column(String, nullable=False)
    note = Column(String, nullable=True)
    owner = Column(String, nullable=False, default="Общее")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class SavingGoal(Base):
    __tablename__ = "saving_goals"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, default="Копилка")
    target = Column(Integer, nullable=True)
    owner = Column(String, nullable=False, default="Общее")


class Saving(Base):
    __tablename__ = "savings"

    id = Column(Integer, primary_key=True)
    amount = Column(Integer, nullable=False)
    note = Column(String, nullable=True)
    owner = Column(String, nullable=False, default="Общее")
    goal_id = Column(Integer, ForeignKey("saving_goals.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class KnowledgeEntry(Base):
    __tablename__ = "knowledge"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    category = Column(String, nullable=False, default="Разное")
    tags = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    person = Column(String, nullable=False)
    event_date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    start_time = Column(String, nullable=True)               # HH:MM
    end_time = Column(String, nullable=True)                 # HH:MM
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
