from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import CalendarEvent, User

router = APIRouter(prefix="/calendar", tags=["calendar"])


class EventCreate(BaseModel):
    title: str
    person: str
    event_date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class EventOut(BaseModel):
    id: int
    title: str
    person: str
    event_date: str
    start_time: Optional[str]
    end_time: Optional[str]

    class Config:
        from_attributes = True


@router.get("", response_model=list[EventOut])
def list_events(
    month: Optional[str] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(CalendarEvent).filter(CalendarEvent.user_id == current_user.id)
    if date:
        q = q.filter(CalendarEvent.event_date == date)
    elif month:
        q = q.filter(CalendarEvent.event_date.startswith(month))
    return q.order_by(CalendarEvent.event_date, CalendarEvent.start_time).all()


@router.post("", response_model=EventOut, status_code=201)
def create_event(
    body: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ev = CalendarEvent(
        title=body.title.strip(),
        person=body.person.strip(),
        event_date=body.event_date,
        start_time=body.start_time,
        end_time=body.end_time,
        user_id=current_user.id,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ev = db.query(CalendarEvent).filter(CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id).first()
    if not ev:
        raise HTTPException(404)
    db.delete(ev)
    db.commit()
