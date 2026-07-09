/**
 * MissionRunControls — Start / Pause / Resume / Return to Start.
 * Safety: Start is disabled without GPS fix, with E-stop active, or when
 * no plan has been sent. All commands are logged for the audit trail.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTelemetryStore, useConnectionStore, useMissionStore } from '../../store';
import { MachineMode, CommandLongParams } from '../../types';
import { Colors, Layout } from '../../constants';
import { mavlinkService } from '../../services/MavlinkService';
import { telemetryLogger } from '../../services/telemetryLogger';
import {
  buildStartWorking,
  buildPauseWorking,
  buildResumeWorking,
  buildReturnToStart,
} from '../../utils/mavlinkBuilders';

const COMMAND_NAMES: Record<number, string> = {
  176: 'DO_SET_MODE',
  300: 'MISSION_START',
  400: 'COMPONENT_ARM_DISARM',
};

function sendAll(commands: CommandLongParams[]) {
  for (const cmd of commands) {
    mavlinkService.sendCommand(cmd);
    telemetryLogger.logCommand({
      commandId: cmd.command,
      commandName: COMMAND_NAMES[cmd.command] ?? `CMD_${cmd.command}`,
      param1: cmd.param1,
      param2: cmd.param2,
      source: 'mission',
    });
  }
}

export default function MissionRunControls() {
  const connected = useConnectionStore((s) => s.connected);
  const gpsFixed = useTelemetryStore((s) => s.gpsFixed);
  const eStopActive = useTelemetryStore((s) => s.eStopActive);
  const mode = useTelemetryStore((s) => s.mode);
  const workPoints = useMissionStore((s) => s.workPoints);
  const resetExecution = useMissionStore((s) => s.resetExecution);

  const running = mode === MachineMode.AUTO;
  const paused = mode === MachineMode.HOLD;
  const returning = mode === MachineMode.RTL;

  const canStart =
    connected && gpsFixed && !eStopActive && workPoints.length > 0 && !running && !returning;

  const handleStart = () => {
    Alert.alert(
      'Start Working?',
      'The machine will start the engine and follow the field route on its own. Make sure the area is clear.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          style: 'default',
          onPress: () => {
            resetExecution();
            sendAll(buildStartWorking());
          },
        },
      ]
    );
  };

  const handlePause = () => sendAll([buildPauseWorking()]);
  const handleResume = () => sendAll([buildResumeWorking()]);

  const handleReturnToStart = () => {
    Alert.alert('Return to Start?', 'The machine will stop working and drive back to its starting point.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Return', onPress: () => sendAll([buildReturnToStart()]) },
    ]);
  };

  let hint: string | null = null;
  if (!connected) hint = 'Connect to the machine to start working';
  else if (eStopActive) hint = 'Emergency Stop is active';
  else if (!gpsFixed) hint = 'Waiting for GPS before work can start';
  else if (workPoints.length === 0) hint = 'Send a field plan first';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {!running && !paused ? (
          <TouchableOpacity
            style={[styles.button, styles.startButton, !canStart && styles.buttonDisabled]}
            onPress={handleStart}
            disabled={!canStart}
          >
            <Ionicons name="play" size={22} color={Colors.textPrimary} />
            <Text style={styles.buttonText}>Start Working</Text>
          </TouchableOpacity>
        ) : (
          <>
            {running ? (
              <TouchableOpacity style={[styles.button, styles.pauseButton]} onPress={handlePause}>
                <Ionicons name="pause" size={22} color={Colors.textPrimary} />
                <Text style={styles.buttonText}>Pause</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.button, styles.startButton]} onPress={handleResume}>
                <Ionicons name="play" size={22} color={Colors.textPrimary} />
                <Text style={styles.buttonText}>Resume</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.button, styles.homeButton]} onPress={handleReturnToStart}>
              <Ionicons name="home" size={20} color={Colors.textPrimary} />
              <Text style={styles.buttonText}>Return to Start</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      {returning && (
        <Text style={styles.statusText}>Returning to start...</Text>
      )}
      {hint && !running && !paused && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Layout.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Layout.radius.md,
    paddingVertical: Layout.spacing.md,
    gap: Layout.spacing.xs,
  },
  startButton: {
    backgroundColor: Colors.primary,
  },
  pauseButton: {
    backgroundColor: Colors.warning,
  },
  homeButton: {
    backgroundColor: Colors.earth,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  hint: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Layout.spacing.xs,
  },
  statusText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.earth,
    textAlign: 'center',
    marginTop: Layout.spacing.xs,
    fontWeight: '600',
  },
});
