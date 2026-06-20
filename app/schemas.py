from datetime import datetime
from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, Field

Operator = Literal["eq", "ne", "gt", "gte", "lt", "lte"]


class Rule(BaseModel):
    device_id: str
    capability_type: str
    instance: str
    operator: Operator = "eq"
    value: Any


class ScheduleTrigger(BaseModel):
    kind: Literal["schedule"] = "schedule"
    cron: str


class DeviceStateTrigger(BaseModel):
    kind: Literal["device_state"] = "device_state"
    device_id: str
    capability_type: str
    instance: str
    operator: Operator = "eq"
    value: Any


class ManualTrigger(BaseModel):
    kind: Literal["manual"] = "manual"


Trigger = Annotated[
    Union[ScheduleTrigger, DeviceStateTrigger, ManualTrigger],
    Field(discriminator="kind"),
]


class ActionItem(BaseModel):
    device_id: str
    type: str
    instance: str
    value: Any


class ScenarioBase(BaseModel):
    name: str
    enabled: bool = True
    trigger: Trigger
    conditions: list[Rule] = []
    actions: list[ActionItem]


class ScenarioCreate(ScenarioBase):
    pass


class ScenarioUpdate(ScenarioBase):
    pass


class ScenarioOut(ScenarioBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScenarioRunOut(BaseModel):
    id: int
    scenario_id: int
    triggered_at: datetime
    trigger_kind: str
    status: str
    detail: Any

    class Config:
        from_attributes = True


class DeviceStateEventOut(BaseModel):
    id: int
    device_id: str
    device_name: str | None
    capability_type: str
    instance: str
    value: Any
    recorded_at: datetime

    class Config:
        from_attributes = True
