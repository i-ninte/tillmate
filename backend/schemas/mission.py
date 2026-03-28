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


class HomeLocation(BaseModel):
    """Schema for home location coordinates."""

    lat: float
    lon: float


class FieldPlanCreate(BaseModel):
    """Schema for creating a field plan."""

    machine_id: int | None = None
    name: str
    notes: str | None = None
    return_to_home: bool = True
    home_location: HomeLocation | None = None
    work_points: list[WorkPointBase]


class FieldPlanResponse(BaseModel):
    """Schema for field plan response."""

    id: int
    machine_id: int | None
    name: str
    notes: str | None
    return_to_home: bool
    home_lat: float | None
    home_lon: float | None
    created_at: datetime
    updated_at: datetime
    work_points: list[WorkPointResponse]

    model_config = {"from_attributes": True}


class FieldPlanSummary(BaseModel):
    """Schema for field plan summary (list view)."""

    id: int
    machine_id: int | None
    name: str
    notes: str | None
    return_to_home: bool
    point_count: int
    created_at: datetime

    model_config = {"from_attributes": True}
