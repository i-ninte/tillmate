# Reference 11 — Testing Guide

## Testing Layers

| Layer | Tool | Scope |
|---|---|---|
| Unit | Jest + ts-jest | MAVLink builders, mission compiler, unit converters |
| Integration | pytest + httpx | FastAPI routes, DB operations |
| Bench | Physical hardware | MAVLink communication, command delivery |
| Usability | Real farmer | UI clarity, task completion time |
| Field | Machine in field | Full end-to-end system |

---

## Unit Tests (React Native / TypeScript)

### MAVLink Builder Tests

```typescript
// __tests__/mavlinkBuilders.test.ts
import { buildSetImplementDepth, buildSetTiller, buildSetPump, buildSetRelay } from '../utils/mavlinkBuilders';

describe('buildSetImplementDepth', () => {
  it('maps 0% to PWM 1000 (raised)', () => {
    const cmd = buildSetImplementDepth(0);
    expect(cmd.command).toBe(183);
    expect(cmd.param1).toBe(9);    // servo channel
    expect(cmd.param2).toBe(1000); // PWM
  });

  it('maps 100% to PWM 2000 (fully lowered)', () => {
    const cmd = buildSetImplementDepth(100);
    expect(cmd.param2).toBe(2000);
  });

  it('maps 50% to PWM 1500', () => {
    const cmd = buildSetImplementDepth(50);
    expect(cmd.param2).toBe(1500);
  });
});

describe('buildSetTiller', () => {
  it('ON command', () => {
    const cmd = buildSetTiller(true);
    expect(cmd.command).toBe(181);
    expect(cmd.param1).toBe(0);   // relay 0 = tiller
    expect(cmd.param2).toBe(1);   // ON
  });

  it('OFF command', () => {
    expect(buildSetTiller(false).param2).toBe(0);
  });
});

describe('buildSetPump', () => {
  it('uses relay index 1', () => {
    expect(buildSetPump(true).param1).toBe(1);   // relay 1 = pump
  });
});
```

### Mission Compiler Tests

```typescript
// __tests__/missionCompiler.test.ts
import { compileMission } from '../services/missionCompiler';

const basicPlan = {
  id: 'test-plan-1',
  name: 'Test',
  createdAt: new Date().toISOString(),
  workPoints: [
    { id: 'wp1', seq: 0, lat: 5.6037, lon: -0.1870, label: 'Work Point 1',
      operation: { implementState: 'lowered', tillerOn: true, pumpOn: false } },
    { id: 'wp2', seq: 1, lat: 5.6040, lon: -0.1875, label: 'Work Point 2',
      operation: { implementState: 'raised', tillerOn: false, pumpOn: false } },
  ],
};

describe('compileMission', () => {
  it('produces correct operation sequence for lowered + tiller ON', () => {
    const items = compileMission(basicPlan);
    // Before first waypoint: lower implement (1800), tiller ON, pump OFF
    const servoItem = items.find(i => i.command === 183 && i.seq > 0);
    expect(servoItem?.param2).toBe(1800);

    const tillerOnItem = items.find(i => i.command === 181 && i.param1 === 0 && i.param2 === 1);
    expect(tillerOnItem).toBeDefined();
  });

  it('sequences DO commands before NAV_WAYPOINT', () => {
    const items = compileMission(basicPlan);
    const navSeqs = items.filter(i => i.command === 16).map(i => i.seq);
    const servoBeforeNavSeqs = items.filter(i => i.command === 183 && i.seq < navSeqs[1]).map(i => i.seq);
    expect(servoBeforeNavSeqs.length).toBeGreaterThan(0);
  });

  it('turns off operations after each waypoint', () => {
    const items = compileMission(basicPlan);
    const tillerOffItems = items.filter(i => i.command === 181 && i.param1 === 0 && i.param2 === 0);
    expect(tillerOffItems.length).toBeGreaterThan(0);
  });
});
```

---

## Backend Tests (pytest)

