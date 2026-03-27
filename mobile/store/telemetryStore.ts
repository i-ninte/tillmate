import { create } from 'zustand';
import { Telemetry, MachineMode } from '../types/mavlink';

interface TelemetryState extends Telemetry {
  // Actions
  update: (partial: Partial<Telemetry>) => void;
  clearAll: () => void;
}

const nullTelemetry: Telemetry = {
  // Battery
  batteryVoltageV: null,
  batteryPercent: null,

  // GPS
  gpsFixed: false,
  latDeg: null,
  lonDeg: null,
  satellites: null,

  // Motion
  speedKmh: null,
  headingDeg: null,

  // Temperatures
  pixhawkTempC: null,
  machineTempC: null,

  // Implement
  implementDepthCm: null,

  // State
  eStopActive: false,
  mode: MachineMode.UNKNOWN,

  // Accessories
  headlightsOn: false,

  // Connection
  lastHeartbeatMs: null,
};

export const useTelemetryStore = create<TelemetryState>((set) => ({
  ...nullTelemetry,

  update: (partial) => set((state) => ({ ...state, ...partial })),

  clearAll: () => set(nullTelemetry),
}));

// Selector for checking if telemetry is stale
export const selectIsStale = (state: TelemetryState): boolean => {
  if (!state.lastHeartbeatMs) return true;
  return Date.now() - state.lastHeartbeatMs > 5000;
};
