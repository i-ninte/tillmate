/**
 * Telemetry Logger Service
 * Buffers telemetry snapshots and sent commands during a work session and
 * batch-uploads them to the backend. Failures keep entries buffered so no
 * data is lost when the phone has no internet in the field.
 */

import { TelemetryLogEntry, CommandLogEntry } from '../types';
import { telemetryApi } from '../api/telemetry';

const DEFAULT_FLUSH_INTERVAL_MS = 10000;
const MAX_BUFFER = 500; // Drop oldest beyond this to bound memory

export class TelemetryLogger {
  private machineId: number | null = null;
  private sessionId: string | null = null;
  private telemetryBuffer: TelemetryLogEntry[] = [];
  private commandBuffer: CommandLogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  /** Begins a logging session. Generates a session id if none is given. */
  startSession(machineId: number, sessionId?: string, flushIntervalMs: number = DEFAULT_FLUSH_INTERVAL_MS): string {
    this.stopSession();
    this.machineId = machineId;
    this.sessionId = sessionId ?? `session-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, flushIntervalMs);
    return this.sessionId;
  }

  /** Ends the session after a final flush attempt. */
  async stopSession(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.sessionId) {
      await this.flush();
    }
    this.machineId = null;
    this.sessionId = null;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  /** Records a telemetry snapshot (call at ~1 Hz from the telemetry stream). */
  logTelemetry(entry: Omit<TelemetryLogEntry, 'machineId' | 'sessionId' | 'recordedAt'>): void {
    if (this.machineId == null || this.sessionId == null) return;
    this.telemetryBuffer.push({
      ...entry,
      machineId: this.machineId,
      sessionId: this.sessionId,
      recordedAt: new Date().toISOString(),
    });
    if (this.telemetryBuffer.length > MAX_BUFFER) {
      this.telemetryBuffer.splice(0, this.telemetryBuffer.length - MAX_BUFFER);
    }
  }

  /** Records a command sent to the machine (audit trail). */
  logCommand(entry: Omit<CommandLogEntry, 'machineId' | 'sessionId' | 'sentAt'>): void {
    if (this.machineId == null || this.sessionId == null) return;
    this.commandBuffer.push({
      ...entry,
      machineId: this.machineId,
      sessionId: this.sessionId,
      sentAt: new Date().toISOString(),
    });
    if (this.commandBuffer.length > MAX_BUFFER) {
      this.commandBuffer.splice(0, this.commandBuffer.length - MAX_BUFFER);
    }
  }

  getPendingCounts(): { telemetry: number; commands: number } {
    return { telemetry: this.telemetryBuffer.length, commands: this.commandBuffer.length };
  }

  /**
   * Uploads buffered entries. On failure the entries stay buffered and the
   * next flush retries them.
   */
  async flush(): Promise<{ telemetry: number; commands: number }> {
    if (this.flushing) return { telemetry: 0, commands: 0 };
    this.flushing = true;
    let sentTelemetry = 0;
    let sentCommands = 0;

    try {
      if (this.telemetryBuffer.length > 0) {
        const batch = this.telemetryBuffer;
        this.telemetryBuffer = [];
        try {
          await telemetryApi.appendLogs(batch);
          sentTelemetry = batch.length;
        } catch {
          this.telemetryBuffer = [...batch, ...this.telemetryBuffer];
        }
      }

      if (this.commandBuffer.length > 0) {
        const batch = this.commandBuffer;
        this.commandBuffer = [];
        try {
          await telemetryApi.appendCommands(batch);
          sentCommands = batch.length;
        } catch {
          this.commandBuffer = [...batch, ...this.commandBuffer];
        }
      }
    } finally {
      this.flushing = false;
    }

    return { telemetry: sentTelemetry, commands: sentCommands };
  }
}

export const telemetryLogger = new TelemetryLogger();
