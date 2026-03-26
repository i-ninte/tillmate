# Reference 06 — Real-Time Control Panel

## Overview

The Real-Time Control Panel is a persistent panel on the **Field View** screen. It sends `COMMAND_LONG` messages immediately — independently of any running mission. It is always visible during operation.

---

## Panel Layout

```
┌─────────────────────────────────────────────────┐
│  IMPLEMENT DEPTH                                 │
│  [════════════════○══════]  42 cm               │
│                                                  │
│  [ TILLER: OFF ]    [ TILLER: ON  ]              │
│  [ PUMP: OFF   ]    [ PUMP: ON    ]              │
│                                                  │
│         ████ EMERGENCY STOP ████                 │
└─────────────────────────────────────────────────┘
```

Buttons minimum height: **72 dp**. Emergency Stop minimum height: **88 dp**, full width, always red.

---

## Components

### Implement Depth Slider

- Full width slider labeled in centimeters (or inches — user preference)
- Sends `MAV_CMD_DO_SET_SERVO` (ch9) **only on release** (`onSlidingComplete`)
- Do NOT send on drag — avoids rapid actuator commands
- Range: 0 (raised) to 100 (max depth — calibrate per machine)
- Maps linearly: 0% → PWM 1000, 100% → PWM 2000

```tsx
// components/controls/DepthSlider.tsx
import Slider from '@react-native-community/slider';

export function DepthSlider({ onDepthCommit }: { onDepthCommit: (pct: number) => void }) {
  const [displayPct, setDisplayPct] = React.useState(0);
  const depth = useTelemetryStore(s => s.implementDepthCm);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>IMPLEMENT DEPTH</Text>
      <View style={styles.row}>
        <Slider
          style={{ flex: 1 }}
          minimumValue={0}
          maximumValue={100}
          step={1}
          value={displayPct}
          onValueChange={setDisplayPct}         // local display only
          onSlidingComplete={onDepthCommit}     // sends MAVLink command
          minimumTrackTintColor="#FF6F00"
          thumbTintColor="#FF6F00"
        />
        <Text style={styles.value}>{depth !== null ? `${depth.toFixed(0)} cm` : `${displayPct}%`}</Text>
      </View>
    </View>
  );
}
```

### Tiller Button

Large two-state toggle. Green when ON, grey when OFF.

```tsx
// components/controls/RelayButton.tsx
interface RelayButtonProps {
  label: string;
  isOn: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
}

export function RelayButton({ label, isOn, onToggle, disabled }: RelayButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.btn, isOn ? styles.btnOn : styles.btnOff, disabled && styles.disabled]}
      onPress={() => !disabled && onToggle(!isOn)}
      activeOpacity={0.7}
      accessibilityLabel={`${label} ${isOn ? 'ON' : 'OFF'}`}
    >
      <Text style={styles.btnLabel}>{label}</Text>
      <Text style={styles.btnState}>{isOn ? 'ON' : 'OFF'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { flex: 1, minHeight: 72, borderRadius: 12, margin: 6, alignItems: 'center', justifyContent: 'center' },
  btnOn: { backgroundColor: '#2e7d32' },
  btnOff: { backgroundColor: '#424242' },
  disabled: { opacity: 0.4 },
  btnLabel: { color: '#ccc', fontSize: 13, textTransform: 'uppercase' },
  btnState: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
});
```

### Emergency Stop Button

Always red, always full width, always visible. Non-dismissable even during mission.

```tsx
// components/controls/EmergencyStopButton.tsx
export function EmergencyStopButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.estop}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityLabel="Emergency Stop"
    >
      <Text style={styles.label}>⛔ EMERGENCY STOP</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  estop: {
    backgroundColor: '#b71c1c',
    minHeight: 88,
    borderRadius: 12,
    marginHorizontal: 6,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  label: { color: '#fff', fontSize: 24, fontWeight: 'bold', letterSpacing: 1 },
});
```

---

## FarmControlPanel Assembly

```tsx
// components/controls/FarmControlPanel.tsx
export function FarmControlPanel() {
  const mavlink = useMavlinkService();

  const handleDepthCommit = (pct: number) => {
    mavlink.sendCommand(buildSetImplementDepth(pct));
  };

  const handleTillerToggle = (on: boolean) => {
    mavlink.sendCommand(buildSetTiller(on));
    controlStore.setTillerOn(on);
  };

  const handlePumpToggle = (on: boolean) => {
    mavlink.sendCommand(buildSetPump(on));
    controlStore.setPumpOn(on);
  };

  const handleEmergencyStop = async () => {
    await sendEmergencyStop(mavlink);
    controlStore.setTillerOn(false);
    controlStore.setPumpOn(false);
    Alert.alert('Emergency Stop Sent', 'All implements stopped and raised.');
  };

  const { tillerOn, pumpOn } = useControlStore();
  const connected = useConnectionStore(s => s.connected);

  return (
    <View style={styles.panel}>
      <DepthSlider onDepthCommit={handleDepthCommit} />

      <View style={styles.row}>
        <RelayButton label="Tiller" isOn={tillerOn} onToggle={handleTillerToggle} disabled={!connected} />
        <RelayButton label="Pump"   isOn={pumpOn}   onToggle={handlePumpToggle}   disabled={!connected} />
      </View>

      <EmergencyStopButton onPress={handleEmergencyStop} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 12, margin: 8 },
  row: { flexDirection: 'row' },
});
```

---

## Command Sending Notes

- Each `COMMAND_LONG` is sent once. No ACK is required for relay/servo commands in normal operation.
- Emergency Stop sends 3 commands back-to-back with a 50 ms delay between each for reliability.
- If `connected` is false, disable all controls (except Emergency Stop is always pressable — it may still be in queue).
- Log each command to Zustand `commandLog` store for post-session review via backend.

---

## Control State Persistence

Store last-known control state in Zustand so the UI reflects actual state across screen navigation:

```typescript
// store/controlStore.ts
interface ControlState {
  tillerOn: boolean;
  pumpOn: boolean;
  implementDepthPct: number;
  setTillerOn: (v: boolean) => void;
  setPumpOn: (v: boolean) => void;
  setDepthPct: (v: number) => void;
}
```

> Note: This reflects what was **commanded**, not what was confirmed by hardware. The actual depth confirmation comes from `IMPL_DEPTH` telemetry in the dashboard.