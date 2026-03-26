---
name: agrimachine-qgc
version: 1.0
description: >
  Complete build guide and skill for the AgriMachine Controller — a React Native (Expo)
  mobile ground control station for an agricultural machine. Covers MAVLink 2 communication
  over DroneBridge ESP32, FastAPI backend, MySQL + Alembic, real-time telemetry, mission
  planning, implement control, and farmer-friendly UI.
stack:
  mobile: React Native (Expo SDK 51+) with TypeScript
  backend: FastAPI + Python 3.11+
  db: MySQL 8+ via SQLAlchemy 2 + Alembic
  protocol: MAVLink 2 over UDP (WiFi) via DroneBridge ESP32
  hardware_bridge: DroneBridge ESP32 → Pixhawk → STM32F405
references:
  - references/01-architecture.md
  - references/02-mavlink-commands.md
  - references/03-dronebridge-setup.md
  - references/04-telemetry-dashboard.md
  - references/05-mission-planning.md
  - references/06-realtime-controls.md
  - references/07-fastapi-backend.md
  - references/08-database-schema.md
  - references/09-react-native-structure.md
  - references/10-ui-design-rules.md
  - references/11-testing-guide.md
---

# AgriMachine Controller — Master Skill

## Purpose

This skill drives the development of the **AgriMachine Controller**, a purpose-built mobile ground control station (GCS) for an agricultural machine. It is a farmer-facing app — not a drone pilot tool. Every screen, label, button, and flow must be understandable by a farmer with no UAV or software background.

Read this file first. Then read the reference file(s) relevant to the task you are building.

---

## The Golden Rule

> *Every design decision must pass this test: can a farmer who has never used Mission Planner or QGroundControl understand this screen within 30 seconds?*

If the answer is no, redesign it. No raw MAVLink IDs, no technical jargon, no hidden menus.

---

## Technology Choices

| Layer | Choice | Reason |
|---|---|---|
| Mobile | React Native (Expo) + TypeScript | Cross-platform Android/iOS, large ecosystem, Expo simplifies build |
| Map | react-native-maps | Native maps with polyline/polygon drawing |
| MAVLink | Custom UDP socket via `react-native-udp` | Direct MAVLink 2 parsing in JS/TS |
| Backend | FastAPI (Python 3.11+) | Async, fast, auto-generates OpenAPI docs |
| DB | MySQL 8 + SQLAlchemy 2 (async) + Alembic | Relational, migrations tracked |
| State | Zustand | Lightweight, no boilerplate |
| Networking | Axios + custom WebSocket for live telemetry relay | REST for config, WS for real-time |

> **Why not fork QGroundControl (Qt/C++)?**
> The spec originally targets a QGC fork. We adapt to React Native because: faster iteration, TypeScript safety, shared codebase for Android/iOS, and a far larger talent pool for future maintenance. The MAVLink protocol layer is identical regardless of the UI framework.

---

## Hardware Communication Chain (MUST understand before writing any comms code)

```
React Native App
  │  WiFi UDP :14550   MAVLink 2 frames
DroneBridge ESP32       ← WiFi access point (SSID: AgriMachine_001)
  │  UART 115200 baud  MAVLink 2 frames
Pixhawk (TELEM1)
  │  UART 57600 baud   MAVLink 2 frames
STM32F405
  ├── Linear Actuator  (PWM + potentiometer feedback)
  ├── Rotary Tiller Relay  (on/off)
  └── Pump Relay       (on/off)
```

See `references/01-architecture.md` for full details.

---

## Reference File Index

| File | Read When |
|---|---|
| `01-architecture.md` | Starting any comms or protocol work |
| `02-mavlink-commands.md` | Sending or receiving ANY MAVLink message |
| `03-dronebridge-setup.md` | Configuring hardware / DroneBridge |
| `04-telemetry-dashboard.md` | Building the status dashboard tiles |
| `05-mission-planning.md` | Field path drawing or mission upload |
| `06-realtime-controls.md` | Implement depth slider, tiller/pump buttons, E-stop |
| `07-fastapi-backend.md` | Any backend route, service, or model |
| `08-database-schema.md` | Any DB table, migration, or query |
| `09-react-native-structure.md` | Project layout, navigation, state management |
| `10-ui-design-rules.md` | Any screen, component, or layout work |
| `11-testing-guide.md` | Unit tests, bench testing, field test sequence |

---

## Development Order (follow this sequence)

1. Set up Expo project + project structure (`09-react-native-structure.md`)
2. Set up FastAPI project + DB + Alembic migrations (`07-fastapi-backend.md`, `08-database-schema.md`)
3. Implement MAVLink UDP socket layer — connect to DroneBridge (`02-mavlink-commands.md`, `03-dronebridge-setup.md`)
4. Build Connection Screen — machine discovery + status (`09-react-native-structure.md`)
5. Build Telemetry Dashboard (`04-telemetry-dashboard.md`)
6. Build Real-Time Control Panel — tiller, pump, depth, E-stop (`06-realtime-controls.md`)
7. Build Field Planner / Mission Planning (`05-mission-planning.md`)
8. Integrate backend persistence (missions, logs) (`07-fastapi-backend.md`)
9. Farmer usability pass — apply UI rules throughout (`10-ui-design-rules.md`)
10. Testing (`11-testing-guide.md`)

---

## Vocabulary Map (always use the right-hand column in the UI)

| Engineering Term | Farmer-Facing Label |
|---|---|
| Mission / Plan | Field Plan |
| Waypoint | Work Point |
| Vehicle / UAV | Machine |
| Arm / Disarm | Start Engine / Stop Engine |
| RTL | Return to Start |
| Altitude | Height |
| Implement (generic) | Tool / Implement |
| COMMAND_LONG | (never shown to user) |
| MAVLink | (never shown to user) |
| UDP / WiFi | Connection |

---

## Critical Safety Rules (enforce in every PR)

- Emergency Stop button MUST be visible on every operational screen. Never hide it behind a menu.
- If MAVLink connection is lost, all telemetry tiles must show `--` immediately. Never display stale values.
- Mission Start must be disabled when GPS fix is absent or E-stop is active.
- No screen may display raw MAVLink message IDs or parameter names to the user.
- The depth slider sends its command ONLY on release (not on drag) to avoid rapid actuator commands.