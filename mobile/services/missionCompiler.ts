/**
 * Mission Compiler Service
 * Converts a FieldPlan (farmer's selections) into MAVLink MissionItemInt[] array
 * for upload to the machine via the MAVLink mission protocol.
 */

import { FieldPlan, WorkPoint, MissionItemInt } from '../types';
import {
  MavFrame,
  MavCmdNav,
  MavCmdDo,
  MavMissionType,
  TARGET,
  SERVO_CHANNEL,
  IMPLEMENT_PWM,
  RELAY_CHANNEL,
  RELAY_STATE,
  WAYPOINT_ACCEPTANCE_RADIUS,
} from '../utils/mavlinkConstants';
import { depthCmToPwm, OPERATIONS } from './operations';

/**
 * Resolves the PWM used when the implement is lowered.
 * Uses the plan's operation depth when set, otherwise the fixed default.
 */
function loweredPwmForPlan(plan: FieldPlan): number {
  if (plan.depthCm !== undefined && plan.depthCm > 0) {
    const maxDepth = plan.operation
      ? OPERATIONS[plan.operation].maxDepthCm
      : 30;
    return depthCmToPwm(plan.depthCm, maxDepth || 30);
  }
  return IMPLEMENT_PWM.LOWERED;
}

/**
 * Creates a base mission item with common fields
 */
function createBaseItem(seq: number, command: number): MissionItemInt {
  return {
    seq,
    frame: MavFrame.GLOBAL_RELATIVE_ALT_INT,
    command,
    current: seq === 0 ? 1 : 0,  // First item is current
    autocontinue: 1,
    param1: 0,
    param2: 0,
    param3: 0,
    param4: 0,
    x: 0,  // lat in degE7
    y: 0,  // lon in degE7
    z: 0,  // altitude
    missionType: MavMissionType.MISSION,
  };
}

/**
 * Creates a NAV_WAYPOINT mission item
 */
function createWaypointItem(
  seq: number,
  lat: number,
  lon: number,
  acceptRadius: number = WAYPOINT_ACCEPTANCE_RADIUS
): MissionItemInt {
  return {
    ...createBaseItem(seq, MavCmdNav.NAV_WAYPOINT),
    param2: acceptRadius,  // Acceptance radius in meters
    x: Math.round(lat * 1e7),  // Convert degrees to degE7
    y: Math.round(lon * 1e7),
    z: 0,  // Ground level
  };
}

/**
 * Creates a DO_SET_SERVO mission item (implement depth control)
 * @param seq - Sequence number
 * @param pwm - PWM value (1000-2000)
 */
function createServoItem(seq: number, pwm: number): MissionItemInt {
  return {
    ...createBaseItem(seq, MavCmdDo.DO_SET_SERVO),
    param1: SERVO_CHANNEL.IMPLEMENT,  // Servo channel
    param2: pwm,  // PWM value
  };
}

/**
 * Creates a DO_SET_RELAY mission item (tiller or pump control)
 * @param seq - Sequence number
 * @param relay - Relay channel (0=tiller, 1=pump)
 * @param on - true to turn on, false to turn off
 */
function createRelayItem(seq: number, relay: number, on: boolean): MissionItemInt {
  return {
    ...createBaseItem(seq, MavCmdDo.DO_SET_RELAY),
    param1: relay,
    param2: on ? RELAY_STATE.ON : RELAY_STATE.OFF,
  };
}

/**
 * Creates a NAV_RETURN_TO_LAUNCH mission item
 * Machine will return to the home/starting location
 */
function createReturnToLaunchItem(seq: number): MissionItemInt {
  return createBaseItem(seq, MavCmdNav.NAV_RETURN_TO_LAUNCH);
}

/**
 * Compiles a FieldPlan into a sequence of MAVLink mission items.
 *
 * For each work point, the mission sequence is:
 * 1. Set implement position (raised or lowered)
 * 2. Set tiller relay
 * 3. Set pump relay
 * 4. Navigate to waypoint
 * 5. (After arrival) Turn off tiller
 * 6. (After arrival) Turn off pump
 * 7. (After arrival) Raise implement
 *
 * The first item (seq 0) must always be a NAV_WAYPOINT per MAVLink spec.
 *
 * @param plan - The field plan to compile
 * @returns Array of mission items ready for upload
 */
