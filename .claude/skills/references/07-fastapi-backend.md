# Reference 07 — FastAPI Backend

## Overview

The FastAPI backend handles persistence and configuration. It is NOT in the real-time MAVLink path — the app communicates with the Pixhawk directly over UDP. The backend is used for:
- Saving/loading field plans (missions)
- Storing telemetry logs for post-session review
- Machine configuration (SSID, serial number, calibration params)
- User management (future)

---

## Project Structure

```
backend/
├── main.py                   # FastAPI app entry point
├── config.py                 # Settings (DB URL, env vars)
├── database.py               # SQLAlchemy async engine + session factory
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/             # migration files
├── models/                   # SQLAlchemy ORM models
│   ├── __init__.py
│   ├── machine.py
│   ├── mission.py
│   └── telemetry_log.py
├── schemas/                  # Pydantic request/response schemas
│   ├── machine.py
│   ├── mission.py
│   └── telemetry_log.py
├── routers/                  # FastAPI routers
│   ├── machines.py
│   ├── missions.py
│   └── telemetry.py
├── services/                 # Business logic
│   ├── mission_service.py
│   └── telemetry_service.py
└── requirements.txt
```

---

## Dependencies

```txt
# requirements.txt
fastapi==0.111.*
uvicorn[standard]==0.30.*
sqlalchemy[asyncio]==2.0.*
aiomysql==0.2.*
alembic==1.13.*
pydantic==2.*
pydantic-settings==2.*
python-multipart==0.0.*
```

---

## config.py

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    db_url: str = "mysql+aiomysql://agri:password@localhost:3306/agrimachine"
    api_prefix: str = "/api/v1"
    debug: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## database.py

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from config import settings

engine = create_async_engine(settings.db_url, echo=settings.debug)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

---

## main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import machines, missions, telemetry

app = FastAPI(title="AgriMachine API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production to app origin
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(machines.router, prefix=f"{settings.api_prefix}/machines", tags=["machines"])
app.include_router(missions.router, prefix=f"{settings.api_prefix}/missions", tags=["missions"])
app.include_router(telemetry.router, prefix=f"{settings.api_prefix}/telemetry", tags=["telemetry"])

@app.get("/health")
async def health():
    return {"status": "ok"}
```

---

## Missions Router

```python
# routers/missions.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.mission import FieldPlanCreate, FieldPlanResponse
from services.mission_service import MissionService

router = APIRouter()

@router.post("/", response_model=FieldPlanResponse, status_code=201)
async def create_mission(payload: FieldPlanCreate, db: AsyncSession = Depends(get_db)):
    return await MissionService(db).create(payload)

@router.get("/", response_model=list[FieldPlanResponse])
async def list_missions(machine_id: int | None = None, db: AsyncSession = Depends(get_db)):
    return await MissionService(db).list_all(machine_id=machine_id)

@router.get("/{mission_id}", response_model=FieldPlanResponse)
async def get_mission(mission_id: int, db: AsyncSession = Depends(get_db)):
    plan = await MissionService(db).get(mission_id)
    if not plan:
        raise HTTPException(404, "Field plan not found")
    return plan

@router.delete("/{mission_id}", status_code=204)
async def delete_mission(mission_id: int, db: AsyncSession = Depends(get_db)):
    await MissionService(db).delete(mission_id)
```

---

## Machines Router

```python
# routers/machines.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.machine import MachineCreate, MachineResponse
from services.machine_service import MachineService

router = APIRouter()

@router.post("/", response_model=MachineResponse, status_code=201)
async def register_machine(payload: MachineCreate, db: AsyncSession = Depends(get_db)):
    return await MachineService(db).create(payload)

@router.get("/", response_model=list[MachineResponse])
async def list_machines(db: AsyncSession = Depends(get_db)):
    return await MachineService(db).list_all()
```

---

## Telemetry Log Router

```python
# routers/telemetry.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.telemetry_log import TelemetryLogCreate, TelemetryLogResponse
from services.telemetry_service import TelemetryService

router = APIRouter()

@router.post("/logs", status_code=201)
async def append_logs(payload: list[TelemetryLogCreate], db: AsyncSession = Depends(get_db)):
    """Batch insert telemetry readings (called periodically from the app)."""
    await TelemetryService(db).bulk_insert(payload)
    return {"inserted": len(payload)}

@router.get("/logs", response_model=list[TelemetryLogResponse])
async def get_logs(machine_id: int, session_id: str, db: AsyncSession = Depends(get_db)):
    return await TelemetryService(db).get_session(machine_id, session_id)
```

---

## Running the Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# First time: create DB and run migrations
alembic upgrade head

# Start dev server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## Alembic Setup

```bash
alembic init alembic
```

Edit `alembic/env.py`:
```python
from database import Base
from models import machine, mission, telemetry_log  # import all models
target_metadata = Base.metadata
```

Generate first migration after defining models:
```bash
alembic revision --autogenerate -m "initial_schema"
alembic upgrade head
```

Generate subsequent migrations after model changes:
```bash
alembic revision --autogenerate -m "add_calibration_to_machine"
alembic upgrade head
```