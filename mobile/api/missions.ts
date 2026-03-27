import { apiClient } from './client';
import { FieldPlan, FieldPlanCreate, FieldPlanSummary, WorkPoint } from '../types';

// Transform snake_case backend response to camelCase frontend types
interface BackendFieldPlanSummary {
  id: number;
  machine_id: number;
  name: string;
  notes: string | null;
  point_count: number;
  created_at: string;
}

interface BackendWorkPoint {
  id: number;
  seq: number;
  lat: number;
  lon: number;
  implement_lowered: boolean;
  tiller_on: boolean;
  pump_on: boolean;
  label: string;
}

interface BackendFieldPlan {
  id: number;
  machine_id: number;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  work_points: BackendWorkPoint[];
}

const transformWorkPoint = (wp: BackendWorkPoint): WorkPoint => ({
  id: String(wp.id),
  seq: wp.seq,
  lat: wp.lat,
  lon: wp.lon,
  implementLowered: wp.implement_lowered,
  tillerOn: wp.tiller_on,
  pumpOn: wp.pump_on,
  label: wp.label,
});

const transformFieldPlan = (plan: BackendFieldPlan): FieldPlan => ({
  id: plan.id,
  localId: `backend-${plan.id}`,
  machineId: plan.machine_id,
  name: plan.name,
  notes: plan.notes || undefined,
  createdAt: plan.created_at,
  updatedAt: plan.updated_at,
  workPoints: plan.work_points.map(transformWorkPoint),
});

const transformSummary = (summary: BackendFieldPlanSummary): FieldPlanSummary => ({
  id: summary.id,
  machineId: summary.machine_id,
  name: summary.name,
  notes: summary.notes,
  workPointCount: summary.point_count,
  createdAt: summary.created_at,
});

export const missionsApi = {
  /**
   * Create a new field plan
   */
  create: async (data: FieldPlanCreate): Promise<FieldPlan> => {
    // Transform to snake_case for backend
    const payload = {
      machine_id: data.machineId,
      name: data.name,
      notes: data.notes,
      work_points: data.workPoints.map(wp => ({
        seq: wp.seq,
        lat: wp.lat,
        lon: wp.lon,
        implement_lowered: wp.implementLowered,
        tiller_on: wp.tillerOn,
        pump_on: wp.pumpOn,
        label: wp.label,
      })),
    };
    const response = await apiClient.post<BackendFieldPlan>('/missions', payload);
    return transformFieldPlan(response.data);
  },

  /**
   * List all field plans
   */
  list: async (machineId?: number): Promise<FieldPlan[]> => {
    const params = machineId ? { machine_id: machineId } : {};
    const response = await apiClient.get<BackendFieldPlan[]>('/missions', { params });
    return response.data.map(transformFieldPlan);
  },

  /**
   * List field plan summaries (lighter response)
   */
  listSummaries: async (machineId?: number): Promise<FieldPlanSummary[]> => {
    const params = machineId ? { machine_id: machineId } : {};
    const response = await apiClient.get<BackendFieldPlanSummary[]>('/missions/summaries', {
      params,
    });
    return response.data.map(transformSummary);
  },

  /**
   * Get a field plan by ID
   */
  get: async (id: number): Promise<FieldPlan> => {
    const response = await apiClient.get<BackendFieldPlan>(`/missions/${id}`);
    return transformFieldPlan(response.data);
  },

  /**
   * Delete a field plan
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/missions/${id}`);
  },
};