export function compileMission(plan: FieldPlan): MissionItemInt[] {
  const items: MissionItemInt[] = [];

  if (plan.workPoints.length === 0) {
    return [];
  }

  let seq = 0;
  const loweredPwm = loweredPwmForPlan(plan);

  // First item must be a waypoint (MAVLink requirement)
  // Use the first work point as the home/start location
  const firstPoint = plan.workPoints[0];
  const homeItem = createWaypointItem(seq++, firstPoint.lat, firstPoint.lon);
  homeItem.current = 1;  // Mark as current (starting point)
  items.push(homeItem);

  // Process each work point
  for (const workPoint of plan.workPoints) {
    // 1. Set implement position BEFORE arriving at waypoint
    if (workPoint.implementLowered) {
      items.push(createServoItem(seq++, loweredPwm));
    } else {
      items.push(createServoItem(seq++, IMPLEMENT_PWM.RAISED));
    }

    // 2. Set tiller state
    items.push(createRelayItem(seq++, RELAY_CHANNEL.TILLER, workPoint.tillerOn));

    // 3. Set pump state
    items.push(createRelayItem(seq++, RELAY_CHANNEL.PUMP, workPoint.pumpOn));

    // 4. Navigate to the work point
    items.push(createWaypointItem(seq++, workPoint.lat, workPoint.lon));

    // 5-7. After arriving at this point, turn everything off
    // (for safety - actions at next point will override)
    items.push(createRelayItem(seq++, RELAY_CHANNEL.TILLER, false));
    items.push(createRelayItem(seq++, RELAY_CHANNEL.PUMP, false));
    items.push(createServoItem(seq++, IMPLEMENT_PWM.RAISED));
  }

  // Add Return to Launch if enabled
  if (plan.returnToHome) {
    items.push(createReturnToLaunchItem(seq++));
  }

  return items;
}

/**
 * Compiles a simplified mission with just waypoints and actions at each point.
 * This version doesn't add safety "turn off" commands after each point.
 * Use this when you need a more compact mission.
 *
 * @param plan - The field plan to compile
 * @returns Array of mission items ready for upload
 */
export function compileMissionCompact(plan: FieldPlan): MissionItemInt[] {
  const items: MissionItemInt[] = [];

  if (plan.workPoints.length === 0) {
    return [];
  }

  let seq = 0;
  const loweredPwm = loweredPwmForPlan(plan);

  // First item must be a waypoint (MAVLink requirement)
  const firstPoint = plan.workPoints[0];
  const homeItem = createWaypointItem(seq++, firstPoint.lat, firstPoint.lon);
  homeItem.current = 1;
  items.push(homeItem);

  // Process each work point
  for (const workPoint of plan.workPoints) {
    // Set implement position
    items.push(createServoItem(
      seq++,
      workPoint.implementLowered ? loweredPwm : IMPLEMENT_PWM.RAISED
    ));

    // Set tiller state
    items.push(createRelayItem(seq++, RELAY_CHANNEL.TILLER, workPoint.tillerOn));

    // Set pump state
    items.push(createRelayItem(seq++, RELAY_CHANNEL.PUMP, workPoint.pumpOn));

    // Navigate to the work point
    items.push(createWaypointItem(seq++, workPoint.lat, workPoint.lon));
  }

  // Final safety: turn everything off at the end
  items.push(createRelayItem(seq++, RELAY_CHANNEL.TILLER, false));
  items.push(createRelayItem(seq++, RELAY_CHANNEL.PUMP, false));
  items.push(createServoItem(seq++, IMPLEMENT_PWM.RAISED));

  // Add Return to Launch if enabled
  if (plan.returnToHome) {
    items.push(createReturnToLaunchItem(seq++));
  }

  return items;
}

/**
 * Validates a compiled mission before upload.
 *
 * @param items - The mission items to validate
 * @returns Object with valid flag and any error message
 */
export function validateMission(items: MissionItemInt[]): { valid: boolean; error?: string } {
  if (items.length === 0) {
    return { valid: false, error: 'Mission is empty' };
  }

  // First item must be a NAV_WAYPOINT
  if (items[0].command !== MavCmdNav.NAV_WAYPOINT) {
    return { valid: false, error: 'First mission item must be a waypoint' };
  }

  // First item must be marked as current
  if (items[0].current !== 1) {
    return { valid: false, error: 'First mission item must be marked as current' };
  }

  // Check sequence numbers are consecutive
  for (let i = 0; i < items.length; i++) {
    if (items[i].seq !== i) {
      return { valid: false, error: `Invalid sequence at item ${i}: expected ${i}, got ${items[i].seq}` };
    }
  }

  // Check for at least one navigation waypoint (besides home)
  const hasWaypoint = items.slice(1).some(item => item.command === MavCmdNav.NAV_WAYPOINT);
  if (!hasWaypoint) {
    return { valid: false, error: 'Mission must have at least one waypoint' };
  }

  return { valid: true };
}

/**
 * Gets mission statistics for display
 */
export function getMissionStats(items: MissionItemInt[]): {
  totalItems: number;
  waypointCount: number;
  servoCommands: number;
  relayCommands: number;
} {
  return {
    totalItems: items.length,
    waypointCount: items.filter(i => i.command === MavCmdNav.NAV_WAYPOINT).length,
    servoCommands: items.filter(i => i.command === MavCmdDo.DO_SET_SERVO).length,
    relayCommands: items.filter(i => i.command === MavCmdDo.DO_SET_RELAY).length,
  };
}
