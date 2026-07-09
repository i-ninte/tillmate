/**
 * Live integration test — drives the mobile API modules against a running
 * backend on localhost:8000. Skipped automatically if the backend isn't up
 * (so CI doesn't fail without one).
 *
 * Start the backend before running:
 *   cd backend && tillmate/bin/uvicorn main:app --port 8000
 */

import axios from 'axios';
import { machinesApi } from '../api/machines';
import { missionsApi } from '../api/missions';
import { telemetryApi } from '../api/telemetry';

const BACKEND = 'http://localhost:8000';

let backendUp = false;
beforeAll(async () => {
  try {
    await axios.get(`${BACKEND}/health`, { timeout: 500 });
    backendUp = true;
  } catch {
    // Backend not running — every test in this file will short-circuit
  }
});

// Wrap `test` so all tests skip cleanly when the backend is offline
function testIfBackend(name: string, fn: () => Promise<void>) {
  test(name, async () => {
    if (!backendUp) {
      console.warn(`[integration] backend not on ${BACKEND} — skipping ${name}`);
      return;
    }
    await fn();
  });
}

// Shared IDs between tests (cleaned up in the final one)
const state: { machineId?: number; planId?: number; sessionId?: string } = {};

describe('mobile → backend integration', () => {
  testIfBackend('creates a machine with implementWidthM (snake_case wire)', async () => {
    const m = await machinesApi.create({
      serialNumber: `IT-${Date.now()}`,
      displayName: 'Integration Machine',
      wifiSsid: 'TM_IT',
      implementWidthM: 2.4,
    });
    expect(m.id).toBeGreaterThan(0);
    expect(m.implementWidthM).toBe(2.4);
    state.machineId = m.id;
  });

  testIfBackend('creates a mission with operation, depth, boundary', async () => {
    if (!state.machineId) return;
    const plan = await missionsApi.create({
      machineId: state.machineId,
      name: 'IT Plan',
      operation: 'tilling',
      depthCm: 20,
      implementWidthM: 2.4,
      returnToHome: true,
      boundary: [
        { lat: 5.6037, lon: -0.187 },
        { lat: 5.6039, lon: -0.187 },
        { lat: 5.6039, lon: -0.185 },
      ],
      workPoints: [
        { seq: 0, lat: 5.6037, lon: -0.187, implementLowered: true, tillerOn: true, pumpOn: false, label: 'P1' },
        { seq: 1, lat: 5.6039, lon: -0.187, implementLowered: true, tillerOn: true, pumpOn: false, label: 'P2' },
      ],
    });
    expect(plan.operation).toBe('tilling');
    expect(plan.depthCm).toBe(20);
    expect(plan.workPoints).toHaveLength(2);
    expect(plan.boundary).toHaveLength(3);
    state.planId = plan.id;
  });

  testIfBackend('lists mission summaries with operation + point count', async () => {
    if (!state.machineId || !state.planId) return;
    const summaries = await missionsApi.listSummaries(state.machineId);
    const s = summaries.find((x) => x.id === state.planId);
    expect(s?.workPointCount).toBe(2);
    expect(s?.operation).toBe('tilling');
  });

  testIfBackend('batch-inserts telemetry with camelCase → snake_case transform', async () => {
    if (!state.machineId) return;
    state.sessionId = `session-${Date.now()}`;
    const result = await telemetryApi.appendLogs([
      {
        machineId: state.machineId,
        sessionId: state.sessionId,
        recordedAt: new Date().toISOString(),
        batteryVoltageV: 48.2,
        gpsFixed: true,
        satellites: 12,
        mode: 'AUTO',
      },
      {
        machineId: state.machineId,
        sessionId: state.sessionId,
        recordedAt: new Date().toISOString(),
        batteryVoltageV: 48.1,
        gpsFixed: true,
        satellites: 12,
      },
    ]);
    expect(result.inserted).toBe(2);
  });

  testIfBackend('reads telemetry back and transforms snake_case → camelCase', async () => {
    if (!state.machineId || !state.sessionId) return;
    const logs = await telemetryApi.getLogs(state.machineId, state.sessionId);
    expect(logs.length).toBe(2);
    expect(logs[0].batteryVoltageV).toBeCloseTo(48.2, 1);
    expect(logs[0].mode).toBe('AUTO');
    expect(logs[0].satellites).toBe(12);
  });

  testIfBackend('batch-inserts command logs', async () => {
    if (!state.machineId || !state.sessionId) return;
    const result = await telemetryApi.appendCommands([
      {
        machineId: state.machineId,
        sessionId: state.sessionId,
        sentAt: new Date().toISOString(),
        commandId: 400,
        commandName: 'COMPONENT_ARM_DISARM',
        param1: 1,
        source: 'mission',
      },
    ]);
    expect(result.inserted).toBe(1);
  });

  testIfBackend('cleanup', async () => {
    if (state.planId) await missionsApi.delete(state.planId);
    if (state.machineId) await machinesApi.delete(state.machineId);
  });
});
