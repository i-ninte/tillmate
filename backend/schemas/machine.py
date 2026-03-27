from datetime import datetime
from pydantic import BaseModel


class MachineCreate(BaseModel):
    """Schema for creating a new machine."""

    serial_number: str
    display_name: str
    wifi_ssid: str
    actuator_min_mm: float = 0.0
    actuator_max_mm: float = 200.0
    actuator_pwm_min: int = 1000
    actuator_pwm_max: int = 2000
    battery_warn_v: float = 44.0
    battery_critical_v: float = 42.0


class MachineUpdate(BaseModel):
    """Schema for updating a machine."""

    display_name: str | None = None
    wifi_ssid: str | None = None
    actuator_min_mm: float | None = None
    actuator_max_mm: float | None = None
    actuator_pwm_min: int | None = None
    actuator_pwm_max: int | None = None
    battery_warn_v: float | None = None
    battery_critical_v: float | None = None


class MachineResponse(BaseModel):
    """Schema for machine response."""

    id: int
    serial_number: str
    display_name: str
    wifi_ssid: str
    actuator_min_mm: float
    actuator_max_mm: float
    actuator_pwm_min: int
    actuator_pwm_max: int
    battery_warn_v: float
    battery_critical_v: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
