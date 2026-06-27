from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Expense

router = APIRouter(prefix="/expenses", tags=["expenses"])


class ExpenseCreate(BaseModel):
    amount: int
    category: str
    note: Optional[str] = None


class ExpenseOut(BaseModel):
    id: int
    amount: int
    category: str
    note: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CategorySummary(BaseModel):
    category: str
    total: int


@router.get("", response_model=list[ExpenseOut])
def list_expenses(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(Expense).order_by(Expense.created_at.desc()).limit(limit).all()


@router.get("/summary", response_model=list[CategorySummary])
def monthly_summary(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    rows = (
        db.query(Expense.category, func.sum(Expense.amount).label("total"))
        .filter(
            extract("year", Expense.created_at) == now.year,
            extract("month", Expense.created_at) == now.month,
        )
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
        .all()
    )
    return [{"category": r.category, "total": r.total} for r in rows]


@router.post("", response_model=ExpenseOut, status_code=201)
def add_expense(body: ExpenseCreate, db: Session = Depends(get_db)):
    expense = Expense(amount=body.amount, category=body.category.strip(), note=body.note)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(404)
    db.delete(expense)
    db.commit()
