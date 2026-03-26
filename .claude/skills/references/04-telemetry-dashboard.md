# Reference 04 — Telemetry Dashboard

## Overview

The dashboard is a persistent status bar shown at the top of the **Field View** screen at all times during operation. It must be:
- Readable in direct sunlight
- Understandable at arm's length
- Updated in real time from MAVLink telemetry
- Never showing stale data (show `--` if connection lost)

---

## Dashboard Layout

Three rows. Design each tile as a fixed-size card with a small label at top and large value below.

```
Row 1 (Critical):    [ STOP STATE ]  [ MODE ]
Row 2 (Power/Env):   [ BATTERY ]  [ CONTROLLER TEMP ]  [ MACHINE TEMP ]
Row 3 (Field Data):  [ GPS ]  [ SPEED ]  [ DEPTH ]
```

Minimum tile size: **100 × 70 dp**. Value font: **20 sp bold**. Label font: **11 sp regular, grey**.

---

## Tile Specifications

### STOP STATE
- Source: `NAMED_VALUE_INT` key `ESTOP` from STM32 (comp_id 42)
- Normal: grey background, text `CLEAR`
- Alert: red background, white text `STOP ACTIVE`, flash at 1 Hz

### MODE
- Source: `NAMED_VALUE_INT` key `MODE` from STM32
- `1` → blue tile, text `AUTONOMOUS`
- `0` → yellow tile, text `MANUAL`

### BATTERY
- Source: `BATTERY_STATUS` (msg 147) from Pixhawk
- Field: `voltages[0]` in millivolts → divide by 1000 → display as `XX.X V`
- Also show `battery_remaining` as `XX%`
- Green if > 48 V | Yellow if 44–48 V | Red + ⚠ icon if < 44 V

### CONTROLLER TEMP (Pixhawk IMU)
- Source: `SCALED_IMU` (msg 26)
- Field: `temperature` in centidegrees → divide by 100 → `XX.X °C`
- Throttle display to 1 Hz (50 Hz message rate)
- Orange if > 70 °C

### MACHINE TEMP (DS18B20 via STM32)
- Source: `NAMED_VALUE_FLOAT` key `MACH_TEMP` from STM32 (comp_id 42)
- Display: `XX.X °C`
- Orange if > 60 °C (engine bay threshold — calibrate per machine)

### GPS
- Source: `GPS_RAW_INT` (msg 24)
- Fields: `fix_type`, `lat` (degE7), `lon` (degE7), `satellites_visible`
- `fix_type >= 3` → green tile, `FIX`, show lat/lon to 5 decimal places
- `fix_type < 3` → red tile, `NO FIX`
- **Mission Start button must be disabled when NO FIX**

### SPEED
- Source: `VFR_HUD` (msg 74)
- Field: `groundspeed` in m/s → multiply by 3.6 → `X.X km/h`
- No alert state

### IMPLEMENT DEPTH
- Source: `NAMED_VALUE_FLOAT` key `IMPL_DEPTH` from STM32
- Display: `XX cm`
- No alert state — informational only

---

## MAVLink Subscription Code (React Native)

```typescript
// In MavlinkService — register handlers

parser.on('BATTERY_STATUS', (msg) => {
  const voltV = msg.voltages[0] / 1000.0;
  const pct   = msg.battery_remaining;  // -1 if unknown
  telemetryStore.update({ batteryVoltageV: voltV, batteryPercent: pct });
});

parser.on('SCALED_IMU', (msg) => {
  const tempC = msg.temperature / 100.0;
  telemetryStore.update({ pixhawkTempC: tempC });
});

parser.on('GPS_RAW_INT', (msg) => {
  telemetryStore.update({
    gpsFixed: msg.fix_type >= 3,
    latDeg: msg.lat / 1e7,
    lonDeg: msg.lon / 1e7,
  });
});

parser.on('VFR_HUD', (msg) => {
  telemetryStore.update({ speedKmh: msg.groundspeed * 3.6 });
});

parser.on('NAMED_VALUE_FLOAT', (msg) => {
  const key = msg.name.replace(/\0/g, '').trim();
  if (key === 'MACH_TEMP')   telemetryStore.update({ machineTempC: msg.value });
  if (key === 'IMPL_DEPTH')  telemetryStore.update({ implementDepthCm: msg.value });
});

parser.on('NAMED_VALUE_INT', (msg) => {
  const key = msg.name.replace(/\0/g, '').trim();
  if (key === 'ESTOP')  telemetryStore.update({ eStopActive: msg.value === 1 });
  if (key === 'MODE')   telemetryStore.update({ mode: msg.value === 1 ? 'AUTO' : 'MANUAL' });
});
```

