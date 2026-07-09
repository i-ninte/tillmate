# AgriMachine Controller (TillMate)

A purpose-built mobile ground control station (GCS) for an agricultural machine. Built for farmers — not drone pilots. Every screen is designed to be understood within 30 seconds by an operator with no UAV or software background.

---

## What It Does

The AgriMachine Controller lets a farmer:

- **Connect** to the machine over WiFi with one tap
- **Monitor** machine health in real time — battery, GPS, satellites, speed, heading, temperatures, implement depth, headlights, mode
- **Control** the rotary tiller, pump, headlights, and implement depth directly from the phone
- **Draw a field** by tapping its corners on a satellite map
- **Pick an operation** — tilling, weeding, or spraying — and set the working depth for the ones that need it
- **Generate a route** automatically: the app plans a back-and-forth (serpentine) coverage path spaced by the machine's implement width
- **Simulate** the planned route on the map before sending it to the machine
- **Send the plan to the machine** — the app compiles it into MAVLink mission items, uploads them, and reads them back to verify the machine has exactly what was sent
- **Start / Pause / Resume / Return-to-Start** the mission with guarded controls (Start is disabled without GPS fix, with E-stop active, or without a sent plan)
- **Watch the machine work** — live "Working point X of N" progress, active-point highlight on the map, and a breadcrumb trail of the actual path driven
- **Stop everything instantly** with a permanently visible Emergency Stop button

---

## System Architecture

The app is one node in a four-part hardware chain:

```
AgriMachine App (Android / iOS / Web)
  │
  │  WiFi UDP :14550 — MAVLink 2
  │
DroneBridge ESP32          ← Creates WiFi hotspot (SSID: AgriMachine_001)
  │
  │  UART 115200 baud — MAVLink 2
  │
Pixhawk Flight Controller  ← GPS, navigation, waypoint execution
  │
  │  UART 57600 baud — MAVLink 2
  │
STM32F405RGT6              ← Custom implement controller
  ├── Linear Actuator       (implement depth — PWM + potentiometer feedback)
  ├── Rotary Tiller Relay   (on / off)
  ├── Pump Relay            (on / off)
  └── Headlights Relay      (on / off)
```

The app communicates with the Pixhawk directly over UDP via MAVLink 2. The FastAPI backend is used only for persistence (machines, saved field plans, telemetry logs, command audit trail) — it is **not** in the real-time control path.

For an end-to-end walkthrough of every flow (connection → planning → upload → run → monitoring → persistence), see [`docs/SYSTEM_FLOW.md`](docs/SYSTEM_FLOW.md).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native (Expo SDK 55+) + TypeScript |
| Navigation | Expo Router (file-based, tabs on Field View / Field Planner / Saved Plans / Settings) |
| Maps | MapLibre (`@maplibre/maplibre-react-native` on native, `react-map-gl/maplibre` on web) with ESRI World Imagery satellite tiles + OSM streets — **no Google Maps API key required** |
| MAVLink transport | `react-native-udp` UDP socket + a custom MAVLink 2 parser/encoder in TypeScript |
| State management | Zustand |
| HTTP client | Axios (with camelCase ↔ snake_case transforms at the API boundary) |
| Test runner | Jest 29 + ts-jest (131 tests, includes live backend integration tests) |
| Backend | FastAPI (Python 3.11+) |
| Database | MySQL 8+ (uses JSON column for field boundary polygons) |
| ORM | SQLAlchemy 2 (async) |
| Migrations | Alembic |
| Backend tests | pytest + pytest-asyncio + httpx (25 tests, SQLite in-memory) |
| Hardware bridge | DroneBridge ESP32 (open-source firmware) |
| Flight controller protocol | MAVLink 2 |

---

## Repository Structure

