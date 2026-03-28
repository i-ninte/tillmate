# Backend — Codebase Context

> **Purpose:** This file provides Claude with instant context about the backend codebase without rescanning. Update this file after every code change.

---

## Project Location

```
/backend/                   # FastAPI backend root
```

---

## Implementation Status

### Core Setup
| Item | Status | Location |
|------|--------|----------|
| FastAPI project initialized | COMPLETE | `/backend/` |
| config.py (pydantic-settings) | COMPLETE | `/backend/config.py` |
| database.py (SQLAlchemy async) | COMPLETE | `/backend/database.py` |
| main.py (app entry) | COMPLETE | `/backend/main.py` |
| requirements.txt | COMPLETE | `/backend/requirements.txt` |
| .env.example | COMPLETE | `/backend/.env.example` |

### Alembic Migrations
| Item | Status | Location |
|------|--------|----------|
| Alembic initialized | COMPLETE | `/backend/alembic/` |
| env.py configured | COMPLETE | `/backend/alembic/env.py` |
| Initial migration | COMPLETE | `/backend/alembic/versions/2e0aaa3b8c01_initial.py` |

### SQLAlchemy Models
| Model | Status | Location | Table |
|-------|--------|----------|-------|
| Machine | COMPLETE | `/backend/models/machine.py` | `machines` |
| FieldPlan | COMPLETE | `/backend/models/mission.py` | `field_plans` |
| WorkPoint | COMPLETE | `/backend/models/mission.py` | `work_points` |
| TelemetryLog | COMPLETE | `/backend/models/telemetry_log.py` | `telemetry_logs` |
| CommandLog | COMPLETE | `/backend/models/command_log.py` | `command_logs` |

### Pydantic Schemas
| Schema | Status | Location |
|--------|--------|----------|
| MachineCreate | COMPLETE | `/backend/schemas/machine.py` |
| MachineUpdate | COMPLETE | `/backend/schemas/machine.py` |
| MachineResponse | COMPLETE | `/backend/schemas/machine.py` |
| FieldPlanCreate | COMPLETE | `/backend/schemas/mission.py` |
| FieldPlanResponse | COMPLETE | `/backend/schemas/mission.py` |
| FieldPlanSummary | COMPLETE | `/backend/schemas/mission.py` |
| WorkPointBase | COMPLETE | `/backend/schemas/mission.py` |
| WorkPointResponse | COMPLETE | `/backend/schemas/mission.py` |
| TelemetryLogCreate | COMPLETE | `/backend/schemas/telemetry_log.py` |
| TelemetryLogResponse | COMPLETE | `/backend/schemas/telemetry_log.py` |
| CommandLogCreate | COMPLETE | `/backend/schemas/command_log.py` |
| CommandLogResponse | COMPLETE | `/backend/schemas/command_log.py` |

### Routers (API Endpoints)
| Router | Status | Location | Prefix |
|--------|--------|----------|--------|
| machines | COMPLETE | `/backend/routers/machines.py` | `/api/v1/machines` |
| missions | COMPLETE | `/backend/routers/missions.py` | `/api/v1/missions` |
| telemetry | COMPLETE | `/backend/routers/telemetry.py` | `/api/v1/telemetry` |

### Services (Business Logic)
| Service | Status | Location |
|---------|--------|----------|
| MachineService | COMPLETE | `/backend/services/machine_service.py` |
| MissionService | COMPLETE | `/backend/services/mission_service.py` |
| TelemetryService | COMPLETE | `/backend/services/telemetry_service.py` |

### Tests
| Test | Status | Location |
|------|--------|----------|
| Test fixtures (conftest) | COMPLETE | `/backend/tests/conftest.py` |
| Machine API tests | COMPLETE | `/backend/tests/test_machines.py` |
| Mission API tests | COMPLETE | `/backend/tests/test_missions.py` |
| Telemetry API tests | COMPLETE | `/backend/tests/test_telemetry.py` |

---

## API Endpoints Summary

### Machines (`/api/v1/machines`)
| Method | Endpoint | Status | Description |
|--------|----------|--------|-------------|
| POST | `/` | COMPLETE | Register new machine |
| GET | `/` | COMPLETE | List all machines |
| GET | `/{id}` | COMPLETE | Get machine by ID |
| PATCH | `/{id}` | COMPLETE | Update machine |
| DELETE | `/{id}` | COMPLETE | Delete machine |

### Missions (`/api/v1/missions`)
| Method | Endpoint | Status | Description |
|--------|----------|--------|-------------|
| POST | `/` | COMPLETE | Create field plan |
| GET | `/` | COMPLETE | List field plans (filter by machine_id) |
| GET | `/summaries` | COMPLETE | List field plan summaries |
| GET | `/{id}` | COMPLETE | Get field plan by ID |
| DELETE | `/{id}` | COMPLETE | Delete field plan |

