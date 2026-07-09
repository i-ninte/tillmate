/**
 * MAVLink Message Builders
 * Creates MAVLink command structures for sending to the machine
 */

import { CommandLongParams, MissionItemInt, MavCmd, RoverMode } from '../types';
import {
  TARGET,
  SERVO_CHANNEL,
  IMPLEMENT_PWM,
  RELAY_CHANNEL,
  RELAY_STATE,
} from './mavlinkConstants';

/**
 * Builds a COMMAND_LONG for setting a servo position.
 * Used for controlling the implement depth.
 *
 * @param servoChannel - Servo channel number (use SERVO_CHANNEL.IMPLEMENT for implement)
 * @param pwm - PWM value (1000-2000)
 * @returns CommandLongParams structure
 */
export function buildSetServo(servoChannel: number, pwm: number): CommandLongParams {
  return {
    targetSystem: TARGET.SYSTEM_ID,
    targetComponent: TARGET.COMPONENT_ID,
    command: MavCmd.DO_SET_SERVO,
    confirmation: 0,
    param1: servoChannel,
    param2: pwm,
    param3: 0,
    param4: 0,
    param5: 0,
    param6: 0,
    param7: 0,
  };
}

/**
 * Builds a COMMAND_LONG for controlling implement depth.
 *
 * @param depthPercent - Depth percentage (0 = raised, 100 = fully lowered)
 * @returns CommandLongParams structure
 */
export function buildImplementDepth(depthPercent: number): CommandLongParams {
  // Clamp to valid range
  const clamped = Math.max(0, Math.min(100, depthPercent));

  // Map percentage to PWM: 0% -> MIN (raised), 100% -> MAX (lowered)
  const pwm = IMPLEMENT_PWM.MIN + (clamped / 100) * (IMPLEMENT_PWM.MAX - IMPLEMENT_PWM.MIN);

  return buildSetServo(SERVO_CHANNEL.IMPLEMENT, Math.round(pwm));
}

/**
 * Builds a COMMAND_LONG for setting a relay state.
 * Used for controlling tiller and pump.
 *
 * @param relayChannel - Relay channel number (0 = tiller, 1 = pump)
 * @param on - true to turn on, false to turn off
 * @returns CommandLongParams structure
 */
export function buildSetRelay(relayChannel: number, on: boolean): CommandLongParams {
  return {
    targetSystem: TARGET.SYSTEM_ID,
    targetComponent: TARGET.COMPONENT_ID,
    command: MavCmd.DO_SET_RELAY,
    confirmation: 0,
    param1: relayChannel,
    param2: on ? RELAY_STATE.ON : RELAY_STATE.OFF,
    param3: 0,
    param4: 0,
    param5: 0,
    param6: 0,
    param7: 0,
  };
}

/**
 * Builds a COMMAND_LONG for controlling the tiller.
 *
 * @param on - true to turn on, false to turn off
 * @returns CommandLongParams structure
 */
export function buildTillerCommand(on: boolean): CommandLongParams {
  return buildSetRelay(RELAY_CHANNEL.TILLER, on);
}

/**
 * Builds a COMMAND_LONG for controlling the pump.
 *
 * @param on - true to turn on, false to turn off
 * @returns CommandLongParams structure
 */
export function buildPumpCommand(on: boolean): CommandLongParams {
  return buildSetRelay(RELAY_CHANNEL.PUMP, on);
}

/**
 * Builds a COMMAND_LONG for arm/disarm.
 * Note: Our agricultural machine uses arm for "engine start ready"
 *
 * @param arm - true to arm, false to disarm
 * @returns CommandLongParams structure
 */
export function buildArmDisarm(arm: boolean): CommandLongParams {
  return {
    targetSystem: TARGET.SYSTEM_ID,
    targetComponent: TARGET.COMPONENT_ID,
    command: MavCmd.COMPONENT_ARM_DISARM,
    confirmation: 0,
    param1: arm ? 1 : 0,
    param2: 0,  // 0 = normal, 21196 = force
    param3: 0,
    param4: 0,
    param5: 0,
    param6: 0,
    param7: 0,
  };
}

/**
 * Builds a DO_SET_MODE command (param1=1 enables custom mode, param2=mode).
 */
export function buildSetMode(customMode: number): CommandLongParams {
  return {
    targetSystem: TARGET.SYSTEM_ID,
    targetComponent: TARGET.COMPONENT_ID,
    command: MavCmd.DO_SET_MODE,
    confirmation: 0,
    param1: 1, // MAV_MODE_FLAG_CUSTOM_MODE_ENABLED
    param2: customMode,
    param3: 0,
    param4: 0,
    param5: 0,
    param6: 0,
    param7: 0,
  };
}

