/**
 * Tests for the mission compiler service
 */

import {
  compileMission,
  compileMissionCompact,
  validateMission,
  getMissionStats,
} from '../services/missionCompiler';
import { FieldPlan, WorkPoint } from '../types';
import { MavCmdNav, MavCmdDo, IMPLEMENT_PWM, RELAY_CHANNEL } from '../utils/mavlinkConstants';

// Helper to create a test work point
function createWorkPoint(
  id: string,
  seq: number,
  lat: number,
  lon: number,
  options: Partial<WorkPoint> = {}
): WorkPoint {
  return {
    id,
    seq,
    lat,
    lon,
    implementLowered: false,
    tillerOn: false,
    pumpOn: false,
    label: `Point ${seq + 1}`,
    ...options,
  };
}

// Helper to create a test field plan
function createFieldPlan(workPoints: WorkPoint[]): FieldPlan {
  return {
    localId: 'test-plan',
    machineId: 1,
    name: 'Test Plan',
    workPoints,
    returnToHome: false,
  };
}

describe('compileMission', () => {
  test('returns empty array for empty plan', () => {
    const plan = createFieldPlan([]);
    const items = compileMission(plan);
    expect(items).toHaveLength(0);
  });

  test('creates correct items for single work point', () => {
    const plan = createFieldPlan([
      createWorkPoint('wp-1', 0, 37.7749, -122.4194, {
        implementLowered: true,
        tillerOn: true,
        pumpOn: false,
      }),
    ]);

    const items = compileMission(plan);

    // Should have: home waypoint + (servo + 2 relays + waypoint + 3 safety commands)
    expect(items.length).toBeGreaterThan(1);

    // First item should be a NAV_WAYPOINT
    expect(items[0].command).toBe(MavCmdNav.NAV_WAYPOINT);
    expect(items[0].current).toBe(1);

    // Check sequence numbers are consecutive
    items.forEach((item, index) => {
      expect(item.seq).toBe(index);
    });
  });

  test('creates servo commands for implement state', () => {
    const plan = createFieldPlan([
      createWorkPoint('wp-1', 0, 37.7749, -122.4194, {
        implementLowered: true,
      }),
    ]);

    const items = compileMission(plan);

    // Find servo commands
    const servoItems = items.filter(item => item.command === MavCmdDo.DO_SET_SERVO);
    expect(servoItems.length).toBeGreaterThan(0);

    // Check that one servo command sets to lowered PWM
    const loweredCommand = servoItems.find(item => item.param2 === IMPLEMENT_PWM.LOWERED);
    expect(loweredCommand).toBeDefined();
  });

  test('creates relay commands for tiller and pump', () => {
    const plan = createFieldPlan([
      createWorkPoint('wp-1', 0, 37.7749, -122.4194, {
        tillerOn: true,
        pumpOn: true,
      }),
    ]);

    const items = compileMission(plan);

    // Find relay commands
    const relayItems = items.filter(item => item.command === MavCmdDo.DO_SET_RELAY);
    expect(relayItems.length).toBeGreaterThan(0);

    // Check for tiller ON command
    const tillerOn = relayItems.find(
      item => item.param1 === RELAY_CHANNEL.TILLER && item.param2 === 1
    );
    expect(tillerOn).toBeDefined();

    // Check for pump ON command
    const pumpOn = relayItems.find(
      item => item.param1 === RELAY_CHANNEL.PUMP && item.param2 === 1
    );
    expect(pumpOn).toBeDefined();
  });

  test('creates waypoints with correct coordinates', () => {
    const lat = 37.7749;
    const lon = -122.4194;

    const plan = createFieldPlan([createWorkPoint('wp-1', 0, lat, lon)]);

    const items = compileMission(plan);

    // Find waypoint items
    const waypointItems = items.filter(item => item.command === MavCmdNav.NAV_WAYPOINT);

    // Should have at least the home waypoint
    expect(waypointItems.length).toBeGreaterThan(0);

    // Check coordinates are in degE7 format
    const firstWaypoint = waypointItems[0];
    expect(firstWaypoint.x).toBe(Math.round(lat * 1e7));
    expect(firstWaypoint.y).toBe(Math.round(lon * 1e7));
  });

  test('handles multiple work points', () => {
    const plan = createFieldPlan([
      createWorkPoint('wp-1', 0, 37.7749, -122.4194),
      createWorkPoint('wp-2', 1, 37.7750, -122.4195),
      createWorkPoint('wp-3', 2, 37.7751, -122.4196),
    ]);

    const items = compileMission(plan);

    // Should have multiple items
    expect(items.length).toBeGreaterThan(3);

    // Check all sequences are valid
    items.forEach((item, index) => {
      expect(item.seq).toBe(index);
    });
  });
});

