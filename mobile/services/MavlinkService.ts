/**
 * MAVLink Service
 * Manages UDP connection to TillMate machine and handles MAVLink message exchange
 */

import dgram from 'react-native-udp';
import { Platform } from 'react-native';
import {
  MavMsgId,
  MavlinkMessage,
  Telemetry,
  MachineMode,
  CommandLongParams,
  DRONEBRIDGE_CONFIG,
} from '../types';
import {
  parseBuffer,
  parseHeartbeat,
  parseSysStatus,
  parseGpsRawInt,
  parseGlobalPositionInt,
  parseCommandAck,
  parseNamedValueFloat,
  parseNamedValueInt,
  encodeHeartbeat,
  encodeCommandLong,
  encodeMissionCount,
  encodeMissionClearAll,
  encodeMissionItemInt,
  encodeMissionRequestList,
  encodeMissionRequestInt,
  encodeMissionAck,
  parseMissionRequest,
  parseMissionAck,
  parseMissionCount,
  parseMissionItemInt,
  parseMissionSeq,
} from '../utils/mavlinkParser';
import { useMissionStore } from '../store/missionStore';
import { MissionItemInt } from '../types';
import { useConnectionStore } from '../store/connectionStore';
import { useTelemetryStore } from '../store/telemetryStore';

// Event types
type ConnectionCallback = (connected: boolean) => void;
type TelemetryCallback = (telemetry: Partial<Telemetry>) => void;
type ErrorCallback = (error: Error) => void;

class MavlinkService {
  private socket: any = null;
  private targetIp: string = DRONEBRIDGE_CONFIG.DEFAULT_IP;
  private targetPort: number = DRONEBRIDGE_CONFIG.UDP_PORT;
  private localPort: number = 14551;

  private receiveBuffer: Uint8Array = new Uint8Array(0);
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  private lastHeartbeatReceived: number = 0;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;

  // Callbacks
  private onConnectionChange: ConnectionCallback | null = null;
  private onTelemetryUpdate: TelemetryCallback | null = null;
  private onError: ErrorCallback | null = null;

  // Machine info from heartbeat
  private machineSystemId: number = 1;
  private machineComponentId: number = 1;

  // Waiters for specific incoming messages (mission protocol handshake)
  private messageWaiters: {
    msgId: MavMsgId;
    predicate?: (msg: any) => boolean;
    resolve: (msg: any) => void;
    timer: NodeJS.Timeout;
  }[] = [];

  /**
   * Set target IP and port
   */
  setTarget(ip: string, port: number): void {
    this.targetIp = ip;
    this.targetPort = port;
  }

  /**
   * Register callbacks
   */
  onConnection(callback: ConnectionCallback): void {
    this.onConnectionChange = callback;
  }

  onTelemetry(callback: TelemetryCallback): void {
    this.onTelemetryUpdate = callback;
  }

  onErrorCallback(callback: ErrorCallback): void {
    this.onError = callback;
  }

