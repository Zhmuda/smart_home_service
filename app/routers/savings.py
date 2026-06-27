from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Saving, SavingGoal

router = APIRouter(prefix="/savings", tags=["savings"])


class SavingCreate(BaseModel):
    amount: int
    note: Optional[str] = None


class GoalUpdate(BaseModel):
    name: str
    target: Optional[int] = None


class SavingOut(BaseModel):
    id: int
    amount: int
    note: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class GoalOut(BaseModel):
    name: str
    target: Optional[int]

    class Config:
        from_attributes = True


class SavingsOverview(BaseModel):
    total: int
    goal: Optional[GoalOut]
    items: list[SavingOut]


@router.get("", response_model=SavingsOverview)
def get_overview(db: Session = Depends(get_db)):
    items = db.query(Saving).order_by(Saving.created_at.desc()).all()
    total = sum(s.amount for s in items)
    goal = db.query(SavingGoal).first()
    return {"total": total, "goal": goal, "items": items}


@router.post("", response_model=SavingOut, status_code=201)
def add_saving(body: SavingCreate, db: Session = Depends(get_db)):
    saving = Saving(amount=body.amount, note=body.note)
    db.add(saving)
    db.commit()
    db.refresh(saving)
    return saving


@router.delete("/{saving_id}", status_code=204)
def delete_saving(saving_id: int, db: Session = Depends(get_db)):
    saving = db.get(Saving, saving_id)
    if not saving:
        raise HTTPException(404)
    db.delete(saving)
    db.commit()


@router.put("/goal", response_model=GoalOut)
def set_goal(body: GoalUpdate, db: Session = Depends(get_db)):
    goal = db.query(SavingGoal).first()
    if goal:
        goal.name = body.name
        goal.target = body.target
    else:
        goal = SavingGoal(name=body.name, target=body.target)
        db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal
