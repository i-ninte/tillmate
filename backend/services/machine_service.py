from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import Machine
from schemas import MachineCreate, MachineUpdate


class MachineService:
    """Service for machine CRUD operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: MachineCreate) -> Machine:
        """Create a new machine."""
        machine = Machine(**data.model_dump())
        self.db.add(machine)
        await self.db.commit()
        await self.db.refresh(machine)
        return machine

    async def get(self, machine_id: int) -> Machine | None:
        """Get a machine by ID."""
        result = await self.db.execute(
            select(Machine).where(Machine.id == machine_id)
        )
        return result.scalar_one_or_none()

    async def get_by_serial(self, serial_number: str) -> Machine | None:
        """Get a machine by serial number."""
        result = await self.db.execute(
            select(Machine).where(Machine.serial_number == serial_number)
        )
        return result.scalar_one_or_none()

    async def list_all(self) -> list[Machine]:
        """List all machines."""
        result = await self.db.execute(
            select(Machine).order_by(Machine.created_at.desc())
        )
        return list(result.scalars().all())

    async def update(self, machine_id: int, data: MachineUpdate) -> Machine | None:
        """Update a machine."""
        machine = await self.get(machine_id)
        if not machine:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(machine, field, value)

        await self.db.commit()
        await self.db.refresh(machine)
        return machine

    async def delete(self, machine_id: int) -> bool:
        """Delete a machine."""
        machine = await self.get(machine_id)
        if not machine:
            return False

        await self.db.delete(machine)
        await self.db.commit()
        return True
