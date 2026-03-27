from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class CommandLog(Base):
    """Audit log of every MAVLink command sent."""

    __tablename__ = "command_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    machine_id: Mapped[int] = mapped_column(
        ForeignKey("machines.id", ondelete="CASCADE"), nullable=False
    )
    session_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    sent_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Command info
    command_id: Mapped[int] = mapped_column(nullable=False)  # MAVLink command number
    command_name: Mapped[str] = mapped_column(String(64))  # human-readable

    # Command parameters
    param1: Mapped[float | None] = mapped_column(Float, nullable=True)
    param2: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Source of command
    source: Mapped[str] = mapped_column(String(32))  # 'realtime' | 'mission'

    def __repr__(self) -> str:
        return f"<CommandLog {self.id}: {self.command_name}>"
