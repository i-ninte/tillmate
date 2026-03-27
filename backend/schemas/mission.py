from datetime import datetime
from pydantic import BaseModel


class WorkPointBase(BaseModel):
    """Base schema for work points."""

    seq: int
    lat: float
    lon: float
    implement_lowered: bool = False
    tiller_on: bool = False
    pump_on: bool = False
    label: str = "Work Point"


class WorkPointResponse(WorkPointBase):
    """Schema for work point response."""

    id: int

    model_config = {"from_attributes": True}


class FieldPlanCreate(BaseModel):
    """Schema for creating a field plan."""

    machine_id: int
    name: str
    notes: str | None = None
    work_points: list[WorkPointBase]


class FieldPlanResponse(BaseModel):
    """Schema for field plan response."""

    id: int
    machine_id: int
    name: str
    notes: str | None
    created_at: datetime
    updated_at: datetime
    work_points: list[WorkPointResponse]

    model_config = {"from_attributes": True}


class FieldPlanSummary(BaseModel):
    """Schema for field plan summary (list view)."""

    id: int
    machine_id: int
    name: str
    notes: str | None
    point_count: int
    created_at: datetime

    model_config = {"from_attributes": True}