```
tillmate/
├── mobile/                        # React Native (Expo) app
│   ├── app/                        # Expo Router
│   │   ├── index.tsx               # Connection screen
│   │   └── (tabs)/
│   │       ├── _layout.tsx         # Tab layout
│   │       ├── field-view.tsx      # Live view — dashboard + map + mission run controls
│   │       ├── field-planner.tsx   # Draw field → pick operation → generate → simulate → send
│   │       ├── saved-plans.tsx     # Load a saved plan back into the planner
│   │       └── settings.tsx        # Connection + machine setup (implement width)
│   ├── components/
│   │   ├── dashboard/              # FarmDashboard, DashTile
│   │   ├── controls/               # FarmControlPanel, DepthSlider, RelayButton,
│   │   │                           # EmergencyStopButton, MissionRunControls
│   │   ├── mission/                # FieldMap, OperationPanel, WorkPointEditor, WorkPointMarker
│   │   └── common/                 # BigButton, StatusBadge, ConnectionBanner
│   ├── services/
│   │   ├── MavlinkService.ts       # UDP socket singleton + telemetry dispatch +
│   │   │                           # mission protocol send/waitForMessage
│   │   ├── missionCompiler.ts      # FieldPlan → MAVLink MissionItemInt[] (depth-aware)
│   │   ├── missionUploader.ts      # uploadMission + downloadMission + verifyMissionMatches
│   │   ├── coveragePlanner.ts      # Boundary polygon → serpentine coverage path
│   │   ├── operations.ts           # Tilling / weeding / spraying configs, depth→PWM
│   │   ├── simulation.ts           # Pure path-following math for route preview
│   │   └── telemetryLogger.ts      # Batched telemetry / command logging with offline retry
│   ├── hooks/                      # useSimulation, useMavlinkService, useInterval, useTelemetryThrottle
│   ├── store/                      # Zustand slices (connection, telemetry, control, mission)
│   ├── api/                        # Axios calls with snake_case ↔ camelCase transforms
│   ├── types/                      # TypeScript types (mavlink.ts, mission.ts)
│   ├── utils/                      # mavlinkParser, mavlinkBuilders, units, locationService
│   ├── constants/                  # colors, layout, mapStyle
│   └── __tests__/                  # 131 jest tests (unit + live backend integration)
│
└── backend/                        # FastAPI backend
    ├── main.py
    ├── config.py
    ├── database.py
    ├── models/                     # SQLAlchemy ORM models
    ├── schemas/                    # Pydantic request/response schemas
    ├── routers/                    # FastAPI route handlers
    ├── services/                   # Business logic
    ├── alembic/                    # Migration scripts
    └── tests/                      # 25 pytest tests
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- MySQL 8+
- Expo CLI (`npm install -g expo-cli`)
- An Android or iOS device / simulator (both are first-class targets; web is supported for browser preview)

### Mobile App

```bash
cd mobile

# Install dependencies
npm install

# Start the Expo dev server (choose iOS, Android, or web from the menu)
npx expo start
```

### Backend

The project has a checked-in venv at `backend/tillmate/`:

```bash
cd backend

# Use the existing venv (recommended)
tillmate/bin/pip install -r requirements.txt

# Configure DB
cp .env.example .env
# Edit .env: MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB

# Create DB and run migrations
tillmate/bin/alembic upgrade head

# Start the API server
tillmate/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API docs are available at `http://localhost:8000/docs`.

---

## Hardware Setup

### DroneBridge ESP32

