/**
 * Coverage Planner Service
 * Generates a boustrophedon (back-and-forth) coverage path over a field
 * boundary polygon, spaced by the machine's implement width.
 * Ported from the QGroundControl Survey pattern concept, implemented in TS.
 */

export interface LatLon {
  lat: number;
  lon: number;
}

export interface CoverageOptions {
  implementWidthM: number;   // Working width of the implement in meters
  angleDeg?: number;         // Direction of passes (0 = east-west sweep bearing). Default: along longest boundary edge
  overlapPct?: number;       // Overlap between passes, 0-90 (%). Default 0
}

const EARTH_RADIUS_M = 6371000;

interface XY {
  x: number;
  y: number;
}

function toLocal(origin: LatLon, p: LatLon): XY {
  const latRad = (origin.lat * Math.PI) / 180;
  return {
    x: ((p.lon - origin.lon) * Math.PI / 180) * Math.cos(latRad) * EARTH_RADIUS_M,
    y: ((p.lat - origin.lat) * Math.PI / 180) * EARTH_RADIUS_M,
  };
}

function toLatLon(origin: LatLon, p: XY): LatLon {
  const latRad = (origin.lat * Math.PI) / 180;
  return {
    lat: origin.lat + (p.y / EARTH_RADIUS_M) * (180 / Math.PI),
    lon: origin.lon + (p.x / (EARTH_RADIUS_M * Math.cos(latRad))) * (180 / Math.PI),
  };
}

function rotate(p: XY, angleRad: number): XY {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

/** Bearing (in local XY radians, CCW from +x axis) of the longest polygon edge */
function longestEdgeAngle(points: XY[]): number {
  let best = 0;
  let bestLen = -1;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = dx * dx + dy * dy;
    if (len > bestLen) {
      bestLen = len;
      best = Math.atan2(dy, dx);
    }
  }
  return best;
}

/** Intersect horizontal line y = c with polygon; returns sorted x values */
function lineIntersections(points: XY[], y: number): number[] {
  const xs: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    // Half-open interval avoids double-counting vertices exactly on the line
    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
      const t = (y - a.y) / (b.y - a.y);
      xs.push(a.x + t * (b.x - a.x));
    }
  }
  return xs.sort((p, q) => p - q);
}

/**
 * Generates an ordered list of lat/lon points covering the field boundary
 * with parallel passes spaced by the implement width, alternating direction
 * (boustrophedon / serpentine pattern).
 *
 * Throws if the boundary has fewer than 3 points or width is not positive.
 */
export function generateCoveragePath(
  boundary: LatLon[],
  options: CoverageOptions
): LatLon[] {
  const { implementWidthM, angleDeg, overlapPct = 0 } = options;

  if (boundary.length < 3) {
    throw new Error('Field boundary needs at least 3 points');
  }
  if (!(implementWidthM > 0)) {
    throw new Error('Implement width must be greater than zero');
  }
  if (overlapPct < 0 || overlapPct >= 100) {
    throw new Error('Overlap must be between 0 and 99 percent');
  }

  const origin = boundary[0];
  const local = boundary.map((p) => toLocal(origin, p));

  // Rotate so passes run along the x-axis
  const angle =
    angleDeg !== undefined ? (angleDeg * Math.PI) / 180 : longestEdgeAngle(local);
  const rotated = local.map((p) => rotate(p, -angle));

  const spacing = implementWidthM * (1 - overlapPct / 100);
  const ys = rotated.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const path: XY[] = [];
  let leftToRight = true;

  // Center the first pass half a width in from the edge so the implement
  // covers up to the boundary without overshooting it.
  for (let y = minY + spacing / 2; y <= maxY; y += spacing) {
    const xs = lineIntersections(rotated, y);
    if (xs.length < 2) continue;
    // Use the outermost span (fields are expected to be convex)
    const x0 = xs[0];
    const x1 = xs[xs.length - 1];
    if (leftToRight) {
      path.push({ x: x0, y }, { x: x1, y });
    } else {
      path.push({ x: x1, y }, { x: x0, y });
    }
    leftToRight = !leftToRight;
  }

  return path.map((p) => toLatLon(origin, rotate(p, angle)));
}

/** Approximate polygon area in square meters (shoelace on local projection) */
export function polygonAreaM2(boundary: LatLon[]): number {
  if (boundary.length < 3) return 0;
  const origin = boundary[0];
  const pts = boundary.map((p) => toLocal(origin, p));
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/** Total path length in meters for time/coverage estimates */
export function pathLengthM(path: LatLon[]): number {
  if (path.length < 2) return 0;
  const origin = path[0];
  const pts = path.map((p) => toLocal(origin, p));
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return total;
}
