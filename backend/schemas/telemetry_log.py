from datetime import datetime
from pydantic import BaseModel


class TelemetryLogCreate(BaseModel):
    """Schema for creating telemetry log entries (batch insert)."""

    machine_id: int
    session_id: str
    recorded_at: datetime

    battery_voltage_v: float | None = None
    battery_pct: int | None = None
    gps_fixed: bool | None = None
    lat: float | None = None
    lon: float | None = None
    satellites: int | None = None
    speed_kmh: float | None = None
    heading_deg: float | None = None
    pixhawk_temp_c: float | None = None
    machine_temp_c: float | None = None
    implement_depth_cm: float | None = None
    estop_active: bool | None = None
    mode: str | None = None
    headlights_on: bool | None = None


class TelemetryLogResponse(BaseModel):
    """Schema for telemetry log response."""

    id: int
    machine_id: int
    session_id: str
    recorded_at: datetime

    battery_voltage_v: float | None
    battery_pct: int | None
    gps_fixed: bool | None
    lat: float | None
    lon: float | None
    satellites: int | None
    speed_kmh: float | None
    heading_deg: float | None
    pixhawk_temp_c: float | None
    machine_temp_c: float | None
    implement_depth_cm: float | None
    estop_active: bool | None
    mode: str | None
    headlights_on: bool | None

    model_config = {"from_attributes": True}
