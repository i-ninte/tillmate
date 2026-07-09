/**
 * Tests for mission message encoding/parsing and the upload handshake
 */

import {
  encodeMissionCount,
  encodeMissionClearAll,
  encodeMissionItemInt,
  parseMissionRequest,
  parseMissionAck,
  parseBuffer,
} from '../utils/mavlinkParser';
import { uploadMission, MavlinkSender, MavlinkReceiver } from '../services/missionUploader';
import { compileMission } from '../services/missionCompiler';
import { buildWorkPointsFromPath } from '../services/operations';
import { MavMsgId, MavMissionResult, MissionItemInt } from '../types';
import { MavCmdNav } from '../utils/mavlinkConstants';

describe('mission message encoding', () => {
  test('MISSION_COUNT round-trips through the parser', () => {
    const encoded = encodeMissionCount(42, 1, 1);
    const { messages } = parseBuffer(encoded);
    expect(messages).toHaveLength(1);
    expect(messages[0].msgId).toBe(MavMsgId.MISSION_COUNT);
    const view = new DataView(messages[0].payload.buffer, messages[0].payload.byteOffset);
    expect(view.getUint16(0, true)).toBe(42);
  });

  test('MISSION_CLEAR_ALL parses with valid CRC', () => {
    const encoded = encodeMissionClearAll(1, 1);
    const { messages } = parseBuffer(encoded);
    expect(messages).toHaveLength(1);
    expect(messages[0].msgId).toBe(MavMsgId.MISSION_CLEAR_ALL);
  });

  test('MISSION_ITEM_INT round-trips coordinates and command', () => {
    const item: MissionItemInt = {
      seq: 3,
      frame: 6,
      command: MavCmdNav.NAV_WAYPOINT,
      current: 0,
      autocontinue: 1,
      param1: 0,
      param2: 1.5,
      param3: 0,
      param4: 0,
      x: Math.round(5.6037 * 1e7),
      y: Math.round(-0.187 * 1e7),
      z: 0,
      missionType: 0,
    };
    const encoded = encodeMissionItemInt(item, 1, 1);
    const { messages } = parseBuffer(encoded);
    expect(messages).toHaveLength(1);
    const p = messages[0].payload;
    const view = new DataView(p.buffer, p.byteOffset);
    expect(view.getInt32(16, true)).toBe(item.x);
    expect(view.getInt32(20, true)).toBe(item.y);
    expect(view.getUint16(28, true)).toBe(3);
    expect(view.getUint16(30, true)).toBe(MavCmdNav.NAV_WAYPOINT);
  });

  test('parseMissionRequest handles truncated (zero-trimmed) payload', () => {
    expect(parseMissionRequest(new Uint8Array([]))!.seq).toBe(0);
    expect(parseMissionRequest(new Uint8Array([7, 0, 1, 1]))!.seq).toBe(7);
  });

  test('parseMissionAck handles truncated payload as ACCEPTED', () => {
    expect(parseMissionAck(new Uint8Array([1]))!.type).toBe(0);
    expect(parseMissionAck(new Uint8Array([1, 1, 5]))!.type).toBe(5);
  });
});

describe('uploadMission handshake', () => {
  function makeFakeMachine(items: MissionItemInt[], opts?: { rejectWith?: MavMissionResult }) {
    let nextRequest = 0;
    const sent: MissionItemInt[] = [];
    let counted = 0;

    const sender: MavlinkSender = {
      async sendMissionClearAll() {},
      async sendMissionCount(count: number) {
        counted = count;
        nextRequest = 0;
      },
      async sendMissionItemInt(item: MissionItemInt) {
        sent.push(item);
        nextRequest = item.seq + 1;
      },
    };

    const receiver: MavlinkReceiver = {
      async waitForMessage(msgId: MavMsgId) {
        if (msgId === MavMsgId.MISSION_REQUEST_INT) {
          if (nextRequest < counted) {
            return { seq: nextRequest };
          }
          return null; // No more requests — uploader should look for ACK
        }
        if (msgId === MavMsgId.MISSION_ACK) {
          if (sent.length === counted || opts?.rejectWith !== undefined) {
            return { type: opts?.rejectWith ?? MavMissionResult.ACCEPTED };
          }
          return null;
        }
        return null;
      },
    };

    return { sender, receiver, sent };
  }

  function compiledItems(): MissionItemInt[] {
    const points = buildWorkPointsFromPath(
      [
        { lat: 5.6037, lon: -0.187 },
        { lat: 5.6038, lon: -0.187 },
      ],
      'tilling'
    );
    return compileMission({
      localId: 't',
      machineId: 1,
      name: 'T',
      workPoints: points,
      returnToHome: true,
      operation: 'tilling',
      depthCm: 15,
    });
  }

  test('uploads every item in sequence and succeeds on ACK', async () => {
    const items = compiledItems();
    const machine = makeFakeMachine(items);
    const progress: string[] = [];

    const result = await uploadMission(items, machine.sender, machine.receiver, (p) =>
      progress.push(p.state)
    );

    expect(result.success).toBe(true);
    expect(machine.sent.map((i) => i.seq)).toEqual(items.map((i) => i.seq));
    expect(progress[progress.length - 1]).toBe('complete');
  });

  test('fails with readable error when machine rejects', async () => {
    const items = compiledItems();
    const machine = makeFakeMachine(items, { rejectWith: MavMissionResult.NO_SPACE });

    const result = await uploadMission(items, machine.sender, machine.receiver);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No space/i);
  });

  test('fails on empty mission', async () => {
    const machine = makeFakeMachine([]);
    const result = await uploadMission([], machine.sender, machine.receiver);
    expect(result.success).toBe(false);
  });
});
