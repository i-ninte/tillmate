/**
 * Tests for the telemetry logger service
 */

import { TelemetryLogger } from '../services/telemetryLogger';
import { telemetryApi } from '../api/telemetry';

jest.mock('../api/telemetry', () => ({
  telemetryApi: {
    appendLogs: jest.fn(),
    appendCommands: jest.fn(),
  },
}));

const mockedApi = telemetryApi as jest.Mocked<typeof telemetryApi>;

describe('TelemetryLogger', () => {
  let logger: TelemetryLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.appendLogs.mockResolvedValue({ inserted: 0 });
    mockedApi.appendCommands.mockResolvedValue({ inserted: 0 });
    logger = new TelemetryLogger();
  });

  afterEach(async () => {
    await logger.stopSession();
  });

  test('ignores entries when no session is active', () => {
    logger.logTelemetry({ batteryVoltageV: 48 });
    expect(logger.getPendingCounts().telemetry).toBe(0);
  });

  test('buffers entries with session metadata and flushes them', async () => {
    const sessionId = logger.startSession(7, 'sess-1', 60000);
    expect(sessionId).toBe('sess-1');

    logger.logTelemetry({ batteryVoltageV: 48.1, gpsFixed: true });
    logger.logCommand({ commandId: 183, commandName: 'DO_SET_SERVO', source: 'realtime' });
    expect(logger.getPendingCounts()).toEqual({ telemetry: 1, commands: 1 });

    const sent = await logger.flush();
    expect(sent).toEqual({ telemetry: 1, commands: 1 });
    expect(logger.getPendingCounts()).toEqual({ telemetry: 0, commands: 0 });

    const logArg = mockedApi.appendLogs.mock.calls[0][0][0];
    expect(logArg.machineId).toBe(7);
    expect(logArg.sessionId).toBe('sess-1');
    expect(logArg.recordedAt).toBeTruthy();
  });

  test('keeps entries buffered when upload fails, retries next flush', async () => {
    logger.startSession(1, 'sess-2', 60000);
    logger.logTelemetry({ batteryVoltageV: 47 });

    mockedApi.appendLogs.mockRejectedValueOnce(new Error('offline'));
    let sent = await logger.flush();
    expect(sent.telemetry).toBe(0);
    expect(logger.getPendingCounts().telemetry).toBe(1);

    sent = await logger.flush();
    expect(sent.telemetry).toBe(1);
    expect(logger.getPendingCounts().telemetry).toBe(0);
  });

  test('caps buffer size at 500 entries', () => {
    logger.startSession(1, 'sess-3', 60000);
    for (let i = 0; i < 600; i++) {
      logger.logTelemetry({ batteryPct: i });
    }
    expect(logger.getPendingCounts().telemetry).toBe(500);
  });

  test('stopSession performs a final flush', async () => {
    logger.startSession(1, 'sess-4', 60000);
    logger.logTelemetry({ batteryVoltageV: 46 });
    await logger.stopSession();
    expect(mockedApi.appendLogs).toHaveBeenCalledTimes(1);
    expect(logger.getSessionId()).toBeNull();
  });

  test('generates a unique session id when none given', () => {
    const id = logger.startSession(1);
    expect(id).toMatch(/^session-/);
  });
});
