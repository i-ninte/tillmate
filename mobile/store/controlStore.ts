import { create } from 'zustand';

interface ControlState {
  // Commanded states (what we've sent)
  tillerOn: boolean;
  pumpOn: boolean;
  headlightsOn: boolean;
  depthPercent: number;  // 0-100

  // Pending states (waiting for confirmation)
  tillerPending: boolean;
  pumpPending: boolean;
  headlightsPending: boolean;
  depthPending: boolean;

  // E-Stop
  eStopSending: boolean;

  // Actions
  setTiller: (on: boolean) => void;
  setPump: (on: boolean) => void;
  setHeadlights: (on: boolean) => void;
  setDepth: (percent: number) => void;

  setTillerPending: (pending: boolean) => void;
  setPumpPending: (pending: boolean) => void;
  setHeadlightsPending: (pending: boolean) => void;
  setDepthPending: (pending: boolean) => void;

  setEStopSending: (sending: boolean) => void;

  // Emergency stop - sets everything to safe state
  emergencyStop: () => void;

  reset: () => void;
}

const initialState = {
  tillerOn: false,
  pumpOn: false,
  headlightsOn: false,
  depthPercent: 0,
  tillerPending: false,
  pumpPending: false,
  headlightsPending: false,
  depthPending: false,
  eStopSending: false,
};

export const useControlStore = create<ControlState>((set) => ({
  ...initialState,

  setTiller: (on) => set({ tillerOn: on, tillerPending: false }),
  setPump: (on) => set({ pumpOn: on, pumpPending: false }),
  setHeadlights: (on) => set({ headlightsOn: on, headlightsPending: false }),
  setDepth: (percent) => set({ depthPercent: percent, depthPending: false }),

  setTillerPending: (pending) => set({ tillerPending: pending }),
  setPumpPending: (pending) => set({ pumpPending: pending }),
  setHeadlightsPending: (pending) => set({ headlightsPending: pending }),
  setDepthPending: (pending) => set({ depthPending: pending }),

  setEStopSending: (sending) => set({ eStopSending: sending }),

  emergencyStop: () => set({
    tillerOn: false,
    pumpOn: false,
    depthPercent: 0,
    tillerPending: false,
    pumpPending: false,
    depthPending: false,
    eStopSending: false,
  }),

  reset: () => set(initialState),
}));
