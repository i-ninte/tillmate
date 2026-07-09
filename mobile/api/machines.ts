import { apiClient } from './client';
import { Machine, MachineCreate } from '../types';

interface BackendMachine {
  id: number;
  serial_number: string;
  display_name: string;
  wifi_ssid: string;
  actuator_min_mm: number;
  actuator_max_mm: number;
  actuator_pwm_min: number;
  actuator_pwm_max: number;
  implement_width_m: number;
  battery_warn_v: number;
  battery_critical_v: number;
  created_at: string;
  updated_at: string;
}

const transformMachine = (m: BackendMachine): Machine => ({
  id: m.id,
  serialNumber: m.serial_number,
  displayName: m.display_name,
  wifiSsid: m.wifi_ssid,
  actuatorMinMm: m.actuator_min_mm,
  actuatorMaxMm: m.actuator_max_mm,
  actuatorPwmMin: m.actuator_pwm_min,
  actuatorPwmMax: m.actuator_pwm_max,
  implementWidthM: m.implement_width_m,
  batteryWarnV: m.battery_warn_v,
  batteryCriticalV: m.battery_critical_v,
  createdAt: m.created_at,
  updatedAt: m.updated_at,
});

const toBackendPayload = (data: Partial<MachineCreate>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (data.serialNumber !== undefined) payload.serial_number = data.serialNumber;
  if (data.displayName !== undefined) payload.display_name = data.displayName;
  if (data.wifiSsid !== undefined) payload.wifi_ssid = data.wifiSsid;
  if (data.actuatorMinMm !== undefined) payload.actuator_min_mm = data.actuatorMinMm;
  if (data.actuatorMaxMm !== undefined) payload.actuator_max_mm = data.actuatorMaxMm;
  if (data.implementWidthM !== undefined) payload.implement_width_m = data.implementWidthM;
  if (data.batteryWarnV !== undefined) payload.battery_warn_v = data.batteryWarnV;
  if (data.batteryCriticalV !== undefined) payload.battery_critical_v = data.batteryCriticalV;
  return payload;
};

export const machinesApi = {
  /**
   * Register a new machine
   */
  create: async (data: MachineCreate): Promise<Machine> => {
    const response = await apiClient.post<BackendMachine>('/machines', toBackendPayload(data));
    return transformMachine(response.data);
  },

  /**
   * List all machines
   */
  list: async (): Promise<Machine[]> => {
    const response = await apiClient.get<BackendMachine[]>('/machines');
    return response.data.map(transformMachine);
  },

  /**
   * Get a machine by ID
   */
  get: async (id: number): Promise<Machine> => {
    const response = await apiClient.get<BackendMachine>(`/machines/${id}`);
    return transformMachine(response.data);
  },

  /**
   * Update a machine
   */
  update: async (id: number, data: Partial<MachineCreate>): Promise<Machine> => {
    const response = await apiClient.patch<BackendMachine>(`/machines/${id}`, toBackendPayload(data));
    return transformMachine(response.data);
  },

  /**
   * Delete a machine
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/machines/${id}`);
  },
};
