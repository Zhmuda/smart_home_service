from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import Saving, SavingGoal, User

router = APIRouter(prefix="/savings", tags=["savings"])


class GoalCreate(BaseModel):
    name: str
    target: Optional[int] = None
    owner: str = "Общее"


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target: Optional[int] = None


class DepositCreate(BaseModel):
    amount: int
    note: Optional[str] = None


class DepositUpdate(BaseModel):
    amount: Optional[int] = None
    note: Optional[str] = None


class DepositOut(BaseModel):
    id: int
    amount: int
    note: Optional[str]
    owner: str
    created_at: datetime

    class Config:
        from_attributes = True


class GoalOut(BaseModel):
    id: int
    name: str
    target: Optional[int]
    owner: str
    total: int
    deposits: list[DepositOut]


@router.get("", response_model=list[GoalOut])
def list_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goals = db.query(SavingGoal).filter(SavingGoal.user_id == current_user.id).order_by(SavingGoal.id).all()
    result = []
    for g in goals:
        deposits = db.query(Saving).filter(Saving.goal_id == g.id).order_by(Saving.created_at.desc()).all()
        total = sum(d.amount for d in deposits)
        result.append(GoalOut(id=g.id, name=g.name, target=g.target, owner=g.owner, total=total, deposits=deposits))
    return result


@router.post("/goals", response_model=GoalOut, status_code=201)
def create_goal(
    body: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = SavingGoal(name=body.name.strip(), target=body.target, owner=body.owner, user_id=current_user.id)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return GoalOut(id=goal.id, name=goal.name, target=goal.target, owner=goal.owner, total=0, deposits=[])


@router.put("/goals/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: int,
    body: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(SavingGoal).filter(SavingGoal.id == goal_id, SavingGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(404)
    if body.name is not None:
        goal.name = body.name.strip()
    if body.target is not None:
        goal.target = body.target
    db.commit()
    deposits = db.query(Saving).filter(Saving.goal_id == goal_id).order_by(Saving.created_at.desc()).all()
    total = sum(d.amount for d in deposits)
    return GoalOut(id=goal.id, name=goal.name, target=goal.target, owner=goal.owner, total=total, deposits=deposits)


@router.delete("/goals/{goal_id}", status_code=204)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(SavingGoal).filter(SavingGoal.id == goal_id, SavingGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(404)
    db.query(Saving).filter(Saving.goal_id == goal_id).delete()
    db.delete(goal)
    db.commit()


@router.post("/goals/{goal_id}/deposits", response_model=DepositOut, status_code=201)
def add_deposit(
    goal_id: int,
    body: DepositCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(SavingGoal).filter(SavingGoal.id == goal_id, SavingGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(404)
    dep = Saving(amount=body.amount, note=body.note, owner=goal.owner, goal_id=goal_id, user_id=current_user.id)
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep


@router.patch("/deposits/{dep_id}", response_model=DepositOut)
def update_deposit(
    dep_id: int,
    body: DepositUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dep = db.query(Saving).filter(Saving.id == dep_id, Saving.user_id == current_user.id).first()
    if not dep:
        raise HTTPException(404)
    if body.amount is not None:
        dep.amount = body.amount
    if body.note is not None:
        dep.note = body.note or None
    db.commit()
    db.refresh(dep)
    return dep


@router.delete("/deposits/{dep_id}", status_code=204)
def delete_deposit(
    dep_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dep = db.query(Saving).filter(Saving.id == dep_id, Saving.user_id == current_user.id).first()
    if not dep:
        raise HTTPException(404)
    db.delete(dep)
    db.commit()


@router.get("/legacy-total")
def legacy_total(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goals = db.query(SavingGoal).filter(SavingGoal.user_id == current_user.id).order_by(SavingGoal.id).all()
    if not goals:
        return {"goal_name": "Копилка", "target": None, "total": 0, "goal_id": None}
    g = goals[0]
    deposits = db.query(Saving).filter(Saving.goal_id == g.id).all()
    return {"goal_name": g.name, "target": g.target, "total": sum(d.amount for d in deposits), "goal_id": g.id}
