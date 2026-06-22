from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.scenario_engine import annotate_device_states
from app.yandex_client import client

router = APIRouter(prefix="/devices", tags=["devices"])


class CapabilityState(BaseModel):
    instance: str
    value: Any


class Action(BaseModel):
    type: str
    state: CapabilityState


class ActionsRequest(BaseModel):
    actions: list[Action]


@router.get("")
async def list_devices():
    user_info = await client.get_user_info()
    return annotate_device_states(user_info)


@router.get("/{device_id}")
async def get_device(device_id: str):
    return await client.get_device(device_id)


@router.post("/{device_id}/actions")
async def send_actions(device_id: str, body: ActionsRequest):
    actions = [a.model_dump() for a in body.actions]
    return await client.send_actions(device_id, actions)
