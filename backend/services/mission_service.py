from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models import FieldPlan, WorkPoint
from schemas import FieldPlanCreate


class MissionService:
    """Service for field plan CRUD operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: FieldPlanCreate) -> FieldPlan:
        """Create a new field plan with work points."""
        # Create field plan
        plan = FieldPlan(
            machine_id=data.machine_id,
            name=data.name,
            notes=data.notes,
        )

        # Create work points
        for wp_data in data.work_points:
            work_point = WorkPoint(**wp_data.model_dump())
            plan.work_points.append(work_point)

        self.db.add(plan)
        await self.db.commit()
        await self.db.refresh(plan)

        # Load work points relationship
        await self.db.refresh(plan, attribute_names=["work_points"])
        return plan

    async def get(self, plan_id: int) -> FieldPlan | None:
        """Get a field plan by ID with work points."""
        result = await self.db.execute(
            select(FieldPlan)
            .options(selectinload(FieldPlan.work_points))
            .where(FieldPlan.id == plan_id)
        )
        return result.scalar_one_or_none()

    async def list_all(self, machine_id: int | None = None) -> list[FieldPlan]:
        """List all field plans, optionally filtered by machine."""
        query = (
            select(FieldPlan)
            .options(selectinload(FieldPlan.work_points))
            .order_by(FieldPlan.created_at.desc())
        )

        if machine_id is not None:
            query = query.where(FieldPlan.machine_id == machine_id)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_summaries(
        self, machine_id: int | None = None
    ) -> list[dict]:
        """List field plan summaries with point counts."""
        query = (
            select(
                FieldPlan.id,
                FieldPlan.machine_id,
                FieldPlan.name,
                FieldPlan.notes,
                FieldPlan.created_at,
                func.count(WorkPoint.id).label("point_count"),
            )
            .outerjoin(WorkPoint)
            .group_by(FieldPlan.id)
            .order_by(FieldPlan.created_at.desc())
        )

        if machine_id is not None:
            query = query.where(FieldPlan.machine_id == machine_id)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            {
                "id": row.id,
                "machine_id": row.machine_id,
                "name": row.name,
                "notes": row.notes,
                "point_count": row.point_count,
                "created_at": row.created_at,
            }
            for row in rows
        ]

    async def delete(self, plan_id: int) -> bool:
        """Delete a field plan and its work points."""
        plan = await self.get(plan_id)
        if not plan:
            return False

        await self.db.delete(plan)
        await self.db.commit()
        return True
