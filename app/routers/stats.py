from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import DeviceStateEvent, ScenarioRun
from app.schemas import DeviceStateEventOut, ScenarioRunOut

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/devices/{device_id}/history", response_model=list[DeviceStateEventOut])
def device_history(
    device_id: str,
    capability_type: str | None = None,
    instance: str | None = None,
    since: datetime | None = None,
    limit: int = Query(500, le=5000),
    db: Session = Depends(get_db),
):
    q = db.query(DeviceStateEvent).filter(DeviceStateEvent.device_id == device_id)
    if capability_type:
        q = q.filter(DeviceStateEvent.capability_type == capability_type)
    if instance:
        q = q.filter(DeviceStateEvent.instance == instance)
    if since:
        q = q.filter(DeviceStateEvent.recorded_at >= since)
    return q.order_by(DeviceStateEvent.recorded_at.asc()).limit(limit).all()


@router.get("/runs", response_model=list[ScenarioRunOut])
def runs_history(
    scenario_id: int | None = None,
    status: str | None = None,
    limit: int = Query(100, le=2000),
    db: Session = Depends(get_db),
):
    q = db.query(ScenarioRun)
    if scenario_id is not None:
        q = q.filter(ScenarioRun.scenario_id == scenario_id)
    if status:
        q = q.filter(ScenarioRun.status == status)
    return q.order_by(ScenarioRun.triggered_at.desc()).limit(limit).all()
