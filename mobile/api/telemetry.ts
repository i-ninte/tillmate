import { apiClient } from './client';
import { TelemetryLogEntry, CommandLogEntry } from '../types';

// Backend uses snake_case; TS types use camelCase. Transforms live in this
// module so no other code has to know about the wire format.

interface BackendTelemetryLog {
  machine_id: number;
  session_id: string;
  recorded_at: string;
  battery_voltage_v?: number | null;
  battery_pct?: number | null;
  gps_fixed?: boolean | null;
  lat?: number | null;
  lon?: number | null;
  satellites?: number | null;
  speed_kmh?: number | null;
  heading_deg?: number | null;
  pixhawk_temp_c?: number | null;
  machine_temp_c?: number | null;
  implement_depth_cm?: number | null;
  estop_active?: boolean | null;
  mode?: string | null;
  headlights_on?: boolean | null;
}

interface BackendCommandLog {
  machine_id: number;
  session_id: string;
  sent_at: string;
  command_id: number;
  command_name: string;
  param1?: number | null;
  param2?: number | null;
  source: 'realtime' | 'mission';
}

function toBackendTelemetry(e: TelemetryLogEntry): BackendTelemetryLog {
  return {
    machine_id: e.machineId,
    session_id: e.sessionId,
    recorded_at: e.recordedAt,
    battery_voltage_v: e.batteryVoltageV,
    battery_pct: e.batteryPct,
    gps_fixed: e.gpsFixed,
    lat: e.lat,
    lon: e.lon,
    satellites: e.satellites,
    speed_kmh: e.speedKmh,
    heading_deg: e.headingDeg,
    pixhawk_temp_c: e.pixhawkTempC,
    machine_temp_c: e.machineTempC,
    implement_depth_cm: e.implementDepthCm,
    estop_active: e.estopActive,
    mode: e.mode,
    headlights_on: e.headlightsOn,
  };
}

function fromBackendTelemetry(b: BackendTelemetryLog): TelemetryLogEntry {
  return {
    machineId: b.machine_id,
    sessionId: b.session_id,
    recordedAt: b.recorded_at,
    batteryVoltageV: b.battery_voltage_v ?? undefined,
    batteryPct: b.battery_pct ?? undefined,
    gpsFixed: b.gps_fixed ?? undefined,
    lat: b.lat ?? undefined,
    lon: b.lon ?? undefined,
    satellites: b.satellites ?? undefined,
    speedKmh: b.speed_kmh ?? undefined,
    headingDeg: b.heading_deg ?? undefined,
    pixhawkTempC: b.pixhawk_temp_c ?? undefined,
    machineTempC: b.machine_temp_c ?? undefined,
    implementDepthCm: b.implement_depth_cm ?? undefined,
    estopActive: b.estop_active ?? undefined,
    mode: b.mode ?? undefined,
    headlightsOn: b.headlights_on ?? undefined,
  };
}

function toBackendCommand(e: CommandLogEntry): BackendCommandLog {
  return {
    machine_id: e.machineId,
    session_id: e.sessionId,
    sent_at: e.sentAt,
    command_id: e.commandId,
    command_name: e.commandName,
    param1: e.param1,
    param2: e.param2,
    source: e.source,
  };
}

function fromBackendCommand(b: BackendCommandLog): CommandLogEntry {
  return {
    machineId: b.machine_id,
    sessionId: b.session_id,
    sentAt: b.sent_at,
    commandId: b.command_id,
    commandName: b.command_name,
    param1: b.param1 ?? undefined,
    param2: b.param2 ?? undefined,
    source: b.source,
  };
}

export const telemetryApi = {
  /** Batch insert telemetry logs */
  appendLogs: async (logs: TelemetryLogEntry[]): Promise<{ inserted: number }> => {
    const response = await apiClient.post<{ inserted: number }>(
      '/telemetry/logs',
      logs.map(toBackendTelemetry)
    );
    return response.data;
  },

  /** Get telemetry logs for a session */
  getLogs: async (
    machineId: number,
    sessionId: string
  ): Promise<TelemetryLogEntry[]> => {
    const response = await apiClient.get<BackendTelemetryLog[]>('/telemetry/logs', {
      params: { machine_id: machineId, session_id: sessionId },
    });
    return response.data.map(fromBackendTelemetry);
  },

  /** Batch insert command logs */
  appendCommands: async (logs: CommandLogEntry[]): Promise<{ inserted: number }> => {
    const response = await apiClient.post<{ inserted: number }>(
      '/telemetry/commands',
      logs.map(toBackendCommand)
    );
    return response.data;
  },

  /** Get command logs for a session */
  getCommands: async (
    machineId: number,
    sessionId: string
  ): Promise<CommandLogEntry[]> => {
    const response = await apiClient.get<BackendCommandLog[]>('/telemetry/commands', {
      params: { machine_id: machineId, session_id: sessionId },
    });
    return response.data.map(fromBackendCommand);
  },
};
