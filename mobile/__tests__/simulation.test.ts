/**
 * Tests for the path simulation service
 */

import { positionAtDistance, estimateDurationS } from '../services/simulation';
import { LatLon } from '../services/coveragePlanner';

const D = 100 / 111194.9; // degrees per 100 m
// L-shaped path: 100m north, then 100m east
const path: LatLon[] = [
  { lat: 0, lon: 0 },
  { lat: D, lon: 0 },
  { lat: D, lon: D },
];

describe('positionAtDistance', () => {
  test('returns null for empty path', () => {
    expect(positionAtDistance([], 10)).toBeNull();
  });

  test('start of path at distance 0', () => {
    const pos = positionAtDistance(path, 0)!;
    expect(pos.lat).toBeCloseTo(0, 9);
    expect(pos.lon).toBeCloseTo(0, 9);
    expect(pos.done).toBe(false);
    expect(pos.headingDeg).toBeCloseTo(0, 0); // heading north
  });

  test('halfway along first segment', () => {
    const pos = positionAtDistance(path, 50)!;
    expect(pos.lat * 111194.9).toBeCloseTo(50, 0);
    expect(pos.segmentIndex).toBe(0);
    expect(pos.progress).toBeCloseTo(0.25, 2);
  });

  test('second segment heads east', () => {
    const pos = positionAtDistance(path, 150)!;
    expect(pos.segmentIndex).toBe(1);
    expect(pos.headingDeg).toBeCloseTo(90, 0);
    expect(pos.lon * 111194.9).toBeCloseTo(50, 0);
  });

  test('clamps past the end and reports done', () => {
    const pos = positionAtDistance(path, 500)!;
    expect(pos.done).toBe(true);
    expect(pos.progress).toBe(1);
    expect(pos.lat).toBeCloseTo(D, 9);
    expect(pos.lon).toBeCloseTo(D, 9);
  });

  test('single-point path is immediately done', () => {
    const pos = positionAtDistance([path[0]], 0)!;
    expect(pos.done).toBe(true);
  });
});

describe('estimateDurationS', () => {
  test('200m at 2 m/s takes 100s', () => {
    expect(estimateDurationS(path, 2)).toBeCloseTo(100, 0);
  });

  test('zero speed returns 0', () => {
    expect(estimateDurationS(path, 0)).toBe(0);
  });
});
