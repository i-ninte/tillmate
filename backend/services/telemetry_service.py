from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import TelemetryLog, CommandLog
from schemas import TelemetryLogCreate, CommandLogCreate


class TelemetryService:
    """Service for telemetry and command log operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def bulk_insert_telemetry(
        self, logs: list[TelemetryLogCreate]
    ) -> int:
        """Batch insert telemetry readings."""
        entries = [TelemetryLog(**log.model_dump()) for log in logs]
        self.db.add_all(entries)
        await self.db.commit()
        return len(entries)

    async def get_session_telemetry(
        self, machine_id: int, session_id: str
    ) -> list[TelemetryLog]:
        """Get telemetry logs for a specific session."""
        result = await self.db.execute(
            select(TelemetryLog)
            .where(
                TelemetryLog.machine_id == machine_id,
                TelemetryLog.session_id == session_id,
            )
            .order_by(TelemetryLog.recorded_at)
        )
        return list(result.scalars().all())

    async def bulk_insert_commands(
        self, logs: list[CommandLogCreate]
    ) -> int:
        """Batch insert command logs."""
        entries = [CommandLog(**log.model_dump()) for log in logs]
        self.db.add_all(entries)
        await self.db.commit()
        return len(entries)

    async def get_session_commands(
        self, machine_id: int, session_id: str
    ) -> list[CommandLog]:
        """Get command logs for a specific session."""
        result = await self.db.execute(
            select(CommandLog)
            .where(
                CommandLog.machine_id == machine_id,
                CommandLog.session_id == session_id,
            )
            .order_by(CommandLog.sent_at)
        )
        return list(result.scalars().all())
