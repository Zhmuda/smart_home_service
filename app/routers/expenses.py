from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import Expense, User

router = APIRouter(prefix="/expenses", tags=["expenses"])


class ExpenseCreate(BaseModel):
    amount: int
    category: str
    note: Optional[str] = None
    owner: str = "Общее"


class ExpenseUpdate(BaseModel):
    amount: Optional[int] = None
    category: Optional[str] = None
    note: Optional[str] = None


class ExpenseOut(BaseModel):
    id: int
    amount: int
    category: str
    note: Optional[str]
    owner: str
    created_at: datetime

    class Config:
        from_attributes = True


class CategorySummary(BaseModel):
    category: str
    total: int


class MonthSummary(BaseModel):
    month: str
    total: int


@router.get("", response_model=list[ExpenseOut])
def list_expenses(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Expense)
        .filter(Expense.user_id == current_user.id)
        .order_by(Expense.created_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/summary", response_model=list[CategorySummary])
def monthly_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    rows = (
        db.query(Expense.category, func.sum(Expense.amount).label("total"))
        .filter(
            Expense.user_id == current_user.id,
            extract("year", Expense.created_at) == now.year,
            extract("month", Expense.created_at) == now.month,
        )
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
        .all()
    )
    return [{"category": r.category, "total": r.total} for r in rows]


@router.get("/monthly", response_model=list[MonthSummary])
def monthly_totals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(
            func.strftime("%Y-%m", Expense.created_at).label("month"),
            func.sum(Expense.amount).label("total"),
        )
        .filter(Expense.user_id == current_user.id)
        .group_by("month")
        .order_by("month")
        .all()
    )
    return [{"month": r.month, "total": r.total} for r in rows[-6:]]


@router.post("", response_model=ExpenseOut, status_code=201)
def add_expense(
    body: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = Expense(
        amount=body.amount,
        category=body.category.strip(),
        note=body.note,
        owner=body.owner,
        user_id=current_user.id,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.patch("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    body: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == current_user.id).first()
    if not expense:
        raise HTTPException(404)
    if body.amount is not None:
        expense.amount = body.amount
    if body.category is not None:
        expense.category = body.category.strip()
    if body.note is not None:
        expense.note = body.note or None
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=204)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == current_user.id).first()
    if not expense:
        raise HTTPException(404)
    db.delete(expense)
    db.commit()
