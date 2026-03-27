from datetime import datetime
from sqlalchemy import String, Float, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class Machine(Base):
    """Registered agricultural machines."""

    __tablename__ = "machines"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    serial_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    wifi_ssid: Mapped[str] = mapped_column(String(64), nullable=False)

    # Actuator calibration — stored per machine
    actuator_min_mm: Mapped[float] = mapped_column(Float, default=0.0)
    actuator_max_mm: Mapped[float] = mapped_column(Float, default=200.0)
    actuator_pwm_min: Mapped[int] = mapped_column(default=1000)
    actuator_pwm_max: Mapped[int] = mapped_column(default=2000)

    # Battery thresholds
    battery_warn_v: Mapped[float] = mapped_column(Float, default=44.0)
    battery_critical_v: Mapped[float] = mapped_column(Float, default=42.0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<Machine {self.serial_number}: {self.display_name}>"
