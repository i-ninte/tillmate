import { create } from 'zustand';
import { FieldPlan, FieldPlanSummary, WorkPoint, MissionUploadState, MissionUploadProgress } from '../types/mission';

interface MissionState {
  // Current field plan being edited
  currentPlan: FieldPlan | null;

  // Work points for the current plan
  workPoints: WorkPoint[];

  // Currently selected work point (for editing)
  selectedPointId: string | null;

  // Upload progress
  uploadProgress: MissionUploadProgress;

  // Saved plans (from backend) - summaries for list view
  savedPlans: FieldPlanSummary[];

  // Actions - Plan
  setCurrentPlan: (plan: FieldPlan | null) => void;
  createNewPlan: (machineId: number, name: string) => void;
  clearCurrentPlan: () => void;

  // Actions - Work Points
  addWorkPoint: (point: WorkPoint) => void;
  updateWorkPoint: (id: string, updates: Partial<WorkPoint>) => void;
  removeWorkPoint: (id: string) => void;
  reorderWorkPoints: (fromIndex: number, toIndex: number) => void;

  // Actions - Selection
  selectWorkPoint: (id: string | null) => void;

  // Actions - Upload
  setUploadProgress: (progress: Partial<MissionUploadProgress>) => void;
  resetUpload: () => void;

  // Actions - Saved Plans
  setSavedPlans: (plans: FieldPlanSummary[]) => void;

  reset: () => void;
}

const initialUploadProgress: MissionUploadProgress = {
  state: MissionUploadState.IDLE,
  currentItem: 0,
  totalItems: 0,
};

const initialState = {
  currentPlan: null,
  workPoints: [],
  selectedPointId: null,
  uploadProgress: initialUploadProgress,
  savedPlans: [],
};

export const useMissionStore = create<MissionState>((set, get) => ({
  ...initialState,

  setCurrentPlan: (plan) => set({
    currentPlan: plan,
    workPoints: plan?.workPoints || [],
  }),

  createNewPlan: (machineId, name) => {
    const localId = `local-${Date.now()}`;
    set({
      currentPlan: {
        localId,
        machineId,
        name,
        workPoints: [],
      },
      workPoints: [],
    });
  },

  clearCurrentPlan: () => set({
    currentPlan: null,
    workPoints: [],
    selectedPointId: null,
    uploadProgress: initialUploadProgress,
  }),

  addWorkPoint: (point) => set((state) => {
    const newPoints = [...state.workPoints, point];
    return {
      workPoints: newPoints,
      currentPlan: state.currentPlan
        ? { ...state.currentPlan, workPoints: newPoints }
        : null,
    };
  }),

  updateWorkPoint: (id, updates) => set((state) => {
    const newPoints = state.workPoints.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    return {
      workPoints: newPoints,
      currentPlan: state.currentPlan
        ? { ...state.currentPlan, workPoints: newPoints }
        : null,
    };
  }),

  removeWorkPoint: (id) => set((state) => {
    const newPoints = state.workPoints
      .filter((p) => p.id !== id)
      .map((p, index) => ({ ...p, seq: index }));
    return {
      workPoints: newPoints,
      currentPlan: state.currentPlan
        ? { ...state.currentPlan, workPoints: newPoints }
        : null,
      selectedPointId: state.selectedPointId === id ? null : state.selectedPointId,
    };
  }),

  reorderWorkPoints: (fromIndex, toIndex) => set((state) => {
    const newPoints = [...state.workPoints];
    const [removed] = newPoints.splice(fromIndex, 1);
    newPoints.splice(toIndex, 0, removed);
    const reindexed = newPoints.map((p, index) => ({ ...p, seq: index }));
    return {
      workPoints: reindexed,
      currentPlan: state.currentPlan
        ? { ...state.currentPlan, workPoints: reindexed }
        : null,
    };
  }),

  selectWorkPoint: (id) => set({ selectedPointId: id }),

  setUploadProgress: (progress) => set((state) => ({
    uploadProgress: { ...state.uploadProgress, ...progress },
  })),

  resetUpload: () => set({ uploadProgress: initialUploadProgress }),

  setSavedPlans: (plans) => set({ savedPlans: plans }),

  reset: () => set(initialState),
}));
