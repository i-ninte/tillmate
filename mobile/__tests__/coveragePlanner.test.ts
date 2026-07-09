/**
 * Tests for the coverage planner service
 */

import {
  generateCoveragePath,
  polygonAreaM2,
  pathLengthM,
  LatLon,
} from '../services/coveragePlanner';

// ~100m x 100m square field near the equator (1 deg ≈ 111.19 km)
const D = 100 / 111194.9; // degrees per 100 m
const square: LatLon[] = [
  { lat: 0, lon: 0 },
  { lat: 0, lon: D },
  { lat: D, lon: D },
  { lat: D, lon: 0 },
];

describe('generateCoveragePath', () => {
  test('throws on fewer than 3 boundary points', () => {
    expect(() =>
      generateCoveragePath([square[0], square[1]], { implementWidthM: 1 })
    ).toThrow('at least 3 points');
  });

  test('throws on non-positive implement width', () => {
    expect(() => generateCoveragePath(square, { implementWidthM: 0 })).toThrow(
      'greater than zero'
    );
  });

  test('throws on invalid overlap', () => {
    expect(() =>
      generateCoveragePath(square, { implementWidthM: 1, overlapPct: 100 })
    ).toThrow('Overlap');
  });

  test('100m square with 10m implement produces 10 passes (20 points)', () => {
    const path = generateCoveragePath(square, {
      implementWidthM: 10,
      angleDeg: 0,
    });
    expect(path.length).toBe(20);
  });

  test('passes alternate direction (serpentine)', () => {
    const path = generateCoveragePath(square, {
      implementWidthM: 10,
      angleDeg: 0,
    });
    // Pass 1: west→east, pass 2: east→west
    expect(path[0].lon).toBeLessThan(path[1].lon);
    expect(path[2].lon).toBeGreaterThan(path[3].lon);
    // Consecutive passes join on the same side (short hop between lanes)
    expect(Math.abs(path[1].lon - path[2].lon)).toBeLessThan(D / 100);
  });

  test('all points stay within the boundary bounding box', () => {
    const path = generateCoveragePath(square, {
      implementWidthM: 10,
      angleDeg: 0,
    });
    const eps = 1e-9;
    for (const p of path) {
      expect(p.lat).toBeGreaterThanOrEqual(-eps);
      expect(p.lat).toBeLessThanOrEqual(D + eps);
      expect(p.lon).toBeGreaterThanOrEqual(-eps);
      expect(p.lon).toBeLessThanOrEqual(D + eps);
    }
  });

  test('first pass is inset half an implement width from the edge', () => {
    const path = generateCoveragePath(square, {
      implementWidthM: 10,
      angleDeg: 0,
    });
    const firstPassLatM = path[0].lat * 111194.9;
    expect(firstPassLatM).toBeCloseTo(5, 0);
  });

  test('overlap reduces spacing and increases pass count', () => {
    const noOverlap = generateCoveragePath(square, {
      implementWidthM: 10,
      angleDeg: 0,
    });
    const withOverlap = generateCoveragePath(square, {
      implementWidthM: 10,
      angleDeg: 0,
      overlapPct: 50,
    });
    expect(withOverlap.length).toBeGreaterThan(noOverlap.length);
  });

  test('default angle follows the longest edge', () => {
    // Rectangle longer east-west: passes should run east-west even without angleDeg
    const rect: LatLon[] = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 2 * D },
      { lat: D / 2, lon: 2 * D },
      { lat: D / 2, lon: 0 },
    ];
    const path = generateCoveragePath(rect, { implementWidthM: 10 });
    expect(path.length).toBeGreaterThanOrEqual(2);
    // First segment should span the long (lon) dimension
    const dLon = Math.abs(path[1].lon - path[0].lon);
    const dLat = Math.abs(path[1].lat - path[0].lat);
    expect(dLon).toBeGreaterThan(dLat * 10);
  });

  test('works on a triangle (non-rectangular field)', () => {
    const triangle: LatLon[] = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: D },
      { lat: D, lon: D / 2 },
    ];
    const path = generateCoveragePath(triangle, {
      implementWidthM: 10,
      angleDeg: 0,
    });
    expect(path.length).toBeGreaterThan(4);
    // Passes near the apex should be shorter than passes near the base
    const firstSpan = Math.abs(path[1].lon - path[0].lon);
    const lastSpan = Math.abs(
      path[path.length - 1].lon - path[path.length - 2].lon
    );
    expect(lastSpan).toBeLessThan(firstSpan);
  });
});

describe('polygonAreaM2', () => {
  test('100m square is ~10000 m²', () => {
    expect(polygonAreaM2(square)).toBeCloseTo(10000, -2);
  });

  test('returns 0 for degenerate polygon', () => {
    expect(polygonAreaM2([square[0], square[1]])).toBe(0);
  });
});

describe('pathLengthM', () => {
  test('two points 100m apart', () => {
    expect(pathLengthM([square[0], square[1]])).toBeCloseTo(100, 0);
  });

  test('empty and single-point paths are 0', () => {
    expect(pathLengthM([])).toBe(0);
    expect(pathLengthM([square[0]])).toBe(0);
  });
});
