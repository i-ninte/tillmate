/**
 * Path Simulation Service
 * Pure math for animating a virtual machine along a planned path
 * before it is sent to the real machine.
 */

import { LatLon, pathLengthM } from './coveragePlanner';

const EARTH_RADIUS_M = 6371000;

export interface SimulatedPosition {
  lat: number;
  lon: number;
  headingDeg: number;   // 0 = north, clockwise
  segmentIndex: number; // Index of the segment currently being traversed
  progress: number;     // 0..1 of total path distance
  done: boolean;
}

function segmentLengthM(a: LatLon, b: LatLon): number {
  const latRad = (a.lat * Math.PI) / 180;
  const dx = ((b.lon - a.lon) * Math.PI / 180) * Math.cos(latRad) * EARTH_RADIUS_M;
  const dy = ((b.lat - a.lat) * Math.PI / 180) * EARTH_RADIUS_M;
  return Math.hypot(dx, dy);
}

function headingDeg(a: LatLon, b: LatLon): number {
  const latRad = (a.lat * Math.PI) / 180;
  const dx = ((b.lon - a.lon) * Math.PI / 180) * Math.cos(latRad);
  const dy = ((b.lat - a.lat) * Math.PI) / 180;
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * Returns the machine position after traveling `distanceM` meters along the path.
 * Clamps to the last point when the distance exceeds the path length.
 */
export function positionAtDistance(
  path: LatLon[],
  distanceM: number
): SimulatedPosition | null {
  if (path.length === 0) return null;

  const total = pathLengthM(path);
  if (path.length === 1 || total === 0) {
    return {
      lat: path[0].lat,
      lon: path[0].lon,
      headingDeg: 0,
      segmentIndex: 0,
      progress: 1,
      done: true,
    };
  }

  let remaining = Math.max(0, distanceM);
  for (let i = 0; i < path.length - 1; i++) {
    const segLen = segmentLengthM(path[i], path[i + 1]);
    if (remaining <= segLen && segLen > 0) {
      const t = remaining / segLen;
      return {
        lat: path[i].lat + t * (path[i + 1].lat - path[i].lat),
        lon: path[i].lon + t * (path[i + 1].lon - path[i].lon),
        headingDeg: headingDeg(path[i], path[i + 1]),
        segmentIndex: i,
        progress: Math.min(1, distanceM / total),
        done: false,
      };
    }
    remaining -= segLen;
  }

  const last = path[path.length - 1];
  return {
    lat: last.lat,
    lon: last.lon,
    headingDeg: headingDeg(path[path.length - 2], last),
    segmentIndex: path.length - 2,
    progress: 1,
    done: true,
  };
}

/** Estimated time in seconds to complete the path at the given speed */
export function estimateDurationS(path: LatLon[], speedMps: number): number {
  if (speedMps <= 0) return 0;
  return pathLengthM(path) / speedMps;
}
