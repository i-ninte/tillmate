# Reference 02 — MAVLink Commands

## MAVLink 2 Fundamentals

All communication uses MAVLink 2. Key properties:
- Framing: `0xFD` magic byte start
- Signed packets supported (use for production)
- All multi-byte fields little-endian

---

## Message Types Used

### Downlink (App sends)

| Message | ID | When Used |
|---|---|---|
| HEARTBEAT | 0 | Sent every 1 s to keep link alive |
| COMMAND_LONG | 76 | Real-time commands |
| MISSION_COUNT | 44 | Starts mission upload handshake |
| MISSION_ITEM_INT | 73 | Individual mission items |
| MISSION_CLEAR_ALL | 45 | Wipe existing mission from Pixhawk |
| MISSION_SET_CURRENT | 41 | Jump to a mission item |

### Uplink (App receives)

| Message | ID | Source |
|---|---|---|
| HEARTBEAT | 0 | Pixhawk + STM32 |
| BATTERY_STATUS | 147 | Pixhawk (from CAN BMS) |
| GPS_RAW_INT | 24 | Pixhawk |
| VFR_HUD | 74 | Pixhawk |
| SCALED_IMU | 26 | Pixhawk |
| MISSION_ACK | 47 | Pixhawk (mission upload result) |
| MISSION_REQUEST_INT | 51 | Pixhawk (requests next item) |
| NAMED_VALUE_FLOAT | 251 | STM32 (comp_id 42) |
| NAMED_VALUE_INT | 252 | STM32 (comp_id 42) |

---

## COMMAND_LONG Reference

All real-time commands use `COMMAND_LONG` (msg ID 76). Params not listed should be 0.

### Implement Height/Depth — Linear Actuator

Uses servo passthrough on channel 9 (Pixhawk → STM32 mapped).

| Field | Value |
|---|---|
| command | 183 (MAV_CMD_DO_SET_SERVO) |
| param1 | 9 (servo channel) |
| param2 | 1000–2000 (PWM µs) |

PWM mapping:
- `1000` → Fully raised (0 mm depth)
- `1500` → Mid position
- `2000` → Fully lowered (max working depth)

```typescript
// TypeScript helper
function buildSetImplementDepth(depthPercent: number): CommandLong {
  // depthPercent: 0 (raised) to 100 (fully lowered)
  const pwm = Math.round(1000 + (depthPercent / 100) * 1000);
  return {
    command: 183,
    param1: 9,   // servo channel
    param2: pwm,
    param3: 0, param4: 0, param5: 0, param6: 0, param7: 0,
    target_system: 1,
    target_component: 1,
    confirmation: 0,
  };
}
```

### Rotary Tiller Control

| Field | Value |
|---|---|
| command | 181 (MAV_CMD_DO_SET_RELAY) |
| param1 | 0 (relay index = tiller) |
| param2 | 1 = ON, 0 = OFF |

```typescript
function buildSetTiller(on: boolean): CommandLong {
  return { command: 181, param1: 0, param2: on ? 1 : 0,
           param3:0, param4:0, param5:0, param6:0, param7:0,
           target_system: 1, target_component: 1, confirmation: 0 };
}
```

### Pump Control

| Field | Value |
|---|---|
| command | 181 (MAV_CMD_DO_SET_RELAY) |
| param1 | 1 (relay index = pump) |
| param2 | 1 = ON, 0 = OFF |

```typescript
function buildSetPump(on: boolean): CommandLong {
  return { command: 181, param1: 1, param2: on ? 1 : 0,
           param3:0, param4:0, param5:0, param6:0, param7:0,
           target_system: 1, target_component: 1, confirmation: 0 };
}
```

### Emergency Stop

Sends ALL THREE commands in rapid succession. Never combine into one.

```typescript
async function sendEmergencyStop(sender: CommandSender) {
  await sender.send(buildSetTiller(false));
  await sender.send(buildSetPump(false));
  await sender.send(buildSetImplementDepth(0));  // PWM 1000 = raised
}
```

---

## MISSION_ITEM_INT Reference

Used for pre-planned field missions. Each item has a `seq` (sequence number starting at 0), `command`, and params.

### Mission Item: Navigate to Work Point

