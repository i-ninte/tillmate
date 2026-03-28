/**
 * MAVLink 2 Protocol Parser and Encoder
 * Handles parsing incoming MAVLink messages and encoding outgoing messages
 */

import {
  MavMsgId,
  MavlinkMessage,
  HeartbeatMessage,
  SysStatusMessage,
  GpsRawIntMessage,
  GlobalPositionIntMessage,
  CommandAckMessage,
  NamedValueFloatMessage,
  NamedValueIntMessage,
  CommandLongParams,
} from '../types';
import { MAVLINK, CRC_EXTRA, MESSAGE_SIZE } from './mavlinkConstants';

// MAVLink 2 header structure
const MAVLINK2_HEADER_LEN = 10;
const MAVLINK2_CHECKSUM_LEN = 2;

// X.25 CRC lookup table
const CRC_TABLE = new Uint16Array([
  0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
  0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
  0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
  0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de,
  0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485,
  0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
  0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4,
  0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc,
  0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
  0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
  0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12,
  0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
  0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41,
  0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
  0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
  0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
  0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
  0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
  0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e,
  0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256,
  0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
  0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
  0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
  0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
  0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab,
  0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3,
  0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
  0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92,
  0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9,
  0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
  0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8,
  0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0,
]);

/**
 * Calculate X.25 CRC for MAVLink
 */
function crc16Accumulate(data: Uint8Array, crc: number = 0xFFFF): number {
  for (const byte of data) {
    const tmp = byte ^ (crc & 0xFF);
    crc = (crc >> 8) ^ CRC_TABLE[tmp];
  }
  return crc;
}

/**
 * Get CRC extra byte for a message ID
 */
function getCrcExtra(msgId: number): number {
  switch (msgId) {
    case MavMsgId.HEARTBEAT: return CRC_EXTRA.HEARTBEAT;
    case MavMsgId.SYS_STATUS: return CRC_EXTRA.SYS_STATUS;
    case MavMsgId.GPS_RAW_INT: return CRC_EXTRA.GPS_RAW_INT;
    case MavMsgId.GLOBAL_POSITION_INT: return CRC_EXTRA.GLOBAL_POSITION_INT;
    case MavMsgId.COMMAND_LONG: return CRC_EXTRA.COMMAND_LONG;
    case MavMsgId.COMMAND_ACK: return CRC_EXTRA.COMMAND_ACK;
    case MavMsgId.NAMED_VALUE_FLOAT: return CRC_EXTRA.NAMED_VALUE_FLOAT;
    case MavMsgId.NAMED_VALUE_INT: return CRC_EXTRA.NAMED_VALUE_INT;
    case MavMsgId.MISSION_COUNT: return CRC_EXTRA.MISSION_COUNT;
    case MavMsgId.MISSION_ITEM_INT: return CRC_EXTRA.MISSION_ITEM_INT;
    case MavMsgId.MISSION_ACK: return CRC_EXTRA.MISSION_ACK;
    default: return 0;
  }
}

/**
 * Parse a MAVLink 2 message from a buffer
 * Returns the parsed message or null if invalid/incomplete
 */
export function parseMavlinkMessage(buffer: Uint8Array): MavlinkMessage | null {
  // Need at least header + checksum
  if (buffer.length < MAVLINK2_HEADER_LEN + MAVLINK2_CHECKSUM_LEN) {
    return null;
  }

  // Check for MAVLink 2 start byte
  if (buffer[0] !== MAVLINK.STX_V2) {
    // Try to find start byte
    const startIdx = buffer.indexOf(MAVLINK.STX_V2);
    if (startIdx === -1) {
      return null;
    }
    buffer = buffer.slice(startIdx);
  }

  // Parse header
  const payloadLen = buffer[1];
  const incompatFlags = buffer[2];
  const compatFlags = buffer[3];
  const seq = buffer[4];
  const sysId = buffer[5];
  const compId = buffer[6];
  const msgId = buffer[7] | (buffer[8] << 8) | (buffer[9] << 16);

  // Check if we have complete message
  const totalLen = MAVLINK2_HEADER_LEN + payloadLen + MAVLINK2_CHECKSUM_LEN;
  if (buffer.length < totalLen) {
    return null;
  }

  // Extract payload
  const payload = buffer.slice(MAVLINK2_HEADER_LEN, MAVLINK2_HEADER_LEN + payloadLen);

  // Verify CRC
  const crcData = buffer.slice(1, MAVLINK2_HEADER_LEN + payloadLen);
  let crc = crc16Accumulate(crcData);
  crc = crc16Accumulate(new Uint8Array([getCrcExtra(msgId)]), crc);

  const receivedCrc = buffer[MAVLINK2_HEADER_LEN + payloadLen] |
                      (buffer[MAVLINK2_HEADER_LEN + payloadLen + 1] << 8);

  if ((crc & 0xFFFF) !== receivedCrc) {
    console.warn(`MAVLink CRC mismatch for msgId ${msgId}`);
    return null;
  }

  return {
    msgId,
    sysId,
    compId,
    payload,
    timestamp: Date.now(),
  };
}

