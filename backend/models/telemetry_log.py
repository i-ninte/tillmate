from datetime import datetime
from sqlalchemy import String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class TelemetryLog(Base):
    """Time-series telemetry readings per session."""

    __tablename__ = "telemetry_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    machine_id: Mapped[int] = mapped_column(
        ForeignKey("machines.id", ondelete="CASCADE"), nullable=False
    )
    session_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )  # UUID from app
    recorded_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Battery
    battery_voltage_v: Mapped[float | None] = mapped_column(Float, nullable=True)
    battery_pct: Mapped[int | None] = mapped_column(nullable=True)

    # GPS
    gps_fixed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    satellites: Mapped[int | None] = mapped_column(nullable=True)

    # Motion
    speed_kmh: Mapped[float | None] = mapped_column(Float, nullable=True)
    heading_deg: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Temperatures
    pixhawk_temp_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    machine_temp_c: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Implement
    implement_depth_cm: Mapped[float | None] = mapped_column(Float, nullable=True)

    # State
    estop_active: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    mode: Mapped[str | None] = mapped_column(String(16), nullable=True)

    # Accessories
    headlights_on: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    def __repr__(self) -> str:
        return f"<TelemetryLog {self.id} session={self.session_id}>"
