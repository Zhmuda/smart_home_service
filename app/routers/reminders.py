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


class ReminderUpdate(BaseModel):
    subject: str | None = None
    remind_at: datetime | None = None


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


@router.patch("/{reminder_id}", response_model=ReminderOut)
def update_reminder(reminder_id: int, body: ReminderUpdate, db: Session = Depends(get_db)):
    reminder = db.get(Reminder, reminder_id)
    if not reminder:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not found")
    if body.subject is not None:
        reminder.subject = body.subject
    if body.remind_at is not None:
        reminder.remind_at = body.remind_at
        reminder.sent = False
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
