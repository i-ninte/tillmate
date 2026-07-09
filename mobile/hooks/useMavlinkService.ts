/**
 * useMavlinkService — single place that wires the MAVLink service to the
 * Zustand stores and the telemetry logger for the machine session lifecycle.
 */

import { useCallback, useEffect } from 'react';
import { mavlinkService } from '../services/MavlinkService';
import { telemetryLogger } from '../services/telemetryLogger';
import { useConnectionStore } from '../store/connectionStore';
import { useTelemetryStore } from '../store/telemetryStore';

export function useMavlinkService() {
  const connected = useConnectionStore((s) => s.connected);
  const machineId = useConnectionStore((s) => s.machineId);

  useEffect(() => {
    mavlinkService.onConnection((isConnected) => {
      useConnectionStore.getState().setConnected(isConnected);
      if (isConnected) {
        telemetryLogger.startSession(useConnectionStore.getState().machineId ?? 1);
      } else {
        void telemetryLogger.stopSession();
        // Safety rule: never show stale telemetry after a disconnect
        useTelemetryStore.getState().clearAll();
      }
    });

    mavlinkService.onTelemetry((partial) => {
      useTelemetryStore.getState().update(partial);
      telemetryLogger.logTelemetry({
        batteryVoltageV: partial.batteryVoltageV ?? undefined,
        batteryPct: partial.batteryPercent ?? undefined,
        gpsFixed: partial.gpsFixed ?? undefined,
        lat: partial.latDeg ?? undefined,
        lon: partial.lonDeg ?? undefined,
        satellites: partial.satellites ?? undefined,
        speedKmh: partial.speedKmh ?? undefined,
        headingDeg: partial.headingDeg ?? undefined,
        pixhawkTempC: partial.pixhawkTempC ?? undefined,
        machineTempC: partial.machineTempC ?? undefined,
        implementDepthCm: partial.implementDepthCm ?? undefined,
        estopActive: partial.eStopActive ?? undefined,
        headlightsOn: partial.headlightsOn ?? undefined,
      });
    });

    mavlinkService.onErrorCallback((err) => {
      console.warn('[useMavlinkService] error:', err.message);
    });
  }, []);

  const connect = useCallback(async (ip?: string, port?: number): Promise<boolean> => {
    if (ip && port) mavlinkService.setTarget(ip, port);
    useConnectionStore.getState().setConnecting(true);
    const ok = await mavlinkService.connect();
    useConnectionStore.getState().setConnected(ok);
    return ok;
  }, []);

  const disconnect = useCallback(() => {
    mavlinkService.disconnect();
  }, []);

  return { connected, machineId, connect, disconnect, service: mavlinkService };
}