---

## React Native Component Sketch

```tsx
// components/dashboard/DashTile.tsx
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface DashTileProps {
  label: string;
  value: string;
  backgroundColor: string;
  flash?: boolean;
  valueColor?: string;
}

export function DashTile({ label, value, backgroundColor, flash = false, valueColor = '#fff' }: DashTileProps) {
  // flash logic: useEffect + Animated.loop when flash=true
  return (
    <View style={[styles.tile, { backgroundColor }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { minWidth: 100, minHeight: 70, borderRadius: 8, padding: 8, margin: 4, justifyContent: 'space-between' },
  label: { fontSize: 11, color: '#ccc', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 20, fontWeight: 'bold' },
});
```

```tsx
// components/dashboard/FarmDashboard.tsx
import React from 'react';
import { View, ScrollView } from 'react-native';
import { useTelemetryStore } from '../../store/telemetryStore';
import { DashTile } from './DashTile';

export function FarmDashboard() {
  const t = useTelemetryStore();
  const connected = useConnectionStore(s => s.connected);

  const fmt = (v: number | null, decimals = 1, unit = '') =>
    connected && v !== null ? `${v.toFixed(decimals)}${unit}` : '--';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', padding: 8 }}>
        {/* Row 1 */}
        <DashTile
          label="STOP"
          value={connected ? (t.eStopActive ? 'ACTIVE' : 'CLEAR') : '--'}
          backgroundColor={t.eStopActive ? '#c62828' : '#424242'}
          flash={t.eStopActive}
        />
        <DashTile
          label="MODE"
          value={connected ? (t.mode ?? '--') : '--'}
          backgroundColor={t.mode === 'AUTO' ? '#1565C0' : '#F9A825'}
        />
        {/* Row 2 */}
        <DashTile
          label="Battery"
          value={fmt(t.batteryVoltageV, 1, ' V')}
          backgroundColor={
            !t.batteryVoltageV ? '#333' :
            t.batteryVoltageV < 44 ? '#c62828' :
            t.batteryVoltageV < 48 ? '#e65100' : '#2e7d32'
          }
        />
        <DashTile
          label="Controller"
          value={fmt(t.pixhawkTempC, 1, ' °C')}
          backgroundColor={(t.pixhawkTempC ?? 0) > 70 ? '#e65100' : '#333'}
        />
        <DashTile
          label="Machine Temp"
          value={fmt(t.machineTempC, 1, ' °C')}
          backgroundColor={(t.machineTempC ?? 0) > 60 ? '#e65100' : '#333'}
        />
        {/* Row 3 */}
        <DashTile
          label="GPS"
          value={connected ? (t.gpsFixed ? 'FIX' : 'NO FIX') : '--'}
          backgroundColor={t.gpsFixed ? '#2e7d32' : '#c62828'}
        />
        <DashTile
          label="Speed"
          value={fmt(t.speedKmh, 1, ' km/h')}
          backgroundColor="#333"
        />
        <DashTile
          label="Depth"
          value={fmt(t.implementDepthCm, 0, ' cm')}
          backgroundColor="#333"
        />
      </View>
    </ScrollView>
  );
}
```

---

## Safety Rules

1. **Emergency Stop tile is always rendered first** — never pushed off screen by overflow
2. **On connection loss**: call `telemetryStore.clearAll()` immediately — sets all values to `null`
3. `fmt()` helper returns `'--'` when `connected` is false OR value is null
4. Dashboard refresh: throttle Zustand re-renders to 2 Hz using a `useInterval` hook to avoid jitter
5. **Mission Start button** is disabled (greyed, non-pressable) if `!gpsFixed || eStopActive || !connected`