/**
 * Tests for MAVLink command builders
 */

import {
  buildSetServo,
  buildSetRelay,
  buildTillerCommand,
  buildPumpCommand,
  buildImplementDepth,
  buildArmDisarm,
  buildEmergencyStop,
  pwmToDepthCm,
  depthCmToPwm,
  percentToPwm,
  pwmToPercent,
} from '../utils/mavlinkBuilders';
import { MavCmd } from '../types';
import {
  SERVO_CHANNEL,
  IMPLEMENT_PWM,
  RELAY_CHANNEL,
  RELAY_STATE,
  TARGET,
} from '../utils/mavlinkConstants';

describe('buildSetServo', () => {
  test('creates command with correct structure', () => {
    const cmd = buildSetServo(SERVO_CHANNEL.IMPLEMENT, 1500);

    expect(cmd.command).toBe(MavCmd.DO_SET_SERVO);
    expect(cmd.targetSystem).toBe(TARGET.SYSTEM_ID);
    expect(cmd.targetComponent).toBe(TARGET.COMPONENT_ID);
    expect(cmd.param1).toBe(SERVO_CHANNEL.IMPLEMENT);
    expect(cmd.param2).toBe(1500);
  });

  test('accepts different servo channels', () => {
    const cmd = buildSetServo(5, 1200);

    expect(cmd.param1).toBe(5);
    expect(cmd.param2).toBe(1200);
  });
});

describe('buildSetRelay', () => {
  test('creates ON command', () => {
    const cmd = buildSetRelay(RELAY_CHANNEL.TILLER, true);

    expect(cmd.command).toBe(MavCmd.DO_SET_RELAY);
    expect(cmd.param1).toBe(RELAY_CHANNEL.TILLER);
    expect(cmd.param2).toBe(RELAY_STATE.ON);
  });

  test('creates OFF command', () => {
    const cmd = buildSetRelay(RELAY_CHANNEL.PUMP, false);

    expect(cmd.command).toBe(MavCmd.DO_SET_RELAY);
    expect(cmd.param1).toBe(RELAY_CHANNEL.PUMP);
    expect(cmd.param2).toBe(RELAY_STATE.OFF);
  });
});

describe('buildTillerCommand', () => {
  test('creates tiller ON command', () => {
    const cmd = buildTillerCommand(true);

    expect(cmd.command).toBe(MavCmd.DO_SET_RELAY);
    expect(cmd.param1).toBe(RELAY_CHANNEL.TILLER);
    expect(cmd.param2).toBe(RELAY_STATE.ON);
  });

  test('creates tiller OFF command', () => {
    const cmd = buildTillerCommand(false);

    expect(cmd.param1).toBe(RELAY_CHANNEL.TILLER);
    expect(cmd.param2).toBe(RELAY_STATE.OFF);
  });
});

describe('buildPumpCommand', () => {
  test('creates pump ON command', () => {
    const cmd = buildPumpCommand(true);

    expect(cmd.command).toBe(MavCmd.DO_SET_RELAY);
    expect(cmd.param1).toBe(RELAY_CHANNEL.PUMP);
    expect(cmd.param2).toBe(RELAY_STATE.ON);
  });

  test('creates pump OFF command', () => {
    const cmd = buildPumpCommand(false);

    expect(cmd.param1).toBe(RELAY_CHANNEL.PUMP);
    expect(cmd.param2).toBe(RELAY_STATE.OFF);
  });
});

describe('buildImplementDepth', () => {
  test('0% maps to minimum PWM (raised)', () => {
    const cmd = buildImplementDepth(0);

    expect(cmd.param2).toBe(IMPLEMENT_PWM.MIN);
  });

  test('100% maps to maximum PWM (lowered)', () => {
    const cmd = buildImplementDepth(100);

    expect(cmd.param2).toBe(IMPLEMENT_PWM.MAX);
  });

  test('50% maps to middle PWM', () => {
    const cmd = buildImplementDepth(50);

    const expectedPwm = IMPLEMENT_PWM.MIN + 0.5 * (IMPLEMENT_PWM.MAX - IMPLEMENT_PWM.MIN);
    expect(cmd.param2).toBe(expectedPwm);
  });

  test('clamps negative values to 0', () => {
    const cmd = buildImplementDepth(-10);

    expect(cmd.param2).toBe(IMPLEMENT_PWM.MIN);
  });

  test('clamps values over 100 to 100', () => {
    const cmd = buildImplementDepth(150);

    expect(cmd.param2).toBe(IMPLEMENT_PWM.MAX);
  });
});

describe('buildArmDisarm', () => {
  test('creates arm command', () => {
    const cmd = buildArmDisarm(true);

    expect(cmd.command).toBe(MavCmd.COMPONENT_ARM_DISARM);
    expect(cmd.param1).toBe(1); // Armed
  });

  test('creates disarm command', () => {
    const cmd = buildArmDisarm(false);

    expect(cmd.command).toBe(MavCmd.COMPONENT_ARM_DISARM);
    expect(cmd.param1).toBe(0); // Disarmed
  });
});

