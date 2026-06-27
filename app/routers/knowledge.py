from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import KnowledgeEntry

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

CATEGORIES = (
    "Разное",
    "Пароли",
    "Размеры",
    "Медицина",
    "Контакты",
    "Локации",
    "Техника",
    "Экстренное",
)


class EntryCreate(BaseModel):
    title: str
    content: str
    category: str = "Разное"
    tags: list[str] = []


class EntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None


class EntryOut(BaseModel):
    id: int
    title: str
    content: str
    category: str
    tags: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[EntryOut])
def list_entries(
    category: Optional[str] = None,
    tag: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(KnowledgeEntry)
    if category:
        query = query.filter(KnowledgeEntry.category == category)
    entries = query.order_by(KnowledgeEntry.updated_at.desc()).all()
    if tag:
        entries = [e for e in entries if tag in (e.tags or [])]
    if q:
        ql = q.lower()
        entries = [e for e in entries if ql in e.title.lower() or ql in e.content.lower()]
    return entries


@router.post("", response_model=EntryOut)
def create_entry(body: EntryCreate, db: Session = Depends(get_db)):
    category = body.category if body.category in CATEGORIES else "Разное"
    entry = KnowledgeEntry(
        title=body.title.strip(),
        content=body.content.strip(),
        category=category,
        tags=body.tags,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/{entry_id}", response_model=EntryOut)
def update_entry(entry_id: int, body: EntryUpdate, db: Session = Depends(get_db)):
    entry = db.get(KnowledgeEntry, entry_id)
    if not entry:
        raise HTTPException(404)
    if body.title is not None:
        entry.title = body.title.strip()
    if body.content is not None:
        entry.content = body.content.strip()
    if body.category is not None:
        entry.category = body.category if body.category in CATEGORIES else entry.category
    if body.tags is not None:
        entry.tags = body.tags
    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.get(KnowledgeEntry, entry_id)
    if entry:
        db.delete(entry)
        db.commit()
    return {"ok": True}
