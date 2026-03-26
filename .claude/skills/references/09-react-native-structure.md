# Reference 09 — React Native Project Structure

## Bootstrap

```bash
npx create-expo-app@latest agrimachine --template blank-typescript
cd agrimachine
```

## Core Dependencies

```bash
# Navigation
npx expo install expo-router

# Maps
npx expo install react-native-maps

# UDP socket for MAVLink
npm install react-native-udp

# Slider
npx expo install @react-native-community/slider

# State management
npm install zustand

# HTTP client
npm install axios

# UUID generation
npm install react-native-uuid

# Bottom sheet
npm install @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler

# Icons
npx expo install @expo/vector-icons
```

---

## Directory Layout

```
agrimachine/
├── app/                        # Expo Router file-based navigation
│   ├── _layout.tsx             # Root layout (navigation container)
│   ├── index.tsx               # Splash / Connection screen
│   ├── field-view.tsx          # Live Field View (dashboard + controls + map)
│   └── field-planner.tsx       # Mission planning screen
│
├── components/
│   ├── dashboard/
│   │   ├── FarmDashboard.tsx
│   │   └── DashTile.tsx
│   ├── controls/
│   │   ├── FarmControlPanel.tsx
│   │   ├── DepthSlider.tsx
│   │   ├── RelayButton.tsx
│   │   └── EmergencyStopButton.tsx
│   ├── mission/
│   │   ├── FieldMap.tsx
│   │   ├── WorkPointEditor.tsx
│   │   └── WorkPointMarker.tsx
│   └── common/
│       ├── BigButton.tsx
│       ├── StatusBadge.tsx
│       └── ConnectionBanner.tsx
│
├── services/
│   ├── MavlinkService.ts       # UDP socket, parser, sender singleton
│   ├── MavlinkParser.ts        # Raw bytes → MavlinkMessage
│   ├── MavlinkSender.ts        # MavlinkMessage → bytes → UDP send
│   ├── missionCompiler.ts      # FieldPlan → MissionItemInt[]
│   ├── missionUploader.ts      # MAVLink mission upload handshake
│   └── telemetryLogger.ts      # Buffers telemetry + flushes to backend
│
├── store/
│   ├── telemetryStore.ts       # Zustand — live telemetry values
│   ├── connectionStore.ts      # Zustand — connected, heartbeat
│   ├── controlStore.ts         # Zustand — tiller/pump/depth commanded state
│   └── missionStore.ts         # Zustand — current field plan, upload state
│
├── api/
│   ├── client.ts               # Axios instance with base URL
│   ├── missions.ts             # CRUD for field plans
│   ├── machines.ts             # Machine registration/listing
│   └── telemetry.ts            # Telemetry batch upload
│
├── types/
│   ├── mavlink.ts              # TypeScript types for MAVLink messages
│   └── mission.ts              # WorkPoint, FieldPlan, etc.
│
├── utils/
│   ├── mavlinkBuilders.ts      # buildSetTiller(), buildSetPump(), etc.
│   ├── mavlinkConstants.ts     # MSG IDs, command IDs as named constants
│   └── units.ts                # pwmToDepthCm(), depthPctToPwm(), etc.
│
├── hooks/
│   ├── useMavlinkService.ts    # Returns singleton MavlinkService
│   ├── useInterval.ts          # setInterval hook
│   └── useTelemetryThrottle.ts # Throttles Zustand reads to 2 Hz
│
└── constants/
    ├── colors.ts               # Design system colors
    └── layout.ts               # Min touch target sizes, spacing
```

---

## Zustand Store Examples

```typescript
// store/telemetryStore.ts
import { create } from 'zustand';
import { Telemetry } from '../types/mavlink';

interface TelemetryState extends Telemetry {
  update: (partial: Partial<Telemetry>) => void;
  clearAll: () => void;
}

const nullTelemetry: Telemetry = {
  batteryVoltageV: null, batteryPercent: null,
  gpsFixed: false, latDeg: null, lonDeg: null,
  speedKmh: null, pixhawkTempC: null,
  machineTempC: null, implementDepthCm: null,
  eStopActive: false, mode: null, lastHeartbeatMs: null,
};

export const useTelemetryStore = create<TelemetryState>((set) => ({
  ...nullTelemetry,
  update: (partial) => set((s) => ({ ...s, ...partial })),
  clearAll: () => set(nullTelemetry),
}));
```

```typescript
// store/connectionStore.ts
import { create } from 'zustand';

interface ConnectionState {
  connected: boolean;
  lastHeartbeatMs: number;
  setConnected: (v: boolean) => void;
  setLastHeartbeat: (ms: number) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  connected: false,
  lastHeartbeatMs: 0,
  setConnected: (v) => set({ connected: v }),
  setLastHeartbeat: (ms) => set({ lastHeartbeatMs: ms }),
}));
```

---

## Expo Router Navigation

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="field-view" />
      <Stack.Screen name="field-planner" />
    </Stack>
  );
}
```

```tsx
// app/index.tsx — Connection Screen
import { router } from 'expo-router';
import { useConnectionStore } from '../store/connectionStore';
import { useMavlinkService } from '../hooks/useMavlinkService';

export default function ConnectionScreen() {
  const connected = useConnectionStore(s => s.connected);
  const mavlink = useMavlinkService();

  const handleConnect = async () => {
    await mavlink.connect();
    // Navigate once heartbeat is received (handled in connectionStore watcher)
  };

  React.useEffect(() => {
    if (connected) router.replace('/field-view');
  }, [connected]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AgriMachine Controller</Text>
      <Text style={styles.subtitle}>Join your machine's WiFi, then tap Connect</Text>
      <BigButton label="Connect to Machine" onPress={handleConnect} />
    </View>
  );
}
```

---

## Constants

```typescript
// constants/colors.ts
export const Colors = {
  background: '#121212',
  surface: '#1e1e1e',
  primary: '#FF6F00',       // AgriMachine orange
  success: '#2e7d32',
  warning: '#e65100',
  danger: '#c62828',
  estop: '#b71c1c',
  textPrimary: '#ffffff',
  textSecondary: '#9e9e9e',
  tileLine: '#FF6F00',
};

// constants/layout.ts
export const Layout = {
  minTouchTarget: 72,         // dp — glove-friendly
  estopMinHeight: 88,
  dashTileMinWidth: 100,
  dashTileMinHeight: 70,
};
```

---

## Android Permissions (app.json)

```json
{
  "expo": {
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CHANGE_WIFI_STATE",
        "ACCESS_WIFI_STATE",
        "INTERNET"
      ]
    }
  }
}
```