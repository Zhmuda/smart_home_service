from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine
from app.models import Scenario
from app.routers import alice, devices, scenarios, stats
from app.scenario_engine import engine_status, start_engine, stop_engine
from app.ws import manager


def _migrate_condition_groups(db: Session) -> None:
    """Old scenarios stored `conditions` as a flat list of Rule dicts.
    Wrap each into its own {"rules": [rule]} group so they keep their original
    AND-only behavior under the new group-based (AND-of-OR) schema."""
    for scenario in db.query(Scenario).all():
        conditions = scenario.conditions or []
        if any("rules" not in item for item in conditions):
            scenario.conditions = [item if "rules" in item else {"rules": [item]} for item in conditions]
    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _migrate_condition_groups(db)
    finally:
        db.close()
    start_engine()
    yield
    stop_engine()


app = FastAPI(title="Smart Home Service", lifespan=lifespan)
app.include_router(devices.router)
app.include_router(scenarios.router)
app.include_router(stats.router)
app.include_router(alice.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/status")
async def status():
    return engine_status


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
