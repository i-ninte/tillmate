from datetime import datetime
from pydantic import BaseModel


class CommandLogCreate(BaseModel):
    """Schema for creating command log entries."""

    machine_id: int
    session_id: str
    sent_at: datetime
    command_id: int
    command_name: str
    param1: float | None = None
    param2: float | None = None
    source: str  # 'realtime' | 'mission'


class CommandLogResponse(BaseModel):
    """Schema for command log response."""

    id: int
    machine_id: int
    session_id: str
    sent_at: datetime
    command_id: int
    command_name: str
    param1: float | None
    param2: float | None
    source: str

    model_config = {"from_attributes": True}
