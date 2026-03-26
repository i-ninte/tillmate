# AgriMachine Controller

A purpose-built mobile ground control station (GCS) for an agricultural machine. Built for farmers — not drone pilots. Every screen is designed to be understood within 30 seconds by an operator with no UAV or software background.

---

## What It Does

AgriMachine Controller lets a farmer:

- **Connect** to their machine over WiFi with one tap
- **Monitor** machine health in real time — battery, GPS, temperature, implement depth
- **Control** the rotary tiller, pump, and implement depth directly from the phone
- **Plan field missions** — draw a path on a satellite map, set operations at each work point, and send the full plan to the machine
- **Stop everything instantly** with a permanently visible Emergency Stop button

---

## System Architecture

The app is one node in a four-part hardware chain:

```
AgriMachine App (Android / iOS)
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
  ├── Linear Actuator       (implement height — PWM + potentiometer feedback)
  ├── Rotary Tiller Relay   (on / off)
  └── Pump Relay            (on / off)
```

The app communicates with the Pixhawk directly over UDP via MAVLink 2. The FastAPI backend is used only for persistence (saving field plans, telemetry logs) — it is not in the real-time control path.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native (Expo SDK 51+) + TypeScript |
| Maps | react-native-maps (satellite view) |
| MAVLink transport | react-native-udp (UDP socket, MAVLink 2 parser) |
| State management | Zustand |
| HTTP client | Axios |
| Backend | FastAPI (Python 3.11+) |
| Database | MySQL 8+ |
| ORM | SQLAlchemy 2 (async) |
| Migrations | Alembic |
| Hardware bridge | DroneBridge ESP32 (open-source firmware) |
| Flight controller protocol | MAVLink 2 |

---

## Repository Structure

```
agrimachine/
├── app/                        # Mobile app (Expo Router)
│   ├── index.tsx               # Connection screen
│   ├── field-view.tsx          # Live view — dashboard + controls + map
│   └── field-planner.tsx       # Mission planning screen
├── components/
│   ├── dashboard/              # FarmDashboard, DashTile
│   ├── controls/               # FarmControlPanel, DepthSlider, RelayButton, EmergencyStopButton
│   ├── mission/                # FieldMap, WorkPointEditor, WorkPointMarker
│   └── common/                 # BigButton, StatusBadge, ConnectionBanner
├── services/
│   ├── MavlinkService.ts       # UDP socket singleton
│   ├── MavlinkParser.ts        # Raw bytes → message objects
│   ├── MavlinkSender.ts        # Message objects → bytes → UDP
│   ├── missionCompiler.ts      # FieldPlan → MAVLink mission items
│   └── missionUploader.ts      # MAVLink upload handshake
├── store/                      # Zustand slices
├── api/                        # Axios calls to FastAPI backend
├── types/                      # TypeScript types (mavlink.ts, mission.ts)
├── utils/                      # MAVLink builders, unit converters
├── constants/                  # Colors, layout sizes
│
└── backend/                    # FastAPI backend
    ├── main.py
    ├── config.py
    ├── database.py
    ├── models/                 # SQLAlchemy ORM models
    ├── schemas/                # Pydantic request/response schemas
    ├── routers/                # FastAPI route handlers
    ├── services/               # Business logic
    └── alembic/                # Migration scripts
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- MySQL 8+
- Expo CLI (`npm install -g expo-cli`)
- An Android device or emulator (Android is the primary target)

### Mobile App

```bash
cd agrimachine

# Install dependencies
npm install

# Start the Expo dev server
npx expo start

# Run on Android
npx expo run:android
```

### Backend

```bash
cd backend

python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure your DB connection
cp .env.example .env
# Edit .env: set DB_URL=mysql+aiomysql://agri:password@localhost:3306/agrimachine

# Create the database and run migrations
alembic upgrade head

# Start the API server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
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

Full wiring and configuration details are in [`skill/references/03-dronebridge-setup.md`](skill/references/03-dronebridge-setup.md).

---

## MAVLink Commands

The app controls the machine via three MAVLink commands:

| Operation | Command | Key Params |
|---|---|---|
| Implement depth | `MAV_CMD_DO_SET_SERVO` (183) | channel=9, PWM 1000–2000 |
| Rotary tiller | `MAV_CMD_DO_SET_RELAY` (181) | relay=0, state=1/0 |
| Pump | `MAV_CMD_DO_SET_RELAY` (181) | relay=1, state=1/0 |

Emergency Stop sends all three commands (tiller OFF, pump OFF, implement raised) simultaneously.

STM32 telemetry travels upstream via `NAMED_VALUE_FLOAT` / `NAMED_VALUE_INT` messages:

