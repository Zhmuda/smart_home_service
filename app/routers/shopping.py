from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import ShoppingItem, User

router = APIRouter(prefix="/shopping", tags=["shopping"])


class ShoppingItemCreate(BaseModel):
    name: str
    owner: str = "Общее"


class ShoppingItemUpdate(BaseModel):
    name: str


class ShoppingItemOut(BaseModel):
    id: int
    name: str
    bought: bool
    owner: str

    class Config:
        from_attributes = True


@router.get("", response_model=list[ShoppingItemOut])
def list_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(ShoppingItem)
        .filter(ShoppingItem.user_id == current_user.id)
        .order_by(ShoppingItem.bought, ShoppingItem.created_at)
        .all()
    )


@router.post("", response_model=ShoppingItemOut, status_code=201)
def add_item(
    body: ShoppingItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = ShoppingItem(name=body.name.strip(), owner=body.owner, user_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=ShoppingItemOut)
def update_item(
    item_id: int,
    body: ShoppingItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ShoppingItem).filter(ShoppingItem.id == item_id, ShoppingItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(404)
    item.name = body.name.strip()
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}/buy", response_model=ShoppingItemOut)
def mark_bought(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ShoppingItem).filter(ShoppingItem.id == item_id, ShoppingItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(404)
    item.bought = not item.bought
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ShoppingItem).filter(ShoppingItem.id == item_id, ShoppingItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(404)
    db.delete(item)
    db.commit()


@router.delete("/bought/clear", status_code=204)
def clear_bought(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(ShoppingItem).filter(
        ShoppingItem.user_id == current_user.id,
        ShoppingItem.bought.is_(True),
    ).delete()
    db.commit()
