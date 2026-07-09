/**
 * useTelemetryThrottle — re-renders at most every `intervalMs` with the
 * latest telemetry snapshot, so high-rate MAVLink updates don't thrash the UI.
 */

import { useEffect, useState } from 'react';
import { Telemetry } from '../types';
import { useTelemetryStore } from '../store/telemetryStore';

export function useTelemetryThrottle(intervalMs: number = 500): Telemetry {
  const [snapshot, setSnapshot] = useState<Telemetry>(
    () => useTelemetryStore.getState() as unknown as Telemetry
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSnapshot({ ...(useTelemetryStore.getState() as unknown as Telemetry) });
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return snapshot;
}
