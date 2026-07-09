/**
 * Mission / Field Plan Type Definitions
 * Using farmer-friendly terminology
 */

// Field operation types (farmer-facing)
export type Operation = 'tilling' | 'weeding' | 'spraying';

// A point on the field boundary polygon
export interface BoundaryPoint {
  lat: number;
  lon: number;
}

// A single work point in a field plan
export interface WorkPoint {
  id: string;           // UUID for local tracking
  seq: number;          // Order in the mission (0-indexed)
  lat: number;          // Latitude in degrees
  lon: number;          // Longitude in degrees

  // Implement actions at this point
  implementLowered: boolean;  // true = lowered into soil
  tillerOn: boolean;          // true = tiller spinning
  pumpOn: boolean;            // true = pump running

  // Farmer-visible label
  label: string;
}

// A complete field plan (mission)
export interface FieldPlan {
  id?: number;              // Backend ID (undefined until saved)
  localId: string;          // Local UUID for tracking unsaved plans
  machineId: number;        // Associated machine
  name: string;             // Farmer-visible name
  notes?: string;           // Optional notes
  workPoints: WorkPoint[];  // Ordered list of work points
  returnToHome: boolean;    // Return to starting position after mission
  operation?: Operation;    // Selected field operation
  depthCm?: number;         // Working depth for tilling/weeding
  implementWidthM?: number; // Implement width used to generate the path
  boundary?: BoundaryPoint[]; // Field boundary polygon drawn by farmer
  homeLocation?: {          // Starting position (first point or custom)
    lat: number;
    lon: number;
  };
  createdAt?: string;       // ISO timestamp
  updatedAt?: string;       // ISO timestamp
}

// For creating a new field plan (backend request)
export interface FieldPlanCreate {
  machineId: number;
  name: string;
  notes?: string;
  returnToHome?: boolean;
  operation?: Operation;
  depthCm?: number;
  implementWidthM?: number;
  boundary?: BoundaryPoint[];
  homeLocation?: {
    lat: number;
    lon: number;
  };
  workPoints: Omit<WorkPoint, 'id'>[];
}

// For displaying in the UI (from backend /missions/summaries)
export interface FieldPlanSummary {
  id: number;
  machineId: number;
  name: string;
  notes: string | null;
  returnToHome: boolean;
  workPointCount: number;  // Maps from backend point_count
  createdAt: string;
}

// Mission upload state machine
export enum MissionUploadState {
  IDLE = 'idle',
  SENDING_COUNT = 'sending_count',
  WAITING_REQUEST = 'waiting_request',
  SENDING_ITEMS = 'sending_items',
  WAITING_ACK = 'waiting_ack',
  COMPLETE = 'complete',
  ERROR = 'error',
}

// Mission upload progress
export interface MissionUploadProgress {
  state: MissionUploadState;
  currentItem: number;
  totalItems: number;
  error?: string;
}

// Machine information
export interface Machine {
  id: number;
  serialNumber: string;
  displayName: string;
  wifiSsid: string;

  // Calibration
  actuatorMinMm: number;
  actuatorMaxMm: number;
  actuatorPwmMin: number;
  actuatorPwmMax: number;

  // Battery thresholds
  batteryWarnV: number;
  batteryCriticalV: number;

  createdAt: string;
  updatedAt: string;
}

// For registering a new machine
export interface MachineCreate {
  serialNumber: string;
  displayName: string;
  wifiSsid: string;
  actuatorMinMm?: number;
  actuatorMaxMm?: number;
  batteryWarnV?: number;
  batteryCriticalV?: number;
}

// Telemetry log entry (for batch upload to backend)
export interface TelemetryLogEntry {
  machineId: number;
  sessionId: string;
  recordedAt: string;     // ISO timestamp

  batteryVoltageV?: number;
  batteryPct?: number;
  gpsFixed?: boolean;
  lat?: number;
  lon?: number;
  satellites?: number;
  speedKmh?: number;
  headingDeg?: number;
  pixhawkTempC?: number;
  machineTempC?: number;
  implementDepthCm?: number;
  estopActive?: boolean;
  mode?: string;
  headlightsOn?: boolean;
}

// Command log entry (for audit trail)
export interface CommandLogEntry {
  machineId: number;
  sessionId: string;
  sentAt: string;
  commandId: number;
  commandName: string;
  param1?: number;
  param2?: number;
  source: 'realtime' | 'mission';
}

// Map region for react-native-maps
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// Breadcrumb trail point (machine position history)
export interface BreadcrumbPoint {
  lat: number;
  lon: number;
  timestamp: number;
}
