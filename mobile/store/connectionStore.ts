import { create } from 'zustand';
import { DRONEBRIDGE_CONFIG } from '../types';

interface ConnectionState {
  // Connection status
  connected: boolean;
  connecting: boolean;
  connectionError: string | null;

  // Heartbeat tracking
  lastHeartbeatMs: number;

  // Target info
  targetIp: string;
  targetPort: number;

  // Machine info (from heartbeat)
  machineId: number | null;
  machineSystemId: number;

  // Actions
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setLastHeartbeat: (ms: number) => void;
  setTarget: (ip: string, port: number) => void;
  setMachineId: (id: number | null) => void;
  setMachineSystemId: (sysId: number) => void;
  reset: () => void;
}

const initialState = {
  connected: false,
  connecting: false,
  connectionError: null,
  lastHeartbeatMs: 0,
  targetIp: DRONEBRIDGE_CONFIG.DEFAULT_IP,
  targetPort: DRONEBRIDGE_CONFIG.UDP_PORT,
  machineId: null,
  machineSystemId: 1,
};

export const useConnectionStore = create<ConnectionState>((set) => ({
  ...initialState,

  setConnected: (connected) => set({ connected, connecting: false, connectionError: null }),
  setConnecting: (connecting) => set({ connecting, connectionError: null }),
  setConnectionError: (error) => set({ connectionError: error, connecting: false }),
  setLastHeartbeat: (ms) => set({ lastHeartbeatMs: ms }),
  setTarget: (ip, port) => set({ targetIp: ip, targetPort: port }),
  setMachineId: (id) => set({ machineId: id }),
  setMachineSystemId: (sysId) => set({ machineSystemId: sysId }),
  reset: () => set(initialState),
}));
