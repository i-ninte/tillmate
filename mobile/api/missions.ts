import { apiClient } from './client';
import { FieldPlan, FieldPlanCreate, FieldPlanSummary } from '../types';

export const missionsApi = {
  /**
   * Create a new field plan
   */
  create: async (data: FieldPlanCreate): Promise<FieldPlan> => {
    const response = await apiClient.post<FieldPlan>('/missions', data);
    return response.data;
  },

  /**
   * List all field plans
   */
  list: async (machineId?: number): Promise<FieldPlan[]> => {
    const params = machineId ? { machine_id: machineId } : {};
    const response = await apiClient.get<FieldPlan[]>('/missions', { params });
    return response.data;
  },

  /**
   * List field plan summaries (lighter response)
   */
  listSummaries: async (machineId?: number): Promise<FieldPlanSummary[]> => {
    const params = machineId ? { machine_id: machineId } : {};
    const response = await apiClient.get<FieldPlanSummary[]>('/missions/summaries', {
      params,
    });
    return response.data;
  },

  /**
   * Get a field plan by ID
   */
  get: async (id: number): Promise<FieldPlan> => {
    const response = await apiClient.get<FieldPlan>(`/missions/${id}`);
    return response.data;
  },

  /**
   * Delete a field plan
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/missions/${id}`);
  },
};
