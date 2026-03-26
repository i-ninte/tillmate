# Reference 08 — Database Schema (MySQL + SQLAlchemy + Alembic)

## Tables Overview

| Table | Purpose |
|---|---|
| `machines` | Registered machines (serial, SSID, calibration) |
| `field_plans` | Saved farmer missions |
| `work_points` | Individual waypoints within a field plan |
| `telemetry_logs` | Time-series telemetry readings per session |
| `command_logs` | Audit log of every MAVLink command sent |

---

## SQLAlchemy Models

### machines

```python
# models/machine.py
from datetime import datetime
from sqlalchemy import String, Float, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from database import Base

class Machine(Base):
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

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
```

### field_plans

```python
# models/mission.py
from datetime import datetime
from typing import List
from sqlalchemy import String, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class FieldPlan(Base):
    __tablename__ = "field_plans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    work_points: Mapped[List["WorkPoint"]] = relationship("WorkPoint", back_populates="field_plan",
                                                           cascade="all, delete-orphan",
                                                           order_by="WorkPoint.seq")

class WorkPoint(Base):
    __tablename__ = "work_points"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    field_plan_id: Mapped[int] = mapped_column(ForeignKey("field_plans.id"), nullable=False)
    seq: Mapped[int] = mapped_column(nullable=False)
    lat: Mapped[float] = mapped_column(nullable=False)
    lon: Mapped[float] = mapped_column(nullable=False)
    implement_lowered: Mapped[bool] = mapped_column(default=False)
    tiller_on: Mapped[bool] = mapped_column(default=False)
    pump_on: Mapped[bool] = mapped_column(default=False)
    label: Mapped[str] = mapped_column(String(64), default="Work Point")

    field_plan: Mapped["FieldPlan"] = relationship("FieldPlan", back_populates="work_points")
```

### telemetry_logs

```python
# models/telemetry_log.py
from datetime import datetime
from sqlalchemy import String, Float, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from database import Base

class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), nullable=False)
    session_id: Mapped[str] = mapped_column(String(36), nullable=False)  # UUID from app
    recorded_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    battery_voltage_v: Mapped[float | None] = mapped_column(Float, nullable=True)
    battery_pct: Mapped[int | None] = mapped_column(nullable=True)
    gps_fixed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    speed_kmh: Mapped[float | None] = mapped_column(Float, nullable=True)
    pixhawk_temp_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    machine_temp_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    implement_depth_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    estop_active: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    mode: Mapped[str | None] = mapped_column(String(16), nullable=True)
```

### command_logs

```python
# models/command_log.py
from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from database import Base

class CommandLog(Base):
    __tablename__ = "command_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), nullable=False)
    session_id: Mapped[str] = mapped_column(String(36), nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    command_id: Mapped[int] = mapped_column(nullable=False)   # MAVLink command number
    command_name: Mapped[str] = mapped_column(String(64))     # human-readable
    param1: Mapped[float | None] = mapped_column(Float, nullable=True)
    param2: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(32))           # 'realtime' | 'mission'
```

---

## Pydantic Schemas

```python
# schemas/mission.py
from pydantic import BaseModel
from datetime import datetime

class WorkPointBase(BaseModel):
    seq: int
    lat: float
    lon: float
    implement_lowered: bool
    tiller_on: bool
    pump_on: bool
    label: str = "Work Point"

class FieldPlanCreate(BaseModel):
    machine_id: int
    name: str
    notes: str | None = None
    work_points: list[WorkPointBase]

class WorkPointResponse(WorkPointBase):
    id: int
    model_config = {"from_attributes": True}

class FieldPlanResponse(BaseModel):
    id: int
    machine_id: int
    name: str
    notes: str | None
    created_at: datetime
    work_points: list[WorkPointResponse]
    model_config = {"from_attributes": True}
```

```python
# schemas/machine.py
from pydantic import BaseModel
from datetime import datetime

class MachineCreate(BaseModel):
    serial_number: str
    display_name: str
    wifi_ssid: str
    actuator_min_mm: float = 0.0
    actuator_max_mm: float = 200.0
    battery_warn_v: float = 44.0
    battery_critical_v: float = 42.0

class MachineResponse(MachineCreate):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}
```

---

## MySQL Setup

```sql
CREATE DATABASE agrimachine CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'agri'@'%' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON agrimachine.* TO 'agri'@'%';
FLUSH PRIVILEGES;
```

---

## Useful Indexes (add in migrations)

```python
# In the alembic migration
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_index('ix_telemetry_session', 'telemetry_logs', ['machine_id', 'session_id', 'recorded_at'])
    op.create_index('ix_fieldplan_machine', 'field_plans', ['machine_id', 'created_at'])
    op.create_index('ix_commandlog_session', 'command_logs', ['machine_id', 'session_id'])
```