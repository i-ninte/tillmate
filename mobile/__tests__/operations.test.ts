/**
 * Tests for operations service and operation/depth integration
 */

import {
  OPERATIONS,
  depthCmToPwm,
  applyOperationToPoints,
  buildWorkPointsFromPath,
} from '../services/operations';
import { compileMission } from '../services/missionCompiler';
import { useMissionStore } from '../store/missionStore';
import { FieldPlan, WorkPoint } from '../types/mission';
import { MavCmdDo, IMPLEMENT_PWM } from '../utils/mavlinkConstants';

const D = 100 / 111194.9;
const squareBoundary = [
  { lat: 0, lon: 0 },
  { lat: 0, lon: D },
  { lat: D, lon: D },
  { lat: D, lon: 0 },
];

describe('depthCmToPwm', () => {
  test('0 cm is fully raised PWM', () => {
    expect(depthCmToPwm(0, 30)).toBe(IMPLEMENT_PWM.MIN);
  });

  test('max depth is fully lowered PWM', () => {
    expect(depthCmToPwm(30, 30)).toBe(IMPLEMENT_PWM.MAX);
  });

  test('half depth is midpoint PWM', () => {
    expect(depthCmToPwm(15, 30)).toBe(1500);
  });

  test('clamps out-of-range depth', () => {
    expect(depthCmToPwm(50, 30)).toBe(IMPLEMENT_PWM.MAX);
    expect(depthCmToPwm(-5, 30)).toBe(IMPLEMENT_PWM.MIN);
  });
});

describe('operation configs', () => {
  test('tilling and weeding need depth, spraying does not', () => {
    expect(OPERATIONS.tilling.needsDepth).toBe(true);
    expect(OPERATIONS.weeding.needsDepth).toBe(true);
    expect(OPERATIONS.spraying.needsDepth).toBe(false);
  });

  test('spraying uses pump only, implement raised', () => {
    expect(OPERATIONS.spraying.pumpOn).toBe(true);
    expect(OPERATIONS.spraying.tillerOn).toBe(false);
    expect(OPERATIONS.spraying.implementLowered).toBe(false);
  });
});

describe('buildWorkPointsFromPath / applyOperationToPoints', () => {
  const path = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: D },
  ];

  test('builds sequenced points with operation states', () => {
    const points = buildWorkPointsFromPath(path, 'tilling');
    expect(points).toHaveLength(2);
    expect(points[0].seq).toBe(0);
    expect(points[1].seq).toBe(1);
    expect(points.every((p) => p.implementLowered && p.tillerOn && !p.pumpOn)).toBe(true);
  });

  test('changing operation re-applies states to existing points', () => {
    const tilled = buildWorkPointsFromPath(path, 'tilling');
    const sprayed = applyOperationToPoints(tilled, 'spraying');
    expect(sprayed.every((p) => p.pumpOn && !p.tillerOn && !p.implementLowered)).toBe(true);
    // Coordinates and order preserved
    expect(sprayed.map((p) => p.seq)).toEqual([0, 1]);
    expect(sprayed[1].lon).toBe(D);
  });
});

describe('mission compiler with operation depth', () => {
  function planWith(depthCm: number | undefined, points: WorkPoint[]): FieldPlan {
    return {
      localId: 'p',
      machineId: 1,
      name: 'P',
      workPoints: points,
      returnToHome: false,
      operation: 'tilling',
      depthCm,
    };
  }

  test('lowered servo PWM reflects plan depth', () => {
    const points = buildWorkPointsFromPath([{ lat: 0, lon: 0 }], 'tilling');
    const items = compileMission(planWith(15, points));
    const servoItems = items.filter((i) => i.command === MavCmdDo.DO_SET_SERVO);
    expect(servoItems[0].param2).toBe(1500); // 15cm of 30cm max
  });

  test('falls back to default LOWERED PWM without depth', () => {
    const points = buildWorkPointsFromPath([{ lat: 0, lon: 0 }], 'tilling');
    const items = compileMission(planWith(undefined, points));
    const servoItems = items.filter((i) => i.command === MavCmdDo.DO_SET_SERVO);
    expect(servoItems[0].param2).toBe(IMPLEMENT_PWM.LOWERED);
  });
});

describe('missionStore operation flow', () => {
  beforeEach(() => {
    useMissionStore.getState().reset();
    useMissionStore.getState().createNewPlan(1, 'Store Test');
  });

  test('generatePath requires boundary and operation', () => {
    const store = useMissionStore.getState();
    expect(store.generatePath().ok).toBe(false);
    store.setBoundary(squareBoundary);
    expect(useMissionStore.getState().generatePath().ok).toBe(false);
    useMissionStore.getState().setOperation('tilling');
    useMissionStore.getState().setImplementWidth(10);
    const result = useMissionStore.getState().generatePath();
    expect(result.ok).toBe(true);
    expect(useMissionStore.getState().workPoints.length).toBe(20);
  });

  test('setOperation after generation re-applies states and default depth', () => {
    const s = useMissionStore.getState();
    s.setBoundary(squareBoundary);
    s.setOperation('tilling');
    s.setImplementWidth(10);
    useMissionStore.getState().generatePath();

    useMissionStore.getState().setOperation('spraying');
    const state = useMissionStore.getState();
    expect(state.currentPlan?.operation).toBe('spraying');
    expect(state.currentPlan?.depthCm).toBe(0);
    expect(state.workPoints.every((p) => p.pumpOn && !p.tillerOn)).toBe(true);
    expect(state.workPoints.length).toBe(20);
  });

  test('switching to weeding uses its default depth', () => {
    const s = useMissionStore.getState();
    s.setBoundary(squareBoundary);
    s.setOperation('weeding');
    expect(useMissionStore.getState().currentPlan?.depthCm).toBe(
      OPERATIONS.weeding.defaultDepthCm
    );
  });
});
