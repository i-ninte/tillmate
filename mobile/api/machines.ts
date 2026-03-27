import { apiClient } from './client';
import { Machine, MachineCreate } from '../types';

export const machinesApi = {
  /**
   * Register a new machine
   */
  create: async (data: MachineCreate): Promise<Machine> => {
    const response = await apiClient.post<Machine>('/machines', data);
    return response.data;
  },

  /**
   * List all machines
   */
  list: async (): Promise<Machine[]> => {
    const response = await apiClient.get<Machine[]>('/machines');
    return response.data;
  },

  /**
   * Get a machine by ID
   */
  get: async (id: number): Promise<Machine> => {
    const response = await apiClient.get<Machine>(`/machines/${id}`);
    return response.data;
  },

  /**
   * Update a machine
   */
  update: async (id: number, data: Partial<MachineCreate>): Promise<Machine> => {
    const response = await apiClient.patch<Machine>(`/machines/${id}`, data);
    return response.data;
  },

  /**
   * Delete a machine
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/machines/${id}`);
  },
};
