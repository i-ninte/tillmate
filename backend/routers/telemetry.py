from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas import (
    TelemetryLogCreate,
    TelemetryLogResponse,
    CommandLogCreate,
    CommandLogResponse,
)
from services import TelemetryService

router = APIRouter()


@router.post("/logs", status_code=201)
async def append_telemetry_logs(
    payload: list[TelemetryLogCreate],
    db: AsyncSession = Depends(get_db),
):
    """Batch insert telemetry readings (called periodically from the app)."""
    service = TelemetryService(db)
    count = await service.bulk_insert_telemetry(payload)
    return {"inserted": count}


@router.get("/logs", response_model=list[TelemetryLogResponse])
async def get_telemetry_logs(
    machine_id: int,
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get telemetry logs for a specific session."""
    service = TelemetryService(db)
    return await service.get_session_telemetry(machine_id, session_id)


@router.post("/commands", status_code=201)
async def append_command_logs(
    payload: list[CommandLogCreate],
    db: AsyncSession = Depends(get_db),
):
    """Batch insert command logs."""
    service = TelemetryService(db)
    count = await service.bulk_insert_commands(payload)
    return {"inserted": count}


@router.get("/commands", response_model=list[CommandLogResponse])
async def get_command_logs(
    machine_id: int,
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get command logs for a specific session."""
    service = TelemetryService(db)
    return await service.get_session_commands(machine_id, session_id)
