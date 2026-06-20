from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Scenario, ScenarioRun
from app.scenario_engine import run_scenario, sync_schedule_jobs
from app.schemas import ScenarioCreate, ScenarioOut, ScenarioRunOut, ScenarioUpdate

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


def _get_scenario(db: Session, scenario_id: int) -> Scenario:
    scenario = db.get(Scenario, scenario_id)
    if not scenario:
        raise HTTPException(404, "Scenario not found")
    return scenario


@router.get("", response_model=list[ScenarioOut])
def list_scenarios(db: Session = Depends(get_db)):
    return db.query(Scenario).order_by(Scenario.id).all()


@router.post("", response_model=ScenarioOut)
def create_scenario(body: ScenarioCreate, db: Session = Depends(get_db)):
    scenario = Scenario(
        name=body.name,
        enabled=body.enabled,
        trigger=body.trigger.model_dump(),
        conditions=[c.model_dump() for c in body.conditions],
        actions=[a.model_dump() for a in body.actions],
    )
    db.add(scenario)
    db.commit()
    sync_schedule_jobs(db)
    return scenario


@router.get("/{scenario_id}", response_model=ScenarioOut)
def get_scenario(scenario_id: int, db: Session = Depends(get_db)):
    return _get_scenario(db, scenario_id)


@router.put("/{scenario_id}", response_model=ScenarioOut)
def update_scenario(scenario_id: int, body: ScenarioUpdate, db: Session = Depends(get_db)):
    scenario = _get_scenario(db, scenario_id)
    scenario.name = body.name
    scenario.enabled = body.enabled
    scenario.trigger = body.trigger.model_dump()
    scenario.conditions = [c.model_dump() for c in body.conditions]
    scenario.actions = [a.model_dump() for a in body.actions]
    db.commit()
    sync_schedule_jobs(db)
    return scenario


@router.delete("/{scenario_id}")
def delete_scenario(scenario_id: int, db: Session = Depends(get_db)):
    scenario = _get_scenario(db, scenario_id)
    db.query(ScenarioRun).filter(ScenarioRun.scenario_id == scenario_id).delete()
    db.delete(scenario)
    db.commit()
    sync_schedule_jobs(db)
    return {"status": "ok"}


@router.post("/{scenario_id}/run", response_model=ScenarioRunOut)
async def run_scenario_now(scenario_id: int, db: Session = Depends(get_db)):
    scenario = _get_scenario(db, scenario_id)
    return await run_scenario(db, scenario, "manual")


@router.get("/{scenario_id}/runs", response_model=list[ScenarioRunOut])
def list_runs(scenario_id: int, limit: int = 50, db: Session = Depends(get_db)):
    _get_scenario(db, scenario_id)
    return (
        db.query(ScenarioRun)
        .filter(ScenarioRun.scenario_id == scenario_id)
        .order_by(ScenarioRun.triggered_at.desc())
        .limit(limit)
        .all()
    )
