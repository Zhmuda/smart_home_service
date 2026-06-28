from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import Reminder, User

router = APIRouter(prefix="/reminders", tags=["reminders"])

REPEAT_OPTIONS = ("daily", "weekly", "monthly", "yearly")


class ReminderCreate(BaseModel):
    subject: str
    remind_at: datetime
    repeat: Optional[str] = None


class ReminderUpdate(BaseModel):
    subject: Optional[str] = None
    remind_at: Optional[datetime] = None
    repeat: Optional[str] = None


class ReminderOut(BaseModel):
    id: int
    subject: str
    remind_at: datetime
    sent: bool
    repeat: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[ReminderOut])
def list_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Reminder).filter(Reminder.user_id == current_user.id).order_by(Reminder.remind_at).all()


@router.post("", response_model=ReminderOut)
def create_reminder(
    body: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repeat = body.repeat if body.repeat in REPEAT_OPTIONS else None
    reminder = Reminder(subject=body.subject, remind_at=body.remind_at, repeat=repeat, user_id=current_user.id)
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.patch("/{reminder_id}", response_model=ReminderOut)
def update_reminder(
    reminder_id: int,
    body: ReminderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Not found")
    if body.subject is not None:
        reminder.subject = body.subject
    if body.remind_at is not None:
        reminder.remind_at = body.remind_at
        reminder.sent = False
    if body.repeat is not None:
        reminder.repeat = body.repeat if body.repeat in REPEAT_OPTIONS else None
    db.commit()
    db.refresh(reminder)
    return reminder


@router.delete("/{reminder_id}")
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if reminder:
        db.delete(reminder)
        db.commit()
    return {"ok": True}
