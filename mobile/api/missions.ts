import { apiClient } from './client';
import { FieldPlan, FieldPlanCreate, FieldPlanSummary, WorkPoint } from '../types';

// Transform snake_case backend response to camelCase frontend types
interface BackendFieldPlanSummary {
  id: number;
  machine_id: number;
  name: string;
  notes: string | null;
  return_to_home: boolean;
  operation: 'tilling' | 'weeding' | 'spraying' | null;
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
  return_to_home: boolean;
  home_lat: number | null;
  home_lon: number | null;
  operation: 'tilling' | 'weeding' | 'spraying' | null;
  depth_cm: number | null;
  implement_width_m: number | null;
  boundary: { lat: number; lon: number }[] | null;
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
  returnToHome: plan.return_to_home,
  homeLocation: plan.home_lat !== null && plan.home_lon !== null
    ? { lat: plan.home_lat, lon: plan.home_lon }
    : undefined,
  operation: plan.operation ?? undefined,
  depthCm: plan.depth_cm ?? undefined,
  implementWidthM: plan.implement_width_m ?? undefined,
  boundary: plan.boundary ?? undefined,
  createdAt: plan.created_at,
  updatedAt: plan.updated_at,
  workPoints: plan.work_points.map(transformWorkPoint),
});

const transformSummary = (summary: BackendFieldPlanSummary): FieldPlanSummary => ({
  id: summary.id,
  machineId: summary.machine_id,
  name: summary.name,
  notes: summary.notes,
  returnToHome: summary.return_to_home,
  operation: summary.operation ?? undefined,
  workPointCount: summary.point_count,
  createdAt: summary.created_at,
});

export const missionsApi = {
  /**
   * Create a new field plan
   */
  create: async (data: FieldPlanCreate): Promise<FieldPlan> => {
    // Transform to snake_case for backend
    const payload: Record<string, unknown> = {
      name: data.name,
      notes: data.notes,
      return_to_home: data.returnToHome ?? true,
      home_location: data.homeLocation
        ? { lat: data.homeLocation.lat, lon: data.homeLocation.lon }
        : null,
      operation: data.operation ?? null,
      depth_cm: data.depthCm ?? null,
      implement_width_m: data.implementWidthM ?? null,
      boundary: data.boundary
        ? data.boundary.map((b) => ({ lat: b.lat, lon: b.lon }))
        : null,
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
    // Only include machine_id if provided
    if (data.machineId) {
      payload.machine_id = data.machineId;
    }
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
