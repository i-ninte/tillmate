# Reference 01 — System Architecture

## Overview

The AgriMachine Controller is a four-node system. Every engineer on this project must understand the full chain before touching any communication code.

---

## Hardware Nodes

| Node | Role |
|---|---|
| Smartphone / Tablet | Runs the React Native app. Operator interface for mission planning and real-time control. |
| DroneBridge ESP32 | WiFi-to-UART bridge. Connects to Pixhawk TELEM1 port and creates a WiFi hotspot the phone joins. |
| Pixhawk Flight Controller | Runs ArduPilot or PX4. Manages GPS navigation, waypoint execution, and MAVLink routing. |
| STM32F405RGT6 | Custom microcontroller. Controls the linear actuator, rotary tiller relay, and pump relay. |

---

## Communication Chain

```
React Native App (UDP :14550, MAVLink 2)
        │
        │  WiFi 802.11 b/g/n (2.4 GHz)
        │  DroneBridge ESP32 acts as Access Point
        │  SSID: AgriMachine_001  (or machine serial)
        │
DroneBridge ESP32
        │
        │  UART 115200 baud, MAVLink 2
        │
Pixhawk TELEM1 (JST-GH 6-pin: VCC, TX, RX, CTS, RTS, GND)
        │
        │  UART 57600 baud, MAVLink 2
        │
STM32F405RGT6
        ├── Linear Actuator  PWM drive + potentiometer ADC feedback
        ├── Rotary Tiller    Relay (digital out)
        └── Pump             Relay (digital out)
```

---

## Protocol Layers

| Layer | Protocol | Detail |
|---|---|---|
| Application | MAVLink 2 | All commands and telemetry. Same end-to-end. |
| Transport (wireless) | UDP / WiFi 802.11 | Phone → ESP32. Port 14550. |
| Transport (wired) | UART serial | ESP32 → Pixhawk → STM32. |
| Physical | 2.4 GHz WiFi | DroneBridge ESP32 is the AP. |

---

## Data Flow Directions

### Downlink (App → Machine)
- Mission upload: `MISSION_ITEM_INT` sequence
- Real-time commands: `COMMAND_LONG` (relay and servo)
- Heartbeat: sent by app at 1 Hz to keep connection alive

### Uplink (Machine → App)
- Pixhawk telemetry: `BATTERY_STATUS`, `GPS_RAW_INT`, `VFR_HUD`, `SCALED_IMU`, `HEARTBEAT`
- STM32 telemetry: `NAMED_VALUE_FLOAT` (MACH_TEMP, IMPL_DEPTH), `NAMED_VALUE_INT` (ESTOP, MODE)

---

## Component IDs

MAVLink routes messages by system ID + component ID.

| Node | sys_id | comp_id |
|---|---|---|
| App (GCS) | 255 | 190 (MAV_COMP_ID_MISSIONPLANNER) |
| Pixhawk | 1 | 1 (MAV_COMP_ID_AUTOPILOT1) |
| STM32 | 1 | 42 (custom — unique on the bus) |

> The STM32 shares system ID 1 with the Pixhawk (same vehicle). Pixhawk forwards messages it doesn't own transparently. The app disambiguates STM32 messages by component ID 42.

---

## React Native UDP Socket Architecture

```
MavlinkService (singleton)
  ├── UdpSocket (react-native-udp)  ← binds :14550, receives raw bytes
  ├── MavlinkParser                 ← parses raw bytes → MavlinkMessage objects
  ├── MessageDispatcher             ← routes by msg_id to registered handlers
  └── CommandSender                 ← serializes and sends COMMAND_LONG / MISSION_ITEM_INT

Zustand Store
  ├── telemetry slice               ← updated by MessageDispatcher
  ├── mission slice                 ← mission items, upload state
  └── connection slice              ← connected bool, last heartbeat time
```

---

## FastAPI Backend Role

The FastAPI backend is NOT in the MAVLink data path. The phone talks to the Pixhawk directly over UDP. The backend handles:

- Persisting field plans (missions) to MySQL
- Storing telemetry logs for post-session review
- User/machine configuration (machine serial → SSID mapping)
- Serving mission data when the app is not in WiFi range of the machine

The backend connects to the app via REST (Axios) and optionally WebSocket for pushing historical data.

---

## Key Pixhawk Parameters (set once during hardware setup)

| Parameter | Value | Meaning |
|---|---|---|
| SERIAL1_BAUD | 115 | 115200 baud on TELEM1 |
| SERIAL1_PROTOCOL | 2 | MAVLink 2 |
| BATT_MONITOR | 8 | DroneCAN / UAVCAN BMS |
| SR1_EXTRA1 | 2 | ATTITUDE @ 2 Hz |
| SR1_EXTRA3 | 2 | BATTERY @ 2 Hz |
| SR1_POSITION | 2 | GPS @ 2 Hz |