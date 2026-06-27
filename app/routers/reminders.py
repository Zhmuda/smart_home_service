from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Reminder

router = APIRouter(prefix="/reminders", tags=["reminders"])


class ReminderCreate(BaseModel):
    subject: str
    remind_at: datetime


class ReminderOut(BaseModel):
    id: int
    subject: str
    remind_at: datetime
    sent: bool
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[ReminderOut])
def list_reminders(db: Session = Depends(get_db)):
    return db.query(Reminder).order_by(Reminder.remind_at).all()


@router.post("", response_model=ReminderOut)
def create_reminder(body: ReminderCreate, db: Session = Depends(get_db)):
    reminder = Reminder(subject=body.subject, remind_at=body.remind_at)
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.delete("/{reminder_id}")
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    reminder = db.get(Reminder, reminder_id)
    if reminder:
        db.delete(reminder)
        db.commit()
    return {"ok": True}
