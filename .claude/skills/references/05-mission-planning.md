# Reference 05 — Mission Planning (Field Planner)

## Screen Name: Field Planner (never "Mission Planner")

---

## User Flow

```
1. Farmer opens Field Planner
2. Map shows current GPS position (center)
3. Farmer taps to place Work Points on the field
4. For each Work Point, a panel slides up showing:
   - Implement: [Raised] [Lowered] toggle
   - Tiller: [OFF] [ON]
   - Pump: [OFF] [ON]
5. Farmer taps "Save Field Plan" → stored to backend (FastAPI/MySQL)
6. Farmer taps "Send to Machine" → MAVLink mission upload
7. "Start" button on Field View → MISSION_SET_CURRENT 0 + mode AUTO
```

---

## Map Library

Use `react-native-maps` with `MapView` in satellite mode (better for fields).

```tsx
<MapView
  mapType="satellite"
  showsUserLocation
  followsUserLocation
  onPress={(e) => handleMapTap(e.nativeEvent.coordinate)}
>
  {workPoints.map((wp, i) => (
    <Marker
      key={wp.id}
      coordinate={{ latitude: wp.lat, longitude: wp.lon }}
      title={`Work Point ${i + 1}`}
      pinColor="#FF6F00"
    />
  ))}
  <Polyline
    coordinates={workPoints.map(wp => ({ latitude: wp.lat, longitude: wp.lon }))}
    strokeColor="#FF6F00"
    strokeWidth={3}
  />
</MapView>
```

---

## Work Point Data Model

```typescript
// types/mission.ts

export interface WorkPointOperation {
  implementState: 'raised' | 'lowered';
  tillerOn: boolean;
  pumpOn: boolean;
}

export interface WorkPoint {
  id: string;           // uuid
  seq: number;          // display order
  lat: number;
  lon: number;
  operation: WorkPointOperation;
  label: string;        // e.g. "Work Point 3"
}

export interface FieldPlan {
  id: string;
  name: string;
  createdAt: string;
  workPoints: WorkPoint[];
}
```

---

## Work Point Editor Panel

Slides up from bottom when a Work Point is tapped. Large touch targets — glove-friendly.

```tsx
// components/mission/WorkPointEditor.tsx
export function WorkPointEditor({ workPoint, onUpdate, onDelete }: Props) {
  return (
    <BottomSheet>
      <Text style={styles.title}>{workPoint.label}</Text>

      {/* Implement toggle */}
      <Row label="Implement">
        <SegmentedControl
          values={['Raised', 'Lowered']}
          selected={workPoint.operation.implementState === 'lowered' ? 1 : 0}
          onChange={(i) => onUpdate({ implementState: i === 1 ? 'lowered' : 'raised' })}
        />
      </Row>

      {/* Tiller toggle */}
      <Row label="Tiller">
        <BigToggle
          on={workPoint.operation.tillerOn}
          onLabel="ON"
          offLabel="OFF"
          onChange={(v) => onUpdate({ tillerOn: v })}
        />
      </Row>

      {/* Pump toggle */}
      <Row label="Pump">
        <BigToggle
          on={workPoint.operation.pumpOn}
          onLabel="ON"
          offLabel="OFF"
          onChange={(v) => onUpdate({ pumpOn: v })}
        />
      </Row>

      <DeleteButton onPress={onDelete} />
    </BottomSheet>
  );
}
```

---

## Mission Item Compiler

Converts `FieldPlan` (farmer's selections) into the flat `MissionItemInt[]` array for MAVLink upload.

```typescript
// services/missionCompiler.ts

import { FieldPlan, WorkPoint } from '../types/mission';
import { MissionItemInt } from '../types/mavlink';

const TARGET_SYS = 1;
const TARGET_COMP = 0;

export function compileMission(plan: FieldPlan): MissionItemInt[] {
  const items: MissionItemInt[] = [];
  let seq = 0;

  // Item 0 must always be a NAV_WAYPOINT (MAVLink requirement)
  // Use first work point as home/start
  const first = plan.workPoints[0];
  if (!first) return [];

  // Dummy home item (seq 0)
  items.push(makeNav(seq++, first.lat, first.lon, { current: 1 }));

  for (const wp of plan.workPoints) {
    // Before the waypoint: set operations
    if (wp.operation.implementState === 'lowered') {
      items.push(makeServo(seq++, 1800));   // lower implement
    } else {
      items.push(makeServo(seq++, 1000));   // raise implement
    }
    items.push(makeRelay(seq++, 0, wp.operation.tillerOn));
    items.push(makeRelay(seq++, 1, wp.operation.pumpOn));

    // The waypoint itself
    items.push(makeNav(seq++, wp.lat, wp.lon));

    // After waypoint: stop operations
    items.push(makeRelay(seq++, 0, false));  // tiller OFF on arrival
    items.push(makeRelay(seq++, 1, false));  // pump OFF
    items.push(makeServo(seq++, 1000));      // raise implement
  }

  return items;
}

function base(seq: number, command: number): MissionItemInt {
  return {
    target_system: TARGET_SYS, target_component: TARGET_COMP,
    seq, frame: 3 /* MAV_FRAME_GLOBAL_RELATIVE_ALT */,
    command, current: 0, autocontinue: 1,
    param1: 0, param2: 0, param3: 0, param4: 0,
    x: 0, y: 0, z: 0,
  };
}

function makeNav(seq: number, lat: number, lon: number, overrides: Partial<MissionItemInt> = {}): MissionItemInt {
  return {
    ...base(seq, 16 /* NAV_WAYPOINT */),
    param2: 1.0,  // acceptance radius 1 m
    x: Math.round(lat * 1e7),
    y: Math.round(lon * 1e7),
    ...overrides,
  };
}

function makeServo(seq: number, pwm: number): MissionItemInt {
  return { ...base(seq, 183), param1: 9, param2: pwm };
}

function makeRelay(seq: number, relay: number, on: boolean): MissionItemInt {
  return { ...base(seq, 181), param1: relay, param2: on ? 1 : 0 };
}
```

---

## Mission Upload Service

```typescript
// services/missionUploader.ts

const TIMEOUT_MS = 3000;
const MAX_RETRIES = 5;

export async function uploadMission(
  items: MissionItemInt[],
  sender: MavlinkSender,
  receiver: MavlinkReceiver,
): Promise<'success' | 'failed'> {
  // 1. Clear existing mission
  await sender.send(buildMissionClearAll());
  await sleep(500);

  // 2. Send count
  await sender.send(buildMissionCount(items.length));

  // 3. Respond to requests
  for (let attempt = 0; attempt < items.length + MAX_RETRIES; attempt++) {
    const req = await receiver.waitFor('MISSION_REQUEST_INT', TIMEOUT_MS);
    if (!req) return 'failed';  // timeout

    const seq = req.seq;
    if (seq >= items.length) break;

    await sender.send(buildMissionItemInt(items[seq]));
  }

  // 4. Wait for ACK
  const ack = await receiver.waitFor('MISSION_ACK', TIMEOUT_MS);
  return ack?.type === 0 ? 'success' : 'failed';
}
```

---

## Saving to Backend (FastAPI)

After the farmer taps "Save Field Plan":

```typescript
// api/missions.ts
export async function saveFieldPlan(plan: FieldPlan): Promise<void> {
  await axios.post('/api/v1/missions', plan);
}

export async function loadFieldPlans(): Promise<FieldPlan[]> {
  const res = await axios.get('/api/v1/missions');
  return res.data;
}
```