/**
 * Builds a MISSION_START command (run the uploaded mission from the top).
 */
export function buildMissionStart(): CommandLongParams {
  return {
    targetSystem: TARGET.SYSTEM_ID,
    targetComponent: TARGET.COMPONENT_ID,
    command: MavCmd.MISSION_START,
    confirmation: 0,
    param1: 0, // first item
    param2: 0, // last item (0 = end of mission)
    param3: 0,
    param4: 0,
    param5: 0,
    param6: 0,
    param7: 0,
  };
}

/**
 * Farmer-facing mission run commands, in send order.
 */
export function buildStartWorking(): CommandLongParams[] {
  return [buildArmDisarm(true), buildSetMode(RoverMode.AUTO), buildMissionStart()];
}

export function buildPauseWorking(): CommandLongParams {
  return buildSetMode(RoverMode.HOLD);
}

export function buildResumeWorking(): CommandLongParams {
  return buildSetMode(RoverMode.AUTO);
}

export function buildReturnToStart(): CommandLongParams {
  return buildSetMode(RoverMode.RTL);
}

/**
 * Builds an emergency stop command sequence.
 * Sends disarm + all relays off + implement raised.
 *
 * @returns Array of CommandLongParams to send in sequence
 */
export function buildEmergencyStop(): CommandLongParams[] {
  return [
    // Disarm the machine
    buildArmDisarm(false),
    // Turn off tiller
    buildSetRelay(RELAY_CHANNEL.TILLER, false),
    // Turn off pump
    buildSetRelay(RELAY_CHANNEL.PUMP, false),
    // Raise implement
    buildSetServo(SERVO_CHANNEL.IMPLEMENT, IMPLEMENT_PWM.RAISED),
  ];
}

/**
 * Converts PWM value to depth in centimeters.
 * Uses linear interpolation based on machine calibration.
 *
 * @param pwm - PWM value (1000-2000)
 * @param minMm - Minimum depth in mm (default 0)
 * @param maxMm - Maximum depth in mm (default 200)
 * @returns Depth in centimeters
 */
export function pwmToDepthCm(
  pwm: number,
  minMm: number = 0,
  maxMm: number = 200
): number {
  // Normalize PWM to 0-1
  const normalized = (pwm - IMPLEMENT_PWM.MIN) / (IMPLEMENT_PWM.MAX - IMPLEMENT_PWM.MIN);

  // Map to depth range and convert to cm
  const depthMm = minMm + normalized * (maxMm - minMm);

  return depthMm / 10;
}

/**
 * Converts depth in centimeters to PWM value.
 *
 * @param depthCm - Depth in centimeters
 * @param minMm - Minimum depth in mm (default 0)
 * @param maxMm - Maximum depth in mm (default 200)
 * @returns PWM value (1000-2000)
 */
export function depthCmToPwm(
  depthCm: number,
  minMm: number = 0,
  maxMm: number = 200
): number {
  const depthMm = depthCm * 10;

  // Clamp to valid range
  const clampedMm = Math.max(minMm, Math.min(maxMm, depthMm));

  // Normalize to 0-1
  const normalized = (clampedMm - minMm) / (maxMm - minMm);

  // Map to PWM range
  const pwm = IMPLEMENT_PWM.MIN + normalized * (IMPLEMENT_PWM.MAX - IMPLEMENT_PWM.MIN);

  return Math.round(pwm);
}

/**
 * Converts a percentage (0-100) to PWM value.
 *
 * @param percent - Percentage (0 = raised, 100 = lowered)
 * @returns PWM value (1000-2000)
 */
export function percentToPwm(percent: number): number {
  const clamped = Math.max(0, Math.min(100, percent));
  return IMPLEMENT_PWM.MIN + (clamped / 100) * (IMPLEMENT_PWM.MAX - IMPLEMENT_PWM.MIN);
}

/**
 * Converts PWM value to percentage.
 *
 * @param pwm - PWM value (1000-2000)
 * @returns Percentage (0 = raised, 100 = lowered)
 */
export function pwmToPercent(pwm: number): number {
  const clamped = Math.max(IMPLEMENT_PWM.MIN, Math.min(IMPLEMENT_PWM.MAX, pwm));
  return ((clamped - IMPLEMENT_PWM.MIN) / (IMPLEMENT_PWM.MAX - IMPLEMENT_PWM.MIN)) * 100;
}
