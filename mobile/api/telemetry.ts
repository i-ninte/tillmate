import { apiClient } from './client';
import { TelemetryLogEntry, CommandLogEntry } from '../types';

export const telemetryApi = {
  /**
   * Batch insert telemetry logs
   */
  appendLogs: async (logs: TelemetryLogEntry[]): Promise<{ inserted: number }> => {
    const response = await apiClient.post<{ inserted: number }>(
      '/telemetry/logs',
      logs
    );
    return response.data;
  },

  /**
   * Get telemetry logs for a session
   */
  getLogs: async (
    machineId: number,
    sessionId: string
  ): Promise<TelemetryLogEntry[]> => {
    const response = await apiClient.get<TelemetryLogEntry[]>('/telemetry/logs', {
      params: { machine_id: machineId, session_id: sessionId },
    });
    return response.data;
  },

  /**
   * Batch insert command logs
   */
  appendCommands: async (logs: CommandLogEntry[]): Promise<{ inserted: number }> => {
    const response = await apiClient.post<{ inserted: number }>(
      '/telemetry/commands',
      logs
    );
    return response.data;
  },

  /**
   * Get command logs for a session
   */
  getCommands: async (
    machineId: number,
    sessionId: string
  ): Promise<CommandLogEntry[]> => {
    const response = await apiClient.get<CommandLogEntry[]>('/telemetry/commands', {
      params: { machine_id: machineId, session_id: sessionId },
    });
    return response.data;
  },
};