/**
 * Parse HEARTBEAT message payload
 */
export function parseHeartbeat(payload: Uint8Array): HeartbeatMessage | null {
  if (payload.length < 9) return null;

  return {
    type: payload[0],
    autopilot: payload[1],
    baseMode: payload[2],
    customMode: payload[3] | (payload[4] << 8) | (payload[5] << 16) | (payload[6] << 24),
    systemStatus: payload[7],
    mavlinkVersion: payload[8],
  };
}

/**
 * Parse SYS_STATUS message payload
 */
export function parseSysStatus(payload: Uint8Array): SysStatusMessage | null {
  if (payload.length < 31) return null;

  const view = new DataView(payload.buffer, payload.byteOffset);

  return {
    batteryVoltage: view.getUint16(14, true),     // offset 14, mV
    batteryRemaining: view.getInt8(30),           // offset 30, %
    currentBattery: view.getInt16(16, true),      // offset 16, cA
  };
}

/**
 * Parse GPS_RAW_INT message payload
 */
export function parseGpsRawInt(payload: Uint8Array): GpsRawIntMessage | null {
  if (payload.length < 30) return null;

  const view = new DataView(payload.buffer, payload.byteOffset);

  return {
    fixType: payload[28],                         // offset 28
    lat: view.getInt32(8, true),                  // offset 8, degE7
    lon: view.getInt32(12, true),                 // offset 12, degE7
    alt: view.getInt32(16, true),                 // offset 16, mm
    satellitesVisible: payload[29],               // offset 29
  };
}

/**
 * Parse GLOBAL_POSITION_INT message payload
 */
export function parseGlobalPositionInt(payload: Uint8Array): GlobalPositionIntMessage | null {
  if (payload.length < 28) return null;

  const view = new DataView(payload.buffer, payload.byteOffset);

  return {
    lat: view.getInt32(4, true),                  // offset 4, degE7
    lon: view.getInt32(8, true),                  // offset 8, degE7
    alt: view.getInt32(12, true),                 // offset 12, mm
    relativeAlt: view.getInt32(16, true),         // offset 16, mm
    vx: view.getInt16(20, true),                  // offset 20, cm/s
    vy: view.getInt16(22, true),                  // offset 22, cm/s
    vz: view.getInt16(24, true),                  // offset 24, cm/s
    hdg: view.getUint16(26, true),                // offset 26, cdeg
  };
}

/**
 * Parse COMMAND_ACK message payload
 */
export function parseCommandAck(payload: Uint8Array): CommandAckMessage | null {
  if (payload.length < 3) return null;

  const view = new DataView(payload.buffer, payload.byteOffset);

  return {
    command: view.getUint16(0, true),
    result: payload[2],
    progress: payload.length > 3 ? payload[3] : 0,
    resultParam2: payload.length > 4 ? view.getInt32(4, true) : 0,
    targetSystem: payload.length > 8 ? payload[8] : 0,
    targetComponent: payload.length > 9 ? payload[9] : 0,
  };
}

/**
 * Parse NAMED_VALUE_FLOAT message payload
 */
export function parseNamedValueFloat(payload: Uint8Array): NamedValueFloatMessage | null {
  if (payload.length < 14) return null;

  const view = new DataView(payload.buffer, payload.byteOffset);

  // Name is 10 bytes starting at offset 4
  const nameBytes = payload.slice(4, 14);
  const nameEnd = nameBytes.indexOf(0);
  const name = new TextDecoder().decode(nameEnd > 0 ? nameBytes.slice(0, nameEnd) : nameBytes);

  return {
    value: view.getFloat32(0, true),
    name,
  };
}

/**
 * Parse NAMED_VALUE_INT message payload
 */