describe('compileMissionCompact', () => {
  test('creates fewer items than full mission', () => {
    const plan = createFieldPlan([
      createWorkPoint('wp-1', 0, 37.7749, -122.4194, {
        implementLowered: true,
        tillerOn: true,
      }),
      createWorkPoint('wp-2', 1, 37.7750, -122.4195),
    ]);

    const fullItems = compileMission(plan);
    const compactItems = compileMissionCompact(plan);

    // Compact should have fewer items (no safety commands per waypoint)
    expect(compactItems.length).toBeLessThan(fullItems.length);
  });

  test('ends with safety commands', () => {
    const plan = createFieldPlan([
      createWorkPoint('wp-1', 0, 37.7749, -122.4194, {
        tillerOn: true,
        pumpOn: true,
      }),
    ]);

    const items = compileMissionCompact(plan);

    // Last items should be safety commands (turn off everything)
    const lastServo = items.filter(i => i.command === MavCmdDo.DO_SET_SERVO).pop();
    expect(lastServo?.param2).toBe(IMPLEMENT_PWM.RAISED);

    const lastRelays = items.filter(i => i.command === MavCmdDo.DO_SET_RELAY).slice(-2);
    lastRelays.forEach(relay => {
      expect(relay.param2).toBe(0); // OFF
    });
  });
});

describe('validateMission', () => {
  test('rejects empty mission', () => {
    const result = validateMission([]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  test('rejects mission without waypoint as first item', () => {
    const items = [
      {
        seq: 0,
        frame: 3,
        command: MavCmdDo.DO_SET_RELAY, // Not a waypoint
        current: 1,
        autocontinue: 1,
        param1: 0,
        param2: 0,
        param3: 0,
        param4: 0,
        x: 0,
        y: 0,
        z: 0,
        missionType: 0,
      },
    ];

    const result = validateMission(items);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('waypoint');
  });

  test('rejects mission with bad sequence numbers', () => {
    const plan = createFieldPlan([createWorkPoint('wp-1', 0, 37.7749, -122.4194)]);
    const items = compileMission(plan);

    // Corrupt a sequence number
    items[2].seq = 99;

    const result = validateMission(items);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('sequence');
  });

  test('accepts valid mission', () => {
    const plan = createFieldPlan([
      createWorkPoint('wp-1', 0, 37.7749, -122.4194),
      createWorkPoint('wp-2', 1, 37.7750, -122.4195),
    ]);

    const items = compileMission(plan);
    const result = validateMission(items);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('getMissionStats', () => {
  test('returns correct counts', () => {
    const plan = createFieldPlan([
      createWorkPoint('wp-1', 0, 37.7749, -122.4194, {
        implementLowered: true,
        tillerOn: true,
        pumpOn: true,
      }),
      createWorkPoint('wp-2', 1, 37.7750, -122.4195),
    ]);

    const items = compileMission(plan);
    const stats = getMissionStats(items);

    expect(stats.totalItems).toBe(items.length);
    expect(stats.waypointCount).toBeGreaterThan(0);
    expect(stats.servoCommands).toBeGreaterThan(0);
    expect(stats.relayCommands).toBeGreaterThan(0);
  });
});