1. Flash the latest DroneBridge firmware from [github.com/DroneBridge/ESP32](https://github.com/DroneBridge/ESP32)
2. Connect to its default WiFi SSID, then open `http://192.168.2.1`
3. Configure:
   - UART baud rate: `115200`
   - WiFi SSID: `AgriMachine_001` (or use the machine serial number)
   - UDP output port: `14550`
   - MAVLink mode: Enabled

### Pixhawk Parameters

Set these once via Mission Planner or QGC during initial hardware setup:

| Parameter | Value |
|---|---|
| SERIAL1_BAUD | 115 (= 115200) |
| SERIAL1_PROTOCOL | 2 (MAVLink 2) |
| BATT_MONITOR | 8 (DroneCAN BMS) |

Full wiring and configuration details are in [`.claude/skills/references/03-dronebridge-setup.md`](.claude/skills/references/03-dronebridge-setup.md).

---

## MAVLink Commands

### Real-time controls (COMMAND_LONG)

| Operation | Command | Key Params |
|---|---|---|
| Implement depth | `MAV_CMD_DO_SET_SERVO` (183) | channel=9, PWM 1000–2000 |
| Rotary tiller | `MAV_CMD_DO_SET_RELAY` (181) | relay=0, state=1/0 |
| Pump | `MAV_CMD_DO_SET_RELAY` (181) | relay=1, state=1/0 |
| Headlights | `MAV_CMD_DO_SET_RELAY` (181) | relay=2, state=1/0 |
| Arm / Disarm | `MAV_CMD_COMPONENT_ARM_DISARM` (400) | param1=1/0 |
| Mode change | `MAV_CMD_DO_SET_MODE` (176) | param1=1 (custom), param2=mode (Rover: 10=AUTO, 4=HOLD, 11=RTL) |
| Mission start | `MAV_CMD_MISSION_START` (300) | param1=0 (first item), param2=0 (last) |

**Emergency Stop** sends the safe sequence in one burst: disarm + tiller off + pump off + implement raised.

**Start Working** sends arm → set mode AUTO → mission start, in that order.

### Mission upload / download protocol

`MISSION_CLEAR_ALL` → `MISSION_COUNT` → (per item: `MISSION_REQUEST_INT` ← `MISSION_ITEM_INT`) → `MISSION_ACK`.

After every upload, the app calls `downloadMission()` (`MISSION_REQUEST_LIST` → `MISSION_COUNT` → per-item request/reply → `MISSION_ACK`) and `verifyMissionMatches()` to confirm the machine holds exactly what was sent.

### STM32 telemetry (upstream)

`NAMED_VALUE_FLOAT` / `NAMED_VALUE_INT` messages:

| Key | Type | Meaning |
|---|---|---|
| `MACH_TEMP` | float | Machine temperature (°C) |
| `PIX_TEMP` | float | Pixhawk temperature (°C) |
| `IMPL_DEPTH` | float | Implement depth (cm) |
| `ESTOP` | int | Emergency stop state (0/1) |
| `LIGHTS` | int | Headlights (0/1) |

Mission execution progress arrives on `MISSION_CURRENT` (42) and `MISSION_ITEM_REACHED` (46), and is mapped from raw item sequence back to a farmer-friendly work-point number.

Full command reference: [`.claude/skills/references/02-mavlink-commands.md`](.claude/skills/references/02-mavlink-commands.md).

---

## Screens

### Connection Screen (`app/index.tsx`)
The farmer joins the machine's WiFi network and taps **Connect to Machine**. The app opens a UDP socket on `:14551`, starts heartbeats, and navigates automatically once a MAVLink heartbeat is received from the Pixhawk. A simulation-mode toggle is available for development.

### Field View (`app/(tabs)/field-view.tsx`)
The main operating screen. Shows:

- **Dashboard strip** — battery, GPS + satellites, speed + heading, temperatures, implement depth, mode, E-stop state, headlights
- **Satellite map** — live machine marker (heading-aware), highlight on the active work point, breadcrumb trail of the actual path driven
- **Mission run controls** — Start Working / Pause / Resume / Return to Start (guarded: Start needs GPS fix, no E-stop, and a sent plan)
- **Control panel** — implement depth slider, tiller/pump/headlights toggles
- **Emergency Stop** — always visible, on every operational screen

### Field Planner (`app/(tabs)/field-planner.tsx`)
Two modes:

- **Draw Field** — tap the corners of your field on the satellite map to make a polygon (with undo)
- **Route Points** — the generated waypoints, tap-editable

Plus:

- **Operation panel** — Tilling / Weeding / Spraying, working depth (for tilling/weeding), implement width (defaults from the machine's saved setup)
- **Generate Route** — plans a back-and-forth coverage path with lanes spaced by the implement width; changing the operation *after* generation re-applies its states to every point (no need to redo the path)
- **Simulate** — animates a virtual machine along the path with heading and % progress so you can preview before sending
- **Send to Machine** — compiles + validates the plan → uploads via MAVLink handshake → reads it back → confirms it matches → alerts the farmer
- **Save** — persists the plan (name, boundary, operation, depth, work points) to the backend

### Saved Plans (`app/(tabs)/saved-plans.tsx`)
List of saved field plans (with operation and work-point count). Load a plan back into the planner for re-use or re-send.

### Settings (`app/(tabs)/settings.tsx`)
Machine IP / UDP port, backend URL, and **Machine Setup**: implement width in metres (persists to the machine record and becomes the planner's default).

---

## Safety Rules

These rules are non-negotiable and enforced in code review:

- The **Emergency Stop button is always visible** on every operational screen — never hidden behind a scroll or menu
- If the MAVLink connection is lost, **all telemetry tiles show `--` immediately** — stale values are never displayed (`telemetryStore.clearAll()` is called on disconnect)
- **Start Working is disabled** when GPS fix is absent, when E-stop is active, or when no plan has been sent
- The **depth slider sends only on release** — never on drag — to prevent rapid actuator commands
- **Every mission upload is verified** by reading it back from the Pixhawk and comparing item-by-item
- No screen ever shows raw MAVLink IDs, parameter names, or internal error codes to the user

---

## Testing

### Mobile unit + integration tests

```bash
cd mobile
npm test           # 131 tests: 124 unit + 7 live-backend integration
npx tsc --noEmit   # type check
```

Covers: MAVLink builders/encoders/parsers, mission compiler with depth PWM, coverage planner (polygon → serpentine), operation → work-point mapping, simulation math, mission upload + download + verify handshake, execution progress (`MISSION_CURRENT` / `MISSION_ITEM_REACHED`), mission run controls, telemetry logger buffering/retry, unit conversions, and **live backend integration** (machine round-trip, mission with operation/boundary, telemetry POST + read-back).

The integration tests skip cleanly if the backend isn't running.

### Backend tests

```bash
cd backend
tillmate/bin/python -m pytest tests -q   # 25 tests, SQLite in-memory
```

### Bench test (hardware in the loop)

Follow the checklist in [`.claude/skills/references/11-testing-guide.md`](.claude/skills/references/11-testing-guide.md):

1. Connect the ESP32 to a bench-powered Pixhawk, join the WiFi
2. Open the app — connection banner turns green, dashboard tiles populate
3. Move the depth slider → verify the actuator moves
4. Draw a small boundary, generate a route, tap **Send to Machine** → progress finishes with "sent and verified"
5. **Start Working** → machine arms and follows the route; Field View shows "Working point X of N" and the breadcrumb trail
6. **Return to Start** and **Emergency Stop** should both take effect immediately
7. Power off the Pixhawk → tiles show `--` within 5 s

---

## Developer Documentation

| File | Topic |
|---|---|
| [`docs/SYSTEM_FLOW.md`](docs/SYSTEM_FLOW.md) | End-to-end walkthrough of every runtime flow — connection, planning, upload, run, monitoring, persistence |
| [`TASKS.md`](TASKS.md) | Implementation roadmap and status |
| [`.claude/skills/SKILL.md`](.claude/skills/SKILL.md) | Master skill entry point for AI-assisted development |
| [`.claude/skills/references/01-architecture.md`](.claude/skills/references/01-architecture.md) | Hardware chain, component IDs, data flow |
| [`.claude/skills/references/02-mavlink-commands.md`](.claude/skills/references/02-mavlink-commands.md) | Every MAVLink command, TypeScript types, upload handshake |
| [`.claude/skills/references/03-dronebridge-setup.md`](.claude/skills/references/03-dronebridge-setup.md) | Wiring, firmware, config, connection logic |
| [`.claude/skills/references/04-telemetry-dashboard.md`](.claude/skills/references/04-telemetry-dashboard.md) | Dashboard tiles, MAVLink subscriptions, component code |
| [`.claude/skills/references/05-mission-planning.md`](.claude/skills/references/05-mission-planning.md) | Field planner UX, mission compiler, upload service |
| [`.claude/skills/references/06-realtime-controls.md`](.claude/skills/references/06-realtime-controls.md) | Depth slider, tiller/pump buttons, E-stop |
| [`.claude/skills/references/07-fastapi-backend.md`](.claude/skills/references/07-fastapi-backend.md) | Backend structure, routers, services |
| [`.claude/skills/references/08-database-schema.md`](.claude/skills/references/08-database-schema.md) | All DB tables, Pydantic schemas, Alembic migrations |
| [`.claude/skills/references/09-react-native-structure.md`](.claude/skills/references/09-react-native-structure.md) | Project layout, Expo Router, Zustand stores |
| [`.claude/skills/references/10-ui-design-rules.md`](.claude/skills/references/10-ui-design-rules.md) | Colors, typography, farmer vocabulary map |
| [`.claude/skills/references/11-testing-guide.md`](.claude/skills/references/11-testing-guide.md) | Unit tests, bench protocol, field test sequence |

---

## Key External Resources

| Resource | URL |
|---|---|
| DroneBridge ESP32 firmware | https://github.com/DroneBridge/ESP32 |
| MAVLink 2 specification | https://mavlink.io/en/guide/mavlink_2.html |
| MAVLink common messages | https://mavlink.io/en/messages/common.html |
| ArduPilot mission commands | https://ardupilot.org/copter/docs/mission-command-list.html |
| ArduPilot Rover modes | https://ardupilot.org/rover/docs/rover-flight-modes.html |
| ArduPilot DroneCAN BMS setup | https://ardupilot.org/copter/docs/common-uavcan-setup-advanced.html |
| MapLibre GL native (RN) | https://github.com/maplibre/maplibre-react-native |
| MapLibre GL JS (web) | https://maplibre.org/maplibre-gl-js |
| Expo documentation | https://docs.expo.dev |
| FastAPI documentation | https://fastapi.tiangolo.com |

---

## License

[MIT](LICENSE)