export function parseNamedValueInt(payload: Uint8Array): NamedValueIntMessage | null {
  if (payload.length < 14) return null;

  const view = new DataView(payload.buffer, payload.byteOffset);

  // Name is 10 bytes starting at offset 4
  const nameBytes = payload.slice(4, 14);
  const nameEnd = nameBytes.indexOf(0);
  const name = new TextDecoder().decode(nameEnd > 0 ? nameBytes.slice(0, nameEnd) : nameBytes);

  return {
    value: view.getInt32(0, true),
    name,
  };
}

// Sequence number for outgoing messages
let messageSequence = 0;

/**
 * Encode a HEARTBEAT message
 */
export function encodeHeartbeat(sysId: number = 255, compId: number = 190): Uint8Array {
  const payload = new Uint8Array(9);
  payload[0] = 6;   // MAV_TYPE_GCS
  payload[1] = 8;   // MAV_AUTOPILOT_INVALID
  payload[2] = 0;   // base_mode
  payload[3] = 0;   // custom_mode (4 bytes)
  payload[4] = 0;
  payload[5] = 0;
  payload[6] = 0;
  payload[7] = 0;   // system_status = MAV_STATE_UNINIT
  payload[8] = 3;   // mavlink_version

  return encodeMessage(MavMsgId.HEARTBEAT, payload, sysId, compId);
}

/**
 * Encode a COMMAND_LONG message
 */
export function encodeCommandLong(params: CommandLongParams, sysId: number = 255, compId: number = 190): Uint8Array {
  const payload = new Uint8Array(33);
  const view = new DataView(payload.buffer);

  view.setFloat32(0, params.param1, true);
  view.setFloat32(4, params.param2, true);
  view.setFloat32(8, params.param3, true);
  view.setFloat32(12, params.param4, true);
  view.setFloat32(16, params.param5, true);
  view.setFloat32(20, params.param6, true);
  view.setFloat32(24, params.param7, true);
  view.setUint16(28, params.command, true);
  payload[30] = params.targetSystem;
  payload[31] = params.targetComponent;
  payload[32] = params.confirmation;

  return encodeMessage(MavMsgId.COMMAND_LONG, payload, sysId, compId);
}

/**
 * Encode a MAVLink 2 message
 */
export function encodeMessage(
  msgId: number,
  payload: Uint8Array,
  sysId: number = 255,
  compId: number = 190
): Uint8Array {
  const seq = messageSequence++ & 0xFF;

  // Build header
  const header = new Uint8Array(MAVLINK2_HEADER_LEN);
  header[0] = MAVLINK.STX_V2;
  header[1] = payload.length;
  header[2] = 0;  // incompat_flags
  header[3] = 0;  // compat_flags
  header[4] = seq;
  header[5] = sysId;
  header[6] = compId;
  header[7] = msgId & 0xFF;
  header[8] = (msgId >> 8) & 0xFF;
  header[9] = (msgId >> 16) & 0xFF;

  // Calculate CRC
  const crcData = new Uint8Array(MAVLINK2_HEADER_LEN - 1 + payload.length);
  crcData.set(header.slice(1), 0);
  crcData.set(payload, MAVLINK2_HEADER_LEN - 1);

  let crc = crc16Accumulate(crcData);
  crc = crc16Accumulate(new Uint8Array([getCrcExtra(msgId)]), crc);

  // Build complete message
  const message = new Uint8Array(MAVLINK2_HEADER_LEN + payload.length + MAVLINK2_CHECKSUM_LEN);
  message.set(header, 0);
  message.set(payload, MAVLINK2_HEADER_LEN);
  message[message.length - 2] = crc & 0xFF;
  message[message.length - 1] = (crc >> 8) & 0xFF;

  return message;
}

/**
 * Find all complete MAVLink messages in a buffer
 * Returns array of messages and remaining buffer
 */
export function parseBuffer(buffer: Uint8Array): { messages: MavlinkMessage[]; remaining: Uint8Array } {
  const messages: MavlinkMessage[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    // Find start byte
    if (buffer[offset] !== MAVLINK.STX_V2) {
      offset++;
      continue;
    }

    // Check if we have enough for header
    if (buffer.length - offset < MAVLINK2_HEADER_LEN) {
      break;
    }

    const payloadLen = buffer[offset + 1];
    const totalLen = MAVLINK2_HEADER_LEN + payloadLen + MAVLINK2_CHECKSUM_LEN;

    // Check if we have complete message
    if (buffer.length - offset < totalLen) {
      break;
    }

    const msg = parseMavlinkMessage(buffer.slice(offset, offset + totalLen));
    if (msg) {
      messages.push(msg);
    }
    offset += totalLen;
  }

  return {
    messages,
    remaining: buffer.slice(offset),
  };
}
