from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import DeviceStateEvent, Scenario, ScenarioRun
from app.schemas import DeviceStateEventOut, ScenarioRunOut

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/summary")
def scenario_summary(db: Session = Depends(get_db)):
    rows = (
        db.query(
            ScenarioRun.scenario_id,
            Scenario.name,
            func.count(ScenarioRun.id).label("total"),
            func.sum(case((ScenarioRun.status == "ok", 1), else_=0)).label("ok"),
            func.sum(case((ScenarioRun.status == "error", 1), else_=0)).label("error"),
            func.max(ScenarioRun.triggered_at).label("last_run_at"),
        )
        .join(Scenario, Scenario.id == ScenarioRun.scenario_id)
        .group_by(ScenarioRun.scenario_id, Scenario.name)
        .all()
    )
    return [
        {
            "scenario_id": r.scenario_id,
            "name": r.name,
            "total": r.total,
            "ok": r.ok,
            "error": r.error,
            "success_rate": round(r.ok / r.total * 100) if r.total else 0,
            "last_run_at": r.last_run_at,
        }
        for r in rows
    ]


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
