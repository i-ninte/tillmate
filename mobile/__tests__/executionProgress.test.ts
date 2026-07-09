/**
 * Tests for live mission execution progress mapping
 */

import { compileMission, workPointNumberForSeq } from '../services/missionCompiler';
import { buildWorkPointsFromPath } from '../services/operations';
import { parseMissionSeq } from '../utils/mavlinkParser';
import { MavCmdNav } from '../utils/mavlinkConstants';
import { useMissionStore } from '../store/missionStore';

const path = [
  { lat: 5.6037, lon: -0.187 },
  { lat: 5.6038, lon: -0.187 },
  { lat: 5.6039, lon: -0.187 },
];

function compiled() {
  const points = buildWorkPointsFromPath(path, 'tilling');
  return compileMission({
    localId: 'x',
    machineId: 1,
    name: 'X',
    workPoints: points,
    returnToHome: false,
    operation: 'tilling',
  });
}

describe('workPointNumberForSeq', () => {
  test('home item (seq 0) maps to 0', () => {
    expect(workPointNumberForSeq(compiled(), 0)).toBe(0);
  });

  test('each NAV_WAYPOINT seq maps to its 1-based point number', () => {
    const items = compiled();
    const navSeqs = items
      .map((i, idx) => ({ cmd: i.command, idx }))
      .filter((e, i) => e.cmd === MavCmdNav.NAV_WAYPOINT && e.idx > 0)
      .map((e) => e.idx);
    expect(workPointNumberForSeq(items, navSeqs[0])).toBe(1);
    expect(workPointNumberForSeq(items, navSeqs[1])).toBe(2);
    expect(workPointNumberForSeq(items, navSeqs[2])).toBe(3);
  });

  test('seq between waypoints reports the last waypoint passed', () => {
    const items = compiled();
    // Items right after the first NAV_WAYPOINT (relay/servo off commands)
    const firstNav = items.findIndex((i, idx) => idx > 0 && i.command === MavCmdNav.NAV_WAYPOINT);
    expect(workPointNumberForSeq(items, firstNav + 1)).toBe(1);
  });

  test('out-of-range seq clamps to total waypoints', () => {
    const items = compiled();
    expect(workPointNumberForSeq(items, 9999)).toBe(3);
  });
});

describe('parseMissionSeq', () => {
  test('parses little-endian seq', () => {
    expect(parseMissionSeq(new Uint8Array([5, 1])).seq).toBe(261);
  });

  test('handles zero-trimmed payload', () => {
    expect(parseMissionSeq(new Uint8Array([])).seq).toBe(0);
  });
});

describe('missionStore execution progress', () => {
  test('setExecutionProgress merges and resetExecution clears', () => {
    const store = useMissionStore.getState();
    store.setExecutionProgress({ currentSeq: 4 });
    store.setExecutionProgress({ reachedSeq: 3 });
    expect(useMissionStore.getState().executionProgress).toEqual({ currentSeq: 4, reachedSeq: 3 });
    useMissionStore.getState().resetExecution();
    expect(useMissionStore.getState().executionProgress).toEqual({ currentSeq: null, reachedSeq: null });
  });
});
