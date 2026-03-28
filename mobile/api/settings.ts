import { apiClient } from './client';

interface AppSettingsResponse {
  settings: Record<string, string>;
}

interface AppSettingResponse {
  key: string;
  value: string;
  updated_at: string;
}

export const settingsApi = {
  /**
   * Get all app settings
   */
  getAll: async (): Promise<Record<string, string>> => {
    const response = await apiClient.get<AppSettingsResponse>('/settings');
    return response.data.settings;
  },

  /**
   * Get a specific setting
   */
  get: async (key: string): Promise<string> => {
    const response = await apiClient.get<AppSettingResponse>(`/settings/${key}`);
    return response.data.value;
  },

  /**
   * Update a setting
   */
  set: async (key: string, value: string): Promise<void> => {
    await apiClient.put(`/settings/${key}`, { value });
  },

  /**
   * Get simulation mode setting
   * Returns true if simulation mode is enabled (value = "1")
   */
  getSimulationMode: async (): Promise<boolean> => {
    try {
      const value = await settingsApi.get('simulation_mode');
      return value === '1';
    } catch (error) {
      console.warn('[Settings] Could not fetch simulation_mode, defaulting to true');
      return true; // Default to simulation mode if backend unavailable
    }
  },

  /**
   * Set simulation mode setting
   */
  setSimulationMode: async (enabled: boolean): Promise<void> => {
    await settingsApi.set('simulation_mode', enabled ? '1' : '0');
  },
};
