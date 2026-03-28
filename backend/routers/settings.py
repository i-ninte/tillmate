from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import AppSetting
from schemas import AppSettingResponse, AppSettingUpdate, AppSettingsResponse

router = APIRouter()

# Default settings with their initial values
DEFAULT_SETTINGS = {
    "simulation_mode": "1",  # 1 = simulation enabled, 0 = real connection
}


@router.get("/", response_model=AppSettingsResponse)
async def get_all_settings(
    db: AsyncSession = Depends(get_db),
):
    """Get all app settings as a dictionary."""
    result = await db.execute(select(AppSetting))
    settings = {s.key: s.value for s in result.scalars().all()}

    # Merge with defaults for any missing keys
    for key, default_value in DEFAULT_SETTINGS.items():
        if key not in settings:
            settings[key] = default_value

    return AppSettingsResponse(settings=settings)


@router.get("/{key}", response_model=AppSettingResponse)
async def get_setting(
    key: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific setting by key."""
    result = await db.execute(select(AppSetting).where(AppSetting.key == key))
    setting = result.scalar_one_or_none()

    if not setting:
        # Return default if exists
        if key in DEFAULT_SETTINGS:
            # Create the default setting in DB
            setting = AppSetting(key=key, value=DEFAULT_SETTINGS[key])
            db.add(setting)
            await db.commit()
            await db.refresh(setting)
            return setting
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    return setting


@router.put("/{key}", response_model=AppSettingResponse)
async def update_setting(
    key: str,
    payload: AppSettingUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update or create a setting."""
    result = await db.execute(select(AppSetting).where(AppSetting.key == key))
    setting = result.scalar_one_or_none()

    if setting:
        setting.value = payload.value
    else:
        setting = AppSetting(key=key, value=payload.value)
        db.add(setting)

    await db.commit()
    await db.refresh(setting)
    return setting