```python
# backend/tests/test_missions.py
import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.asyncio
async def test_create_and_retrieve_field_plan():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register a machine first
        machine_res = await client.post("/api/v1/machines/", json={
            "serial_number": "TEST001",
            "display_name": "Test Machine",
            "wifi_ssid": "AgriMachine_TEST001",
        })
        assert machine_res.status_code == 201
        machine_id = machine_res.json()["id"]

        # Create field plan
        plan_res = await client.post("/api/v1/missions/", json={
            "machine_id": machine_id,
            "name": "North Field Pass",
            "work_points": [
                {"seq": 0, "lat": 5.6037, "lon": -0.1870,
                 "implement_lowered": True, "tiller_on": True, "pump_on": False,
                 "label": "Work Point 1"},
            ],
        })
        assert plan_res.status_code == 201
        plan_id = plan_res.json()["id"]

        # Retrieve
        get_res = await client.get(f"/api/v1/missions/{plan_id}")
        assert get_res.status_code == 200
        assert get_res.json()["name"] == "North Field Pass"
        assert len(get_res.json()["work_points"]) == 1

@pytest.mark.asyncio
async def test_telemetry_batch_insert():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/v1/telemetry/logs", json=[
            {"machine_id": 1, "session_id": "abc-123",
             "recorded_at": "2025-01-01T10:00:00",
             "battery_voltage_v": 51.2, "gps_fixed": True,
             "lat": 5.6037, "lon": -0.1870},
        ])
        assert res.status_code == 201
        assert res.json()["inserted"] == 1
```

---

## Bench Testing Sequence (Physical Hardware — No Machine Required)

Perform in this order before any field test:

1. **Power up**: Connect DroneBridge ESP32 to Pixhawk via UART. Power both from bench supply.
2. **WiFi join**: Connect Android device to `AgriMachine_001` WiFi network.
3. **Heartbeat test**: Open app. Confirm `Connected` state appears within 5 s.
4. **Telemetry test**: Confirm all dashboard tiles populate (not `--`). Verify:
   - Battery voltage reads from BMS (if connected) or test with BATTERY_STATUS inject
   - GPS tile shows fix type
   - Controller temp reads
5. **Implement command test**: Move depth slider to 50% and release. In QGC MAVLink Inspector on a laptop connected to same WiFi, verify `COMMAND_LONG` with `command=183, param1=9, param2=1500` is received.
6. **Relay command test**: Tap Tiller ON. Verify `COMMAND_LONG` with `command=181, param1=0, param2=1`.
7. **Pump command test**: Same for pump — `param1=1`.
8. **Emergency Stop test**: Tap E-Stop. Verify three commands sent in sequence within 200 ms.
9. **Mission upload test**: Create a 2-Work-Point plan. Send to machine. Verify `MISSION_ACK type=0` received.
10. **Stale data test**: Power off Pixhawk. Confirm all dashboard tiles show `--` within 5 s.

---

## Farmer Usability Test Protocol

Run with an actual farmer (not an engineer). No instruction before each task.

| Task | Success Criteria |
|---|---|
| Draw a 3-point field path and set tiller ON between points | Completed < 5 minutes |
| Identify Emergency Stop button | Points to it immediately without asking |
| Interpret the connection status | Explains connected/disconnected correctly |
| Start the machine on a saved field plan | Completes without encountering MAVLink terms |
| Explain what the Depth tile shows | Gives roughly correct answer ("how deep the tool goes") |

**Failure criterion**: If any screen shows raw technical terms (MAVLink, UART, param1, etc.) and the farmer is confused, it is a blocking bug.

---

## Field Testing Sequence

Run in this exact order:

1. Emergency Stop test — verify all implements stop immediately (do this FIRST, every session)
2. Real-time panel — tiller, pump, and implement depth respond to manual commands
3. Single-segment mission — 2 Work Points, tiller ON between, OFF at destination
4. Full field pass — 5+ Work Points, mixed operations
5. WiFi range test — walk away from machine until connection drops; confirm app shows `Connection Lost` banner clearly; confirm no dangerous commands sent after loss
6. Recovery test — reconnect after range loss; confirm telemetry repopulates correctly

---

## MAVLink Inspector Setup (for bench testing)

Install QGroundControl on a laptop and connect it to the same WiFi as the DroneBridge. QGC auto-discovers on UDP :14550. Use the MAVLink Inspector (Analyze menu → MAVLink Inspector) to verify incoming message IDs and payload values match what the app sends.

For cross-validation, also use `mavproxy.py`:
```bash
pip install mavproxy
mavproxy.py --master=udpout:192.168.2.1:14550 --out=udp:127.0.0.1:14551
```