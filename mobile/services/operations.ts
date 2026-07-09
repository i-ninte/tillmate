/**
 * Field Operations Service
 * Maps farmer-selected operations (tilling, weeding, spraying) to
 * implement states on each work point, and depth to actuator PWM.
 */

import { Operation, WorkPoint } from '../types/mission';
import { LatLon } from './coveragePlanner';
import { IMPLEMENT_PWM } from '../utils/mavlinkConstants';

export interface OperationConfig {
  label: string;          // Farmer-facing name
  needsDepth: boolean;    // Depth setting applies (tilling/weeding)
  defaultDepthCm: number;
  maxDepthCm: number;
  implementLowered: boolean;
  tillerOn: boolean;
  pumpOn: boolean;
}

export const OPERATIONS: Record<Operation, OperationConfig> = {
  tilling: {
    label: 'Tilling',
    needsDepth: true,
    defaultDepthCm: 15,
    maxDepthCm: 30,
    implementLowered: true,
    tillerOn: true,
    pumpOn: false,
  },
  weeding: {
    label: 'Weeding',
    needsDepth: true,
    defaultDepthCm: 5,
    maxDepthCm: 30,
    implementLowered: true,
    tillerOn: true,
    pumpOn: false,
  },
  spraying: {
    label: 'Spraying',
    needsDepth: false,
    defaultDepthCm: 0,
    maxDepthCm: 0,
    implementLowered: false,
    tillerOn: false,
    pumpOn: true,
  },
};

/**
 * Converts a working depth in cm to a linear-actuator PWM value.
 * 0 cm → RAISED (1000), maxDepthCm → fully LOWERED (2000), linear between.
 */
export function depthCmToPwm(depthCm: number, maxDepthCm: number = 30): number {
  if (maxDepthCm <= 0) return IMPLEMENT_PWM.MIN;
  const clamped = Math.min(Math.max(depthCm, 0), maxDepthCm);
  return Math.round(
    IMPLEMENT_PWM.MIN +
      (clamped / maxDepthCm) * (IMPLEMENT_PWM.MAX - IMPLEMENT_PWM.MIN)
  );
}

/**
 * Applies an operation's implement states to existing work points.
 * Used when the farmer changes the operation AFTER the path was generated.
 */
export function applyOperationToPoints(
  points: WorkPoint[],
  operation: Operation
): WorkPoint[] {
  const cfg = OPERATIONS[operation];
  return points.map((p) => ({
    ...p,
    implementLowered: cfg.implementLowered,
    tillerOn: cfg.tillerOn,
    pumpOn: cfg.pumpOn,
  }));
}

/**
 * Builds ordered work points from a generated coverage path with the
 * selected operation's implement states applied to every point.
 */
export function buildWorkPointsFromPath(
  path: LatLon[],
  operation: Operation
): WorkPoint[] {
  const cfg = OPERATIONS[operation];
  return path.map((p, i) => ({
    id: `wp-${i}-${p.lat.toFixed(7)}-${p.lon.toFixed(7)}`,
    seq: i,
    lat: p.lat,
    lon: p.lon,
    implementLowered: cfg.implementLowered,
    tillerOn: cfg.tillerOn,
    pumpOn: cfg.pumpOn,
    label: `Point ${i + 1}`,
  }));
}
