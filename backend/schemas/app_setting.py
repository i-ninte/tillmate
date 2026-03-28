from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AppSettingResponse(BaseModel):
    key: str
    value: str
    updated_at: datetime

    class Config:
        from_attributes = True


class AppSettingUpdate(BaseModel):
    value: str


class AppSettingsResponse(BaseModel):
    """Response containing all app settings as a dictionary."""
    settings: dict[str, str]
