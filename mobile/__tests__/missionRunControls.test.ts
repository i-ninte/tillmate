/**
 * Tests for mission run command builders (Start / Pause / Resume / RTL)
 */

import {
  buildSetMode,
  buildMissionStart,
  buildStartWorking,
  buildPauseWorking,
  buildResumeWorking,
  buildReturnToStart,
} from '../utils/mavlinkBuilders';
import { MavCmd, RoverMode } from '../types';

describe('run command builders', () => {
  test('buildSetMode enables custom mode with the given mode number', () => {
    const cmd = buildSetMode(RoverMode.AUTO);
    expect(cmd.command).toBe(MavCmd.DO_SET_MODE);
    expect(cmd.param1).toBe(1);
    expect(cmd.param2).toBe(RoverMode.AUTO);
  });

  test('buildMissionStart runs the full mission', () => {
    const cmd = buildMissionStart();
    expect(cmd.command).toBe(MavCmd.MISSION_START);
    expect(cmd.param1).toBe(0);
    expect(cmd.param2).toBe(0);
  });

  test('start working sequence: arm → AUTO → MISSION_START', () => {
    const seq = buildStartWorking();
    expect(seq.map((c) => c.command)).toEqual([
      MavCmd.COMPONENT_ARM_DISARM,
      MavCmd.DO_SET_MODE,
      MavCmd.MISSION_START,
    ]);
    expect(seq[0].param1).toBe(1); // arm
    expect(seq[1].param2).toBe(RoverMode.AUTO);
  });

  test('pause uses HOLD, resume uses AUTO, return uses RTL', () => {
    expect(buildPauseWorking().param2).toBe(RoverMode.HOLD);
    expect(buildResumeWorking().param2).toBe(RoverMode.AUTO);
    expect(buildReturnToStart().param2).toBe(RoverMode.RTL);
  });
});
