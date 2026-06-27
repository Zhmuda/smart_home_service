from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ShoppingItem

router = APIRouter(prefix="/shopping", tags=["shopping"])


class ShoppingItemCreate(BaseModel):
    name: str
    owner: str = "Общее"


class ShoppingItemOut(BaseModel):
    id: int
    name: str
    bought: bool
    owner: str

    class Config:
        from_attributes = True


@router.get("", response_model=list[ShoppingItemOut])
def list_items(db: Session = Depends(get_db)):
    return db.query(ShoppingItem).order_by(ShoppingItem.bought, ShoppingItem.created_at).all()


@router.post("", response_model=ShoppingItemOut, status_code=201)
def add_item(body: ShoppingItemCreate, db: Session = Depends(get_db)):
    item = ShoppingItem(name=body.name.strip(), owner=body.owner)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}/buy", response_model=ShoppingItemOut)
def mark_bought(item_id: int, db: Session = Depends(get_db)):
    item = db.get(ShoppingItem, item_id)
    if not item:
        raise HTTPException(404)
    item.bought = not item.bought
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(ShoppingItem, item_id)
    if not item:
        raise HTTPException(404)
    db.delete(item)
    db.commit()


@router.delete("/bought/clear", status_code=204)
def clear_bought(db: Session = Depends(get_db)):
    db.query(ShoppingItem).filter(ShoppingItem.bought.is_(True)).delete()
    db.commit()