| Key | Type | Meaning |
|---|---|---|
| `MACH_TEMP` | float | Machine temperature (°C) |
| `IMPL_DEPTH` | float | Implement depth (cm) |
| `ESTOP` | int | Emergency stop state (0/1) |
| `MODE` | int | Operating mode (0=MANUAL, 1=AUTO) |

Full command reference: [`skill/references/02-mavlink-commands.md`](skill/references/02-mavlink-commands.md)

---

## Screens

### Connection Screen
The farmer joins the machine's WiFi network and taps **Connect to Machine**. The app listens for a MAVLink heartbeat on UDP :14550 and navigates automatically once connected.

### Field View
The main operating screen. Shows:
- **Dashboard strip** — battery, GPS, speed, temperatures, implement depth, mode, E-stop state
- **Satellite map** — live machine position and breadcrumb trail
- **Control panel** — implement depth slider, tiller/pump toggles, Emergency Stop button

### Field Planner
Satellite map where the farmer taps to place **Work Points**. For each point, a panel shows:
- Implement: Raised / Lowered
- Tiller: OFF / ON
- Pump: OFF / ON

Tapping **Send to Machine** compiles the plan into a MAVLink mission and uploads it via the standard handshake protocol.

---

## Safety Rules

These rules are non-negotiable and enforced in code review:

- The **Emergency Stop button is always visible** on every operational screen — never hidden behind a scroll or menu
- If the MAVLink connection is lost, **all telemetry tiles show `--` immediately** — stale values are never displayed
- **Mission Start is disabled** when GPS fix is absent or E-stop is active
- The **depth slider sends only on release** — never on drag — to prevent rapid actuator commands
- No screen ever shows raw MAVLink IDs, parameter names, or internal error codes to the user

---

## Testing

### Unit Tests (mobile)

```bash
npm test
```

Covers MAVLink command builders and mission compiler logic.

### Backend Tests

```bash
cd backend
pytest
```

### Bench Test (no machine required)

Connect a DroneBridge ESP32 to a Pixhawk on a bench, join the WiFi, open the app, and verify:

1. Heartbeat received → Connected state
2. Dashboard tiles populate
3. MAVLink Inspector confirms correct `COMMAND_LONG` payloads for each control
4. Mission upload receives `MISSION_ACK type=0`
5. Power off Pixhawk → tiles show `--` within 5 s

Full bench and field test sequences: [`skill/references/11-testing-guide.md`](skill/references/11-testing-guide.md)

---

## Developer Documentation (Skill Files)

All build guidance, code patterns, and protocol details live in the `skill/` directory.

| File | Topic |
|---|---|
| [`SKILL.md`](skill/SKILL.md) | Master entry point — start here |
| [`01-architecture.md`](skill/references/01-architecture.md) | Hardware chain, component IDs, data flow |
| [`02-mavlink-commands.md`](skill/references/02-mavlink-commands.md) | Every MAVLink command, TypeScript types, upload handshake |
| [`03-dronebridge-setup.md`](skill/references/03-dronebridge-setup.md) | Wiring, firmware, config, connection logic |
| [`04-telemetry-dashboard.md`](skill/references/04-telemetry-dashboard.md) | Dashboard tiles, MAVLink subscriptions, component code |
| [`05-mission-planning.md`](skill/references/05-mission-planning.md) | Field planner UX, mission compiler, upload service |
| [`06-realtime-controls.md`](skill/references/06-realtime-controls.md) | Depth slider, tiller/pump buttons, E-stop |
| [`07-fastapi-backend.md`](skill/references/07-fastapi-backend.md) | Backend structure, routers, services |
| [`08-database-schema.md`](skill/references/08-database-schema.md) | All DB tables, Pydantic schemas, Alembic migrations |
| [`09-react-native-structure.md`](skill/references/09-react-native-structure.md) | Project layout, Expo Router, Zustand stores |
| [`10-ui-design-rules.md`](skill/references/10-ui-design-rules.md) | Colors, typography, farmer vocabulary map |
| [`11-testing-guide.md`](skill/references/11-testing-guide.md) | Unit tests, bench protocol, field test sequence |

---

## Key External Resources

| Resource | URL |
|---|---|
| DroneBridge ESP32 firmware | https://github.com/DroneBridge/ESP32 |
| MAVLink 2 specification | https://mavlink.io/en/guide/mavlink_2.html |
| MAVLink common messages | https://mavlink.io/en/messages/common.html |
| ArduPilot mission commands | https://ardupilot.org/copter/docs/mission-command-list.html |
| ArduPilot DroneCAN BMS setup | https://ardupilot.org/copter/docs/common-uavcan-setup-advanced.html |
| Expo documentation | https://docs.expo.dev |
| FastAPI documentation | https://fastapi.tiangolo.com |

---

## License

[MIT](LICENSE)