```typescript
{
  seq: N,
  command: 16,   // MAV_CMD_NAV_WAYPOINT
  frame: 3,      // MAV_FRAME_GLOBAL_RELATIVE_ALT
  param1: 0,     // hold time seconds
  param2: 0.5,   // acceptance radius meters
  param3: 0,
  param4: NaN,   // yaw - NaN = don't change
  x: lat_degE7,  // latitude * 1e7
  y: lon_degE7,  // longitude * 1e7
  z: 0,          // altitude (0 = ground level, relative)
  autocontinue: 1,
  current: 0,
}
```

### Mission Item: Lower Implement

```typescript
{
  seq: N,
  command: 183,   // MAV_CMD_DO_SET_SERVO
  param1: 9,      // channel
  param2: 1800,   // PWM (80% down — calibrate per machine)
  ...zeros,
  autocontinue: 1,
}
```

### Mission Item: Raise Implement

Same as above with `param2: 1000`.

### Mission Item: Tiller ON

```typescript
{ seq: N, command: 181, param1: 0, param2: 1, ...zeros, autocontinue: 1 }
```

### Mission Item: Tiller OFF

```typescript
{ seq: N, command: 181, param1: 0, param2: 0, ...zeros, autocontinue: 1 }
```

### Mission Item: Pump ON / OFF

Same as tiller but `param1: 1`.

---

## Mission Operation Ordering Rule

**DO commands placed BEFORE a NAV_WAYPOINT run when that sequence number is reached. DO commands placed AFTER a NAV_WAYPOINT run on arrival.**

Correct sequence for "work while travelling to point, stop on arrival":

```
seq 0: DO_SET_SERVO ch9 PWM=1800   → lower implement
seq 1: DO_SET_RELAY relay=0 ON     → tiller ON
seq 2: DO_SET_RELAY relay=1 ON     → pump ON
seq 3: NAV_WAYPOINT lat/lng        → travel (operations stay active)
seq 4: DO_SET_RELAY relay=0 OFF    → tiller OFF on arrival
seq 5: DO_SET_RELAY relay=1 OFF    → pump OFF
seq 6: DO_SET_SERVO ch9 PWM=1000   → raise implement
```

---

## Mission Upload Handshake (MAVLink protocol)

```
App → Pixhawk: MISSION_CLEAR_ALL
App → Pixhawk: MISSION_COUNT (count = total items)
Pixhawk → App: MISSION_REQUEST_INT (seq = 0)
App → Pixhawk: MISSION_ITEM_INT (seq = 0)
Pixhawk → App: MISSION_REQUEST_INT (seq = 1)
...repeat until all items sent...
Pixhawk → App: MISSION_ACK (type = 0 = MAV_MISSION_ACCEPTED)
```

Timeout: If no `MISSION_REQUEST_INT` is received within 3 s, retry the last item. Abort after 5 retries.

---

## NAMED_VALUE Messages (STM32 Telemetry)

### NAMED_VALUE_FLOAT (msg ID 251)

| Key (name[10]) | Value | Units |
|---|---|---|
| `MACH_TEMP` | float | °C — DS18B20 machine temperature |
| `IMPL_DEPTH` | float | cm — actuator depth from potentiometer |

### NAMED_VALUE_INT (msg ID 252)

| Key (name[10]) | Value |
|---|---|
| `ESTOP` | 0 = clear, 1 = stop active |
| `MODE` | 0 = MANUAL, 1 = AUTO |

STM32 sends at 2 Hz. Treat data as stale if not received within 3 s.

---

## TypeScript MAVLink Types

```typescript
// types/mavlink.ts

export interface CommandLong {
  target_system: number;
  target_component: number;
  command: number;
  confirmation: number;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  param5: number;
  param6: number;
  param7: number;
}

export interface MissionItemInt {
  target_system: number;
  target_component: number;
  seq: number;
  frame: number;
  command: number;
  current: number;
  autocontinue: number;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  x: number;  // lat degE7
  y: number;  // lon degE7
  z: number;
}

export interface Telemetry {
  batteryVoltageV: number | null;
  batteryPercent: number | null;
  gpsFixed: boolean;
  latDeg: number | null;
  lonDeg: number | null;
  speedKmh: number | null;
  pixhawkTempC: number | null;
  machineTempC: number | null;
  implementDepthCm: number | null;
  eStopActive: boolean;
  mode: 'AUTO' | 'MANUAL' | null;
  lastHeartbeatMs: number | null;
}
```