describe('buildEmergencyStop', () => {
  test('returns array of safety commands', () => {
    const commands = buildEmergencyStop();

    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBe(4);
  });

  test('includes disarm command', () => {
    const commands = buildEmergencyStop();

    const disarmCmd = commands.find(
      cmd => cmd.command === MavCmd.COMPONENT_ARM_DISARM && cmd.param1 === 0
    );
    expect(disarmCmd).toBeDefined();
  });

  test('turns off tiller', () => {
    const commands = buildEmergencyStop();

    const tillerOff = commands.find(
      cmd =>
        cmd.command === MavCmd.DO_SET_RELAY &&
        cmd.param1 === RELAY_CHANNEL.TILLER &&
        cmd.param2 === RELAY_STATE.OFF
    );
    expect(tillerOff).toBeDefined();
  });

  test('turns off pump', () => {
    const commands = buildEmergencyStop();

    const pumpOff = commands.find(
      cmd =>
        cmd.command === MavCmd.DO_SET_RELAY &&
        cmd.param1 === RELAY_CHANNEL.PUMP &&
        cmd.param2 === RELAY_STATE.OFF
    );
    expect(pumpOff).toBeDefined();
  });

  test('raises implement', () => {
    const commands = buildEmergencyStop();

    const raiseImpl = commands.find(
      cmd =>
        cmd.command === MavCmd.DO_SET_SERVO &&
        cmd.param1 === SERVO_CHANNEL.IMPLEMENT &&
        cmd.param2 === IMPLEMENT_PWM.RAISED
    );
    expect(raiseImpl).toBeDefined();
  });
});

describe('pwmToDepthCm', () => {
  test('minimum PWM returns 0 depth', () => {
    const depth = pwmToDepthCm(IMPLEMENT_PWM.MIN);
    expect(depth).toBe(0);
  });

  test('maximum PWM returns max depth', () => {
    const depth = pwmToDepthCm(IMPLEMENT_PWM.MAX, 0, 200);
    expect(depth).toBe(20); // 200mm = 20cm
  });

  test('middle PWM returns middle depth', () => {
    const midPwm = (IMPLEMENT_PWM.MIN + IMPLEMENT_PWM.MAX) / 2;
    const depth = pwmToDepthCm(midPwm, 0, 200);
    expect(depth).toBe(10); // Half of 20cm
  });

  test('respects custom min/max ranges', () => {
    const depth = pwmToDepthCm(IMPLEMENT_PWM.MAX, 50, 250);
    expect(depth).toBe(25); // 250mm = 25cm
  });
});

describe('depthCmToPwm', () => {
  test('0 depth returns minimum PWM', () => {
    const pwm = depthCmToPwm(0);
    expect(pwm).toBe(IMPLEMENT_PWM.MIN);
  });

  test('max depth returns maximum PWM', () => {
    const pwm = depthCmToPwm(20, 0, 200); // 20cm = 200mm
    expect(pwm).toBe(IMPLEMENT_PWM.MAX);
  });

  test('clamps values outside range', () => {
    const pwm = depthCmToPwm(50, 0, 200); // 50cm > 20cm max
    expect(pwm).toBe(IMPLEMENT_PWM.MAX);
  });
});

describe('percentToPwm', () => {
  test('0% returns minimum PWM', () => {
    const pwm = percentToPwm(0);
    expect(pwm).toBe(IMPLEMENT_PWM.MIN);
  });

  test('100% returns maximum PWM', () => {
    const pwm = percentToPwm(100);
    expect(pwm).toBe(IMPLEMENT_PWM.MAX);
  });

  test('50% returns middle PWM', () => {
    const pwm = percentToPwm(50);
    const expected = IMPLEMENT_PWM.MIN + 0.5 * (IMPLEMENT_PWM.MAX - IMPLEMENT_PWM.MIN);
    expect(pwm).toBe(expected);
  });
});

describe('pwmToPercent', () => {
  test('minimum PWM returns 0%', () => {
    const percent = pwmToPercent(IMPLEMENT_PWM.MIN);
    expect(percent).toBe(0);
  });

  test('maximum PWM returns 100%', () => {
    const percent = pwmToPercent(IMPLEMENT_PWM.MAX);
    expect(percent).toBe(100);
  });

  test('middle PWM returns 50%', () => {
    const midPwm = (IMPLEMENT_PWM.MIN + IMPLEMENT_PWM.MAX) / 2;
    const percent = pwmToPercent(midPwm);
    expect(percent).toBe(50);
  });

  test('clamps values outside range', () => {
    expect(pwmToPercent(500)).toBe(0);
    expect(pwmToPercent(2500)).toBe(100);
  });
});

describe('round-trip conversions', () => {
  test('percent -> pwm -> percent', () => {
    for (const percent of [0, 25, 50, 75, 100]) {
      const pwm = percentToPwm(percent);
      const backToPercent = pwmToPercent(pwm);
      expect(backToPercent).toBeCloseTo(percent, 1);
    }
  });

  test('depth -> pwm -> depth', () => {
    for (const depthCm of [0, 5, 10, 15, 20]) {
      const pwm = depthCmToPwm(depthCm, 0, 200);
      const backToDepth = pwmToDepthCm(pwm, 0, 200);
      expect(backToDepth).toBeCloseTo(depthCm, 1);
    }
  });
});
