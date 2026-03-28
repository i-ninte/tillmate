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
} from '../utils/mavlinkParser';
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

    // Map system status to mode
    let mode: MachineMode = MachineMode.UNKNOWN;
    switch (heartbeat.customMode) {
      case 0: mode = MachineMode.MANUAL; break;
      case 3: mode = MachineMode.AUTO; break;
      case 4: mode = MachineMode.GUIDED; break;
      case 5: mode = MachineMode.HOLD; break;
      case 6: mode = MachineMode.RTL; break;
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