### Telemetry (`/api/v1/telemetry`)
| Method | Endpoint | Status | Description |
|--------|----------|--------|-------------|
| POST | `/logs` | COMPLETE | Batch insert telemetry logs |
| GET | `/logs` | COMPLETE | Get logs by machine_id + session_id |
| POST | `/commands` | COMPLETE | Batch insert command logs |
| GET | `/commands` | COMPLETE | Get commands by machine_id + session_id |

### Health
| Method | Endpoint | Status | Description |
|--------|----------|--------|-------------|
| GET | `/health` | COMPLETE | Health check |
| GET | `/` | COMPLETE | Root/info |

---

## Database Schema Overview

```
machines
├── id (PK)
├── serial_number (unique)
├── display_name
├── wifi_ssid
├── actuator_min_mm, actuator_max_mm
├── actuator_pwm_min, actuator_pwm_max
├── battery_warn_v, battery_critical_v
├── created_at, updated_at

field_plans
├── id (PK)
├── machine_id (FK → machines)
├── name
├── notes
├── return_to_home (bool, default true)
├── home_lat, home_lon (nullable)
├── created_at, updated_at

work_points
├── id (PK)
├── field_plan_id (FK → field_plans)
├── seq
├── lat, lon
├── implement_lowered
├── tiller_on
├── pump_on
├── label

telemetry_logs
├── id (PK)
├── machine_id (FK → machines)
├── session_id (UUID)
├── recorded_at
├── battery_voltage_v, battery_pct
├── gps_fixed, lat, lon, satellites
├── speed_kmh, heading_deg
├── pixhawk_temp_c, machine_temp_c
├── implement_depth_cm
├── estop_active
├── mode
├── headlights_on

command_logs
├── id (PK)
├── machine_id (FK → machines)
├── session_id
├── sent_at
├── command_id
├── command_name
├── param1, param2
├── source ('realtime' | 'mission')
```

---

## Database Configuration

```
Host: localhost
Port: 3306
Database: tillmate
User: root
Password: 9Bestfacts*

Async URL: mysql+aiomysql://root:9Bestfacts*@localhost:3306/tillmate
Sync URL: mysql+pymysql://root:9Bestfacts*@localhost:3306/tillmate
```

---

## Key Patterns & Conventions

### Dependency Injection
```python
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/")
async def create(payload: Schema, db: AsyncSession = Depends(get_db)):
    return await Service(db).create(payload)
```

### Service Pattern
- Each router has a corresponding service class
- Services accept `AsyncSession` in constructor
- All DB operations are async

### Migrations
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

---

## Recent Changes

| Date | Change | Files Modified |
|------|--------|----------------|
| 2026-03-26 | Initial backend setup | All files |
| 2026-03-26 | Created config.py | config.py |
| 2026-03-26 | Created database.py | database.py |
| 2026-03-26 | Created main.py | main.py |
| 2026-03-26 | Created all models | models/*.py |
| 2026-03-26 | Created all schemas | schemas/*.py |
| 2026-03-26 | Created all services | services/*.py |
| 2026-03-26 | Created all routers | routers/*.py |
| 2026-03-26 | Set up Alembic | alembic/, alembic.ini |
| 2026-03-26 | Updated .env | .env, .env.example |
| 2026-03-27 | Generated initial migration | alembic/versions/2e0aaa3b8c01_initial.py |
| 2026-03-27 | Added pytest test suite | tests/conftest.py, tests/test_*.py |
| 2026-03-28 | Added return_to_home, home_lat, home_lon to FieldPlan | models/mission.py, schemas/mission.py |
| 2026-03-28 | Added satellites, heading_deg, headlights_on to TelemetryLog | models/telemetry_log.py, schemas/telemetry_log.py |
| 2026-03-28 | Updated MissionService for new fields | services/mission_service.py |
| 2026-03-28 | Created migration for schema changes | alembic/versions/3f1bbb4c9d02_*.py |

---

## Known Issues / TODOs

- Need to verify MySQL database exists and is accessible before running migrations
- May need to install test dependencies: `pip install pytest pytest-asyncio httpx aiosqlite`

---

## Quick Start Commands

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Create database (MySQL CLI)
# CREATE DATABASE tillmate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Run migrations
alembic upgrade head

# Start dev server
uvicorn main:app --reload --port 8000
```

---

## Update Instructions

**After every code change, update this file:**

1. Change `NOT_STARTED` → `IN_PROGRESS` → `COMPLETE` in status columns
2. Add entry to "Recent Changes" table
3. Add any new files/endpoints to the appropriate table
4. Update "Known Issues / TODOs" if needed