  /**
   * Connect to the machine
   */
  async connect(): Promise<boolean> {
    if (this.isConnecting || this.isConnected) {
      return this.isConnected;
    }

    this.isConnecting = true;

    try {
      // Create UDP socket
      this.socket = dgram.createSocket({
        type: 'udp4',
        reusePort: true,
      });

      // Set up event handlers
      this.socket.on('message', (data: Buffer, rinfo: any) => {
        this.handleIncomingData(data);
      });

      this.socket.on('error', (err: Error) => {
        console.error('[MavlinkService] Socket error:', err);
        this.onError?.(err);
        this.handleDisconnect();
      });

      this.socket.on('close', () => {
        console.log('[MavlinkService] Socket closed');
        this.handleDisconnect();
      });

      // Bind to local port
      await new Promise<void>((resolve, reject) => {
        this.socket.bind(this.localPort, (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            console.log(`[MavlinkService] Bound to port ${this.localPort}`);
            resolve();
          }
        });
      });

      // Start sending heartbeats
      this.startHeartbeats();

      // Start connection monitoring
      this.startConnectionMonitoring();

      // Wait for first heartbeat from machine (with timeout)
      const connected = await this.waitForConnection(5000);

      this.isConnecting = false;

      if (connected) {
        this.isConnected = true;
        this.onConnectionChange?.(true);
        return true;
      } else {
        this.disconnect();
        return false;
      }
    } catch (error) {
      console.error('[MavlinkService] Connection error:', error);
      this.isConnecting = false;
      this.onError?.(error as Error);
      return false;
    }
  }

  /**
   * Wait for connection (heartbeat from machine)
   */
  private waitForConnection(timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkInterval = setInterval(() => {
        if (this.lastHeartbeatReceived > startTime) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }

  /**
   * Disconnect from the machine
   */
  disconnect(): void {
    this.stopHeartbeats();
    this.stopConnectionMonitoring();

    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        // Ignore close errors
      }
      this.socket = null;
    }

    this.handleDisconnect();
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(): void {
    const wasConnected = this.isConnected;
    this.isConnected = false;
    this.isConnecting = false;
    this.lastHeartbeatReceived = 0;
    this.receiveBuffer = new Uint8Array(0);

    // Fail any pending mission-protocol waiters
    for (const waiter of this.messageWaiters) {
      clearTimeout(waiter.timer);
      waiter.resolve(null);
    }
    this.messageWaiters = [];

    if (wasConnected) {
      this.onConnectionChange?.(false);
    }
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get machine system ID (from heartbeat)
   */
  getMachineSystemId(): number {
    return this.machineSystemId;
  }

  /**
   * Start sending heartbeats
   */
  private startHeartbeats(): void {
    this.stopHeartbeats();

    // Send heartbeat immediately
    this.sendHeartbeat();

    // Then every HEARTBEAT_INTERVAL_MS
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, DRONEBRIDGE_CONFIG.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stop sending heartbeats
   */
  private stopHeartbeats(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send heartbeat to machine
   */
  private sendHeartbeat(): void {
    const heartbeat = encodeHeartbeat();
    this.sendRaw(heartbeat);
  }

  /**
   * Start connection monitoring
   */
  private startConnectionMonitoring(): void {
    this.stopConnectionMonitoring();

    this.connectionCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - this.lastHeartbeatReceived;

      if (this.isConnected && timeSinceLastHeartbeat > DRONEBRIDGE_CONFIG.HEARTBEAT_TIMEOUT_MS) {
        console.warn('[MavlinkService] Connection timeout - no heartbeat');
        this.handleDisconnect();
      }
    }, 1000);
  }

  /**
   * Stop connection monitoring
   */
  private stopConnectionMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  /**
   * Handle incoming data
   */
  private handleIncomingData(data: Buffer): void {
    // Append to receive buffer
    const newData = new Uint8Array(data);
    const combined = new Uint8Array(this.receiveBuffer.length + newData.length);
    combined.set(this.receiveBuffer, 0);
    combined.set(newData, this.receiveBuffer.length);

    // Parse messages
    const { messages, remaining } = parseBuffer(combined);
    this.receiveBuffer = remaining;

    // Process each message
    for (const msg of messages) {
      this.handleMessage(msg);
    }
  }

  /**
   * Handle a parsed MAVLink message
   */
  private handleMessage(msg: MavlinkMessage): void {
    switch (msg.msgId) {
      case MavMsgId.HEARTBEAT:
        this.handleHeartbeat(msg);
        break;
      case MavMsgId.SYS_STATUS:
        this.handleSysStatus(msg);
        break;
      case MavMsgId.GPS_RAW_INT:
        this.handleGpsRawInt(msg);
        break;
      case MavMsgId.GLOBAL_POSITION_INT:
        this.handleGlobalPositionInt(msg);
        break;
      case MavMsgId.COMMAND_ACK:
        this.handleCommandAck(msg);
        break;
      case MavMsgId.NAMED_VALUE_FLOAT:
        this.handleNamedValueFloat(msg);
        break;
      case MavMsgId.NAMED_VALUE_INT:
        this.handleNamedValueInt(msg);
        break;
      case MavMsgId.MISSION_REQUEST_INT:
      case MavMsgId.MISSION_REQUEST: {
        // Some autopilots request items via MISSION_REQUEST — treat both alike
        const req = parseMissionRequest(msg.payload);
        if (req) this.resolveWaiters(MavMsgId.MISSION_REQUEST_INT, req);
        break;
      }
      case MavMsgId.MISSION_ACK: {
        const ack = parseMissionAck(msg.payload);
        if (ack) this.resolveWaiters(MavMsgId.MISSION_ACK, ack);
        break;
      }
      case MavMsgId.MISSION_CURRENT: {
        const { seq } = parseMissionSeq(msg.payload);
        useMissionStore.getState().setExecutionProgress({ currentSeq: seq });
        break;
      }
      case MavMsgId.MISSION_ITEM_REACHED: {
        const { seq } = parseMissionSeq(msg.payload);
        useMissionStore.getState().setExecutionProgress({ reachedSeq: seq });
        break;
      }
      case MavMsgId.MISSION_COUNT: {
        const count = parseMissionCount(msg.payload);
        if (count) this.resolveWaiters(MavMsgId.MISSION_COUNT, count);
        break;
      }
      case MavMsgId.MISSION_ITEM_INT: {
        const item = parseMissionItemInt(msg.payload);
        if (item) this.resolveWaiters(MavMsgId.MISSION_ITEM_INT, item);
        break;
      }
      default:
        // Ignore unknown messages
        break;
    }
  }

  /**
   * Handle HEARTBEAT message
   */
  private handleHeartbeat(msg: MavlinkMessage): void {
    const heartbeat = parseHeartbeat(msg.payload);
    if (!heartbeat) return;

    // Store machine system ID for commands
    this.machineSystemId = msg.sysId;
    this.machineComponentId = msg.compId;

    // Update last heartbeat time
    this.lastHeartbeatReceived = Date.now();

    // Update connection store
    useConnectionStore.getState().setLastHeartbeat(this.lastHeartbeatReceived);

    // If not connected yet, mark as connected
    if (!this.isConnected && !this.isConnecting) {
      this.isConnected = true;
      this.onConnectionChange?.(true);
    }

    // Map ArduPilot Rover custom mode to farmer-facing mode
    let mode: MachineMode = MachineMode.UNKNOWN;
    switch (heartbeat.customMode) {
      case 0: mode = MachineMode.MANUAL; break;
      case 4: mode = MachineMode.HOLD; break;
      case 10: mode = MachineMode.AUTO; break;
      case 11: mode = MachineMode.RTL; break;
      case 15: mode = MachineMode.GUIDED; break;
    }

    this.onTelemetryUpdate?.({ mode });
  }

  /**
   * Handle SYS_STATUS message
   */
  private handleSysStatus(msg: MavlinkMessage): void {
    const status = parseSysStatus(msg.payload);
    if (!status) return;

    this.onTelemetryUpdate?.({
      batteryVoltageV: status.batteryVoltage / 1000,  // mV to V
      batteryPercent: status.batteryRemaining >= 0 ? status.batteryRemaining : null,
    });
  }

  /**
   * Handle GPS_RAW_INT message
   */
  private handleGpsRawInt(msg: MavlinkMessage): void {
    const gps = parseGpsRawInt(msg.payload);
    if (!gps) return;

    this.onTelemetryUpdate?.({
      gpsFixed: gps.fixType >= 3,
      latDeg: gps.lat / 1e7,
      lonDeg: gps.lon / 1e7,
      satellites: gps.satellitesVisible,
    });
  }

  /**
   * Handle GLOBAL_POSITION_INT message
   */
  private handleGlobalPositionInt(msg: MavlinkMessage): void {
    const pos = parseGlobalPositionInt(msg.payload);
    if (!pos) return;

    // Calculate ground speed from vx, vy
    const speedMs = Math.sqrt(pos.vx * pos.vx + pos.vy * pos.vy) / 100;
    const speedKmh = speedMs * 3.6;

    this.onTelemetryUpdate?.({
      latDeg: pos.lat / 1e7,
      lonDeg: pos.lon / 1e7,
      speedKmh,
      headingDeg: pos.hdg / 100,
    });
  }

  /**
   * Handle COMMAND_ACK message
   */
  private handleCommandAck(msg: MavlinkMessage): void {
    const ack = parseCommandAck(msg.payload);
    if (!ack) return;

    console.log(`[MavlinkService] Command ${ack.command} result: ${ack.result}`);
    // Could emit event for specific command acknowledgments
  }

  /**
   * Handle NAMED_VALUE_FLOAT message (custom telemetry from STM32)
   */
  private handleNamedValueFloat(msg: MavlinkMessage): void {
    const nv = parseNamedValueFloat(msg.payload);
    if (!nv) return;

    switch (nv.name) {
      case 'IMPL_DEPTH':
        this.onTelemetryUpdate?.({ implementDepthCm: nv.value });
        break;
      case 'MACH_TEMP':
        this.onTelemetryUpdate?.({ machineTempC: nv.value });
        break;
      case 'PIX_TEMP':
        this.onTelemetryUpdate?.({ pixhawkTempC: nv.value });
        break;
    }
  }

  /**
   * Handle NAMED_VALUE_INT message (custom telemetry)
   */
  private handleNamedValueInt(msg: MavlinkMessage): void {
    const nv = parseNamedValueInt(msg.payload);
    if (!nv) return;

    switch (nv.name) {
      case 'ESTOP':
        this.onTelemetryUpdate?.({ eStopActive: nv.value !== 0 });
        break;
      case 'LIGHTS':
        this.onTelemetryUpdate?.({ headlightsOn: nv.value !== 0 });
        break;
    }
  }

  /**
   * Send a command to the machine
   */
  sendCommand(params: CommandLongParams): void {
    // Update target system/component from last heartbeat
    const updatedParams = {
      ...params,
      targetSystem: this.machineSystemId,
      targetComponent: this.machineComponentId,
    };

    const encoded = encodeCommandLong(updatedParams);
    this.sendRaw(encoded);
  }

  /**
   * Resolve any pending waiters for a message ID
   */
  private resolveWaiters(msgId: MavMsgId, message: any): void {
    const remaining: typeof this.messageWaiters = [];
    for (const waiter of this.messageWaiters) {
      if (waiter.msgId === msgId && (!waiter.predicate || waiter.predicate(message))) {
        clearTimeout(waiter.timer);
        waiter.resolve(message);
      } else {
        remaining.push(waiter);
      }
    }
    this.messageWaiters = remaining;
  }

  /**
   * Wait for a specific incoming message (MavlinkReceiver interface).
   * Resolves with the parsed message, or null on timeout.
   */
  waitForMessage(
    msgId: MavMsgId,
    timeoutMs: number,
    predicate?: (msg: any) => boolean
  ): Promise<any | null> {
    return new Promise((resolve) => {
      const waiter = {
        msgId,
        predicate,
        resolve,
        timer: setTimeout(() => {
          this.messageWaiters = this.messageWaiters.filter((w) => w !== waiter);
          resolve(null);
        }, timeoutMs),
      };
      this.messageWaiters.push(waiter);
    });
  }

  /**
   * MavlinkSender interface — mission protocol messages
   */
  async sendMissionClearAll(): Promise<void> {
    this.sendRaw(
      encodeMissionClearAll(this.machineSystemId, this.machineComponentId)
    );
  }

  async sendMissionCount(count: number, missionType: number = 0): Promise<void> {
    this.sendRaw(
      encodeMissionCount(count, this.machineSystemId, this.machineComponentId, missionType)
    );
  }

  async sendMissionItemInt(item: MissionItemInt): Promise<void> {
    this.sendRaw(
      encodeMissionItemInt(item, this.machineSystemId, this.machineComponentId)
    );
  }

  async sendMissionRequestList(): Promise<void> {
    this.sendRaw(
      encodeMissionRequestList(this.machineSystemId, this.machineComponentId)
    );
  }

  async sendMissionRequestInt(seq: number): Promise<void> {
    this.sendRaw(
      encodeMissionRequestInt(seq, this.machineSystemId, this.machineComponentId)
    );
  }

  async sendMissionAck(type: number = 0): Promise<void> {
    this.sendRaw(
      encodeMissionAck(this.machineSystemId, this.machineComponentId, type)
    );
  }

  /**
   * Send raw data to machine
   */
  private sendRaw(data: Uint8Array): void {
    if (!this.socket) {
      console.warn('[MavlinkService] Cannot send - socket not connected');
      return;
    }

    const buffer = Buffer.from(data);
    this.socket.send(buffer, 0, buffer.length, this.targetPort, this.targetIp, (err: Error | null) => {
      if (err) {
        console.error('[MavlinkService] Send error:', err);
      }
    });
  }
}

// Export singleton instance
export const mavlinkService = new MavlinkService();
