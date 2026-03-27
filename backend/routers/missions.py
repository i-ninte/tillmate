from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas import FieldPlanCreate, FieldPlanResponse, FieldPlanSummary
from services import MissionService

router = APIRouter()


@router.post("/", response_model=FieldPlanResponse, status_code=201)
async def create_mission(
    payload: FieldPlanCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new field plan."""
    service = MissionService(db)
    return await service.create(payload)


@router.get("/", response_model=list[FieldPlanResponse])
async def list_missions(
    machine_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all field plans, optionally filtered by machine."""
    service = MissionService(db)
    return await service.list_all(machine_id=machine_id)


@router.get("/summaries", response_model=list[FieldPlanSummary])
async def list_mission_summaries(
    machine_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List field plan summaries with point counts."""
    service = MissionService(db)
    summaries = await service.list_summaries(machine_id=machine_id)
    return summaries


@router.get("/{mission_id}", response_model=FieldPlanResponse)
async def get_mission(
    mission_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a field plan by ID."""
    service = MissionService(db)
    plan = await service.get(mission_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Field plan not found")
    return plan


@router.delete("/{mission_id}", status_code=204)
async def delete_mission(
    mission_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a field plan."""
    service = MissionService(db)
    deleted = await service.delete(mission_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Field plan not found")
