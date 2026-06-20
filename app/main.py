from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import Base, engine
from app.routers import devices, scenarios, stats
from app.scenario_engine import start_engine, stop_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_engine()
    yield
    stop_engine()


app = FastAPI(title="Smart Home Service", lifespan=lifespan)
app.include_router(devices.router)
app.include_router(scenarios.router)
app.include_router(stats.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
