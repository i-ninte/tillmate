/**
 * MAVLink Type Definitions
 * Based on MAVLink 2 protocol for agricultural machine control
 */

// MAVLink message IDs (common messages we use)
export enum MavMsgId {
  HEARTBEAT = 0,
  SYS_STATUS = 1,
  GPS_RAW_INT = 24,
  GLOBAL_POSITION_INT = 33,
  MISSION_REQUEST = 40,
  MISSION_COUNT = 44,
  MISSION_CLEAR_ALL = 45,
  MISSION_ITEM_INT = 73,
  MISSION_REQUEST_INT = 51,
  MISSION_ACK = 47,
  COMMAND_LONG = 76,
  COMMAND_ACK = 77,
  NAMED_VALUE_FLOAT = 251,
  NAMED_VALUE_INT = 252,
}

// MAVLink command IDs (DO_ commands we send)
export enum MavCmd {
  DO_SET_RELAY = 181,
  DO_SET_SERVO = 183,
  COMPONENT_ARM_DISARM = 400,
}

// Mission upload result codes
export enum MavMissionResult {
  ACCEPTED = 0,
  ERROR = 1,
  UNSUPPORTED_FRAME = 2,
  UNSUPPORTED = 3,
  NO_SPACE = 4,
  INVALID = 5,
  INVALID_PARAM1 = 6,
  INVALID_PARAM2 = 7,
  INVALID_PARAM3 = 8,
  INVALID_PARAM4 = 9,
  INVALID_PARAM5_X = 10,
  INVALID_PARAM6_Y = 11,
  INVALID_PARAM7 = 12,
  INVALID_SEQUENCE = 13,
  DENIED = 14,
  OPERATION_CANCELLED = 15,
}

// MAVLink autopilot modes (simplified for farmer UI)
export enum MachineMode {
  MANUAL = 0,
  AUTO = 1,
  GUIDED = 2,
  HOLD = 3,
  RTL = 4,    // Return to Launch (Return to Start)
  UNKNOWN = 255,
}

// Base telemetry state
export interface Telemetry {
  // Battery
  batteryVoltageV: number | null;
  batteryPercent: number | null;

  // GPS
  gpsFixed: boolean;
  latDeg: number | null;
  lonDeg: number | null;
  satellites: number | null;

  // Motion
  speedKmh: number | null;
  headingDeg: number | null;

  // Temperatures
  pixhawkTempC: number | null;
  machineTempC: number | null;

  // Implement (from STM32)
  implementDepthCm: number | null;

  // State
  eStopActive: boolean;
  mode: MachineMode;

  // Accessories
  headlightsOn: boolean;

  // Connection
  lastHeartbeatMs: number | null;
}

// Parsed MAVLink message (generic)
export interface MavlinkMessage {
  msgId: number;
  sysId: number;
  compId: number;
  payload: Uint8Array;
  timestamp: number;
}

// Specific parsed messages
export interface HeartbeatMessage {
  type: number;
  autopilot: number;
  baseMode: number;
  customMode: number;
  systemStatus: number;
  mavlinkVersion: number;
}

export interface SysStatusMessage {
  batteryVoltage: number;  // mV
  batteryRemaining: number; // %
  currentBattery: number;  // cA (10 * mA)
}

export interface GpsRawIntMessage {
  fixType: number;
  lat: number;     // degE7
  lon: number;     // degE7
  alt: number;     // mm
  satellitesVisible: number;
}

export interface GlobalPositionIntMessage {
  lat: number;     // degE7
  lon: number;     // degE7
  alt: number;     // mm
  relativeAlt: number; // mm
  vx: number;      // cm/s
  vy: number;      // cm/s
  vz: number;      // cm/s
  hdg: number;     // cdeg
}

export interface NamedValueFloatMessage {
  name: string;
  value: number;
}

export interface NamedValueIntMessage {
  name: string;
  value: number;
}

export interface CommandAckMessage {
  command: number;
  result: number;
  progress: number;
  resultParam2: number;
  targetSystem: number;
  targetComponent: number;
}

// COMMAND_LONG structure (for sending)
export interface CommandLongParams {
  targetSystem: number;
  targetComponent: number;
  command: MavCmd;
  confirmation: number;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  param5: number;
  param6: number;
  param7: number;
}

// Mission item (for upload)
export interface MissionItemInt {
  seq: number;
  frame: number;
  command: number;
  current: number;
  autocontinue: number;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  x: number;       // lat in degE7
  y: number;       // lon in degE7
  z: number;       // altitude
  missionType: number;
}

// Relay states
export enum RelayState {
  OFF = 0,
  ON = 1,
}

// Relay identifiers (as configured on STM32)
export enum RelayChannel {
  TILLER = 0,
  PUMP = 1,
  HEADLIGHTS = 2,
}

// Servo channel for implement
export const IMPLEMENT_SERVO_CHANNEL = 9;

// PWM range for implement depth
export const IMPLEMENT_PWM = {
  MIN: 1000,  // Raised (0% depth)
  MAX: 2000,  // Lowered (100% depth)
};

// Connection configuration
export const DRONEBRIDGE_CONFIG = {
  DEFAULT_IP: '192.168.2.1',
  UDP_PORT: 14550,
  HEARTBEAT_TIMEOUT_MS: 5000,
  HEARTBEAT_INTERVAL_MS: 1000,
};
