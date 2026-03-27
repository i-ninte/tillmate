import { create } from 'zustand';

interface ConnectionState {
  // Connection status
  connected: boolean;
  connecting: boolean;

  // Heartbeat tracking
  lastHeartbeatMs: number;

  // Target info
  targetIp: string;
  targetPort: number;

  // Actions
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setLastHeartbeat: (ms: number) => void;
  setTarget: (ip: string, port: number) => void;
  reset: () => void;
}

const initialState = {
  connected: false,
  connecting: false,
  lastHeartbeatMs: 0,
  targetIp: '192.168.2.1',
  targetPort: 14550,
};

export const useConnectionStore = create<ConnectionState>((set) => ({
  ...initialState,

  setConnected: (connected) => set({ connected, connecting: false }),
  setConnecting: (connecting) => set({ connecting }),
  setLastHeartbeat: (ms) => set({ lastHeartbeatMs: ms }),
  setTarget: (ip, port) => set({ targetIp: ip, targetPort: port }),
  reset: () => set(initialState),
}));
