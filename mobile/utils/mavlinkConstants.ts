/**
 * MAVLink Protocol Constants
 * Based on MAVLink 2 specification for agricultural machine control
 */

// MAVLink frame types
export enum MavFrame {
  GLOBAL = 0,
  LOCAL_NED = 1,
  MISSION = 2,
  GLOBAL_RELATIVE_ALT = 3,
  LOCAL_ENU = 4,
  GLOBAL_INT = 5,
  GLOBAL_RELATIVE_ALT_INT = 6,
  LOCAL_OFFSET_NED = 7,
  BODY_NED = 8,
  BODY_OFFSET_NED = 9,
  GLOBAL_TERRAIN_ALT = 10,
  GLOBAL_TERRAIN_ALT_INT = 11,
}

// MAVLink navigation commands
export enum MavCmdNav {
  NAV_WAYPOINT = 16,
  NAV_LOITER_UNLIM = 17,
  NAV_LOITER_TURNS = 18,
  NAV_LOITER_TIME = 19,
  NAV_RETURN_TO_LAUNCH = 20,
  NAV_LAND = 21,
  NAV_TAKEOFF = 22,
}

// MAVLink DO commands (actions)
export enum MavCmdDo {
  DO_JUMP = 177,
  DO_CHANGE_SPEED = 178,
  DO_SET_HOME = 179,
  DO_SET_PARAMETER = 180,
  DO_SET_RELAY = 181,
  DO_REPEAT_RELAY = 182,
  DO_SET_SERVO = 183,
  DO_REPEAT_SERVO = 184,
  DO_DIGICAM_CONFIGURE = 202,
  DO_DIGICAM_CONTROL = 203,
  DO_SET_CAM_TRIGG_DIST = 206,
  DO_FENCE_ENABLE = 207,
  DO_PARACHUTE = 208,
  DO_MOTOR_TEST = 209,
}

// Mission type
export enum MavMissionType {
  MISSION = 0,
  FENCE = 1,
  RALLY = 2,
  ALL = 255,
}

// Component IDs
export const MAV_COMP = {
  AUTOPILOT: 1,
  ALL: 0,
};

// Target system/component for commands
export const TARGET = {
  SYSTEM_ID: 1,
  COMPONENT_ID: 1,
};

// Servo channel for linear actuator (implement depth)
export const SERVO_CHANNEL = {
  IMPLEMENT: 9,
};

// PWM values for implement control
export const IMPLEMENT_PWM = {
  RAISED: 1000,   // Implement fully raised
  LOWERED: 1800,  // Implement fully lowered for tilling
  MIN: 1000,
  MAX: 2000,
};

// Relay channels
export const RELAY_CHANNEL = {
  TILLER: 0,
  PUMP: 1,
};

// Relay states
export const RELAY_STATE = {
  OFF: 0,
  ON: 1,
};

// Waypoint acceptance radius (meters)
export const WAYPOINT_ACCEPTANCE_RADIUS = 1.0;

// MAVLink message structure sizes
export const MESSAGE_SIZE = {
  HEADER: 6,
  CHECKSUM: 2,
  COMMAND_LONG: 33,
  MISSION_COUNT: 5,
  MISSION_ITEM_INT: 37,
  MISSION_CLEAR_ALL: 5,
  SET_MODE: 6,
};

// MAVLink magic bytes
export const MAVLINK = {
  STX_V1: 0xFE,
  STX_V2: 0xFD,
  PROTOCOL_VERSION: 2,
};

// Timeout values (ms)
export const TIMEOUT = {
  COMMAND_ACK: 3000,
  MISSION_ACK: 5000,
  MISSION_REQUEST: 3000,
  HEARTBEAT: 5000,
};

// Retry counts
export const MAX_RETRIES = {
  COMMAND: 3,
  MISSION_ITEM: 5,
};

// CRC extra bytes per message (required for MAVLink 2)
export const CRC_EXTRA = {
  HEARTBEAT: 50,
  SYS_STATUS: 124,
  GPS_RAW_INT: 24,
  GLOBAL_POSITION_INT: 104,
  MISSION_COUNT: 221,
  MISSION_ITEM_INT: 38,
  MISSION_REQUEST_INT: 196,
  MISSION_ACK: 153,
  MISSION_CLEAR_ALL: 232,
  COMMAND_LONG: 152,
  COMMAND_ACK: 143,
  SET_MODE: 89,
  NAMED_VALUE_FLOAT: 170,
  NAMED_VALUE_INT: 44,
};
