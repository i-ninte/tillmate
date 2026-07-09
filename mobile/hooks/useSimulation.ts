/**
 * useSimulation — animates a virtual machine along the planned path
 * so the farmer can preview the route before sending it to the machine.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { LatLon } from '../services/coveragePlanner';
import { positionAtDistance, SimulatedPosition } from '../services/simulation';

const TICK_MS = 100;
const DEFAULT_SPEED_MPS = 5; // Preview speed (faster than real machine)

export function useSimulation(path: LatLon[], speedMps: number = DEFAULT_SPEED_MPS) {
  const [running, setRunning] = useState(false);
  const [position, setPosition] = useState<SimulatedPosition | null>(null);
  const distanceRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    distanceRef.current = 0;
    setPosition(null);
  }, [stop]);

  const start = useCallback(() => {
    if (path.length < 2) return;
    stop();
    distanceRef.current = 0;
    setPosition(positionAtDistance(path, 0));
    setRunning(true);
    timerRef.current = setInterval(() => {
      distanceRef.current += (speedMps * TICK_MS) / 1000;
      const pos = positionAtDistance(path, distanceRef.current);
      setPosition(pos);
      if (pos?.done) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setRunning(false);
      }
    }, TICK_MS);
  }, [path, speedMps, stop]);

  // Clean up on unmount or when the path changes
  useEffect(() => reset, [path, reset]);

  return { running, position, start, stop, reset };
}
