from datetime import datetime
from typing import List
from sqlalchemy import String, Float, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class FieldPlan(Base):
    """Saved farmer field plans (missions)."""

    __tablename__ = "field_plans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    machine_id: Mapped[int] = mapped_column(
        ForeignKey("machines.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Return to home configuration
    return_to_home: Mapped[bool] = mapped_column(Boolean, default=True)
    home_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    home_lon: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationship to work points
    work_points: Mapped[List["WorkPoint"]] = relationship(
        "WorkPoint",
        back_populates="field_plan",
        cascade="all, delete-orphan",
        order_by="WorkPoint.seq",
    )

    def __repr__(self) -> str:
        return f"<FieldPlan {self.id}: {self.name}>"


class WorkPoint(Base):
    """Individual waypoints within a field plan."""

    __tablename__ = "work_points"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    field_plan_id: Mapped[int] = mapped_column(
        ForeignKey("field_plans.id", ondelete="CASCADE"), nullable=False
    )
    seq: Mapped[int] = mapped_column(nullable=False)

    # Coordinates
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)

    # Implement actions at this point
    implement_lowered: Mapped[bool] = mapped_column(Boolean, default=False)
    tiller_on: Mapped[bool] = mapped_column(Boolean, default=False)
    pump_on: Mapped[bool] = mapped_column(Boolean, default=False)

    # Farmer-visible label
    label: Mapped[str] = mapped_column(String(64), default="Work Point")

    # Relationship back to field plan
    field_plan: Mapped["FieldPlan"] = relationship(
        "FieldPlan", back_populates="work_points"
    )

    def __repr__(self) -> str:
        return f"<WorkPoint {self.seq}: ({self.lat}, {self.lon})>"
