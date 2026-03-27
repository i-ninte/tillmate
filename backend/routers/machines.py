from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas import MachineCreate, MachineUpdate, MachineResponse
from services import MachineService

router = APIRouter()


@router.post("/", response_model=MachineResponse, status_code=201)
async def register_machine(
    payload: MachineCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a new machine."""
    service = MachineService(db)

    # Check if serial number already exists
    existing = await service.get_by_serial(payload.serial_number)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Machine with serial number '{payload.serial_number}' already exists",
        )

    return await service.create(payload)


@router.get("/", response_model=list[MachineResponse])
async def list_machines(
    db: AsyncSession = Depends(get_db),
):
    """List all registered machines."""
    service = MachineService(db)
    return await service.list_all()


@router.get("/{machine_id}", response_model=MachineResponse)
async def get_machine(
    machine_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a machine by ID."""
    service = MachineService(db)
    machine = await service.get(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine


@router.patch("/{machine_id}", response_model=MachineResponse)
async def update_machine(
    machine_id: int,
    payload: MachineUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a machine."""
    service = MachineService(db)
    machine = await service.update(machine_id, payload)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine


@router.delete("/{machine_id}", status_code=204)
async def delete_machine(
    machine_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a machine."""
    service = MachineService(db)
    deleted = await service.delete(machine_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Machine not found")
