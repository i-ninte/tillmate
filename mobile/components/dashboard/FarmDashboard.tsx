import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTelemetryStore, selectIsStale } from '../../store';
import { MachineMode } from '../../types';
import { Colors, Layout } from '../../constants';
import DashTile from './DashTile';

// Battery warning thresholds
const BATTERY_WARN_V = 44.0;
const BATTERY_CRITICAL_V = 42.0;

// Temperature warning thresholds
const TEMP_WARN_C = 60;
const TEMP_CRITICAL_C = 70;

interface FarmDashboardProps {
  compact?: boolean;
}

export default function FarmDashboard({ compact = false }: FarmDashboardProps) {
  const telemetry = useTelemetryStore();
  const isStale = selectIsStale(telemetry);

  // If stale, show all values as null
  const getValue = <T,>(value: T | null): T | null => {
    return isStale ? null : value;
  };

  const getModeLabel = (mode: MachineMode): string => {
    switch (mode) {
      case MachineMode.MANUAL:
        return 'Manual';
      case MachineMode.AUTO:
        return 'Auto';
      case MachineMode.GUIDED:
        return 'Guided';
      case MachineMode.HOLD:
        return 'Hold';
      case MachineMode.RTL:
        return 'Return';
      default:
        return '--';
    }
  };

  // In compact mode, show only essential tiles
  const compactTiles = (
    <>
      {/* Battery */}
      <DashTile
        label="Battery"
        value={getValue(telemetry.batteryVoltageV?.toFixed(1) ?? null)}
        unit="V"
        icon="battery-half"
        color={Colors.tileBattery}
        compact={compact}
        warning={
          telemetry.batteryVoltageV !== null &&
          telemetry.batteryVoltageV < BATTERY_WARN_V
        }
        critical={
          telemetry.batteryVoltageV !== null &&
          telemetry.batteryVoltageV < BATTERY_CRITICAL_V
        }
      />

      {/* GPS */}
      <DashTile
        label="GPS"
        value={getValue(
          telemetry.gpsFixed
            ? `Fixed ${telemetry.satellites ?? '?'}`
            : `No Fix ${telemetry.satellites ?? 0}`
        )}
        icon="navigate"
        color={Colors.tileGps}
        compact={compact}
        warning={!telemetry.gpsFixed || (telemetry.satellites !== null && telemetry.satellites < 6)}
        critical={telemetry.satellites !== null && telemetry.satellites < 3}
      />

      {/* Speed */}
      <DashTile
        label="Speed"
        value={getValue(telemetry.speedKmh?.toFixed(1) ?? null)}
        unit="km/h"
        icon="speedometer"
        color={Colors.tileSpeed}
        compact={compact}
      />

      {/* Mode */}
      <DashTile
        label="Mode"
        value={getValue(getModeLabel(telemetry.mode))}
        icon="settings"
        color={Colors.tileMode}
        compact={compact}
      />

      {/* Headlights */}
      <DashTile
        label="Lights"
        value={getValue(telemetry.headlightsOn ? 'ON' : 'OFF')}
        icon={telemetry.headlightsOn ? 'flashlight' : 'flashlight-outline'}
        color={telemetry.headlightsOn ? Colors.tileHeadlights : Colors.darkLight}
        compact={compact}
      />

      {/* E-Stop */}
      <DashTile
        label="E-Stop"
        value={getValue(telemetry.eStopActive ? 'ACTIVE' : 'Ready')}
        icon="alert-circle"
        color={telemetry.eStopActive ? Colors.estop : Colors.success}
        compact={compact}
        critical={telemetry.eStopActive}
      />
    </>
  );

  const fullTiles = (
    <>
      {/* Battery */}
      <DashTile
        label="Battery"
        value={getValue(telemetry.batteryVoltageV?.toFixed(1) ?? null)}
        unit="V"
        icon="battery-half"
        color={Colors.tileBattery}
        warning={
          telemetry.batteryVoltageV !== null &&
          telemetry.batteryVoltageV < BATTERY_WARN_V
        }
        critical={
          telemetry.batteryVoltageV !== null &&
          telemetry.batteryVoltageV < BATTERY_CRITICAL_V
        }
      />

      {/* GPS */}
      <DashTile
        label="GPS"
        value={getValue(
          telemetry.gpsFixed
            ? `Fixed ${telemetry.satellites ?? '?'}`
            : `No Fix ${telemetry.satellites ?? 0}`
        )}
        icon="navigate"
        color={Colors.tileGps}
        warning={!telemetry.gpsFixed || (telemetry.satellites !== null && telemetry.satellites < 6)}
        critical={telemetry.satellites !== null && telemetry.satellites < 3}
      />

      {/* Speed */}
      <DashTile
        label="Speed"
        value={getValue(telemetry.speedKmh?.toFixed(1) ?? null)}
        unit="km/h"
        icon="speedometer"
        color={Colors.tileSpeed}
      />

      {/* Pixhawk Temp */}
      <DashTile
        label="Controller"
        value={getValue(telemetry.pixhawkTempC?.toFixed(0) ?? null)}
        unit="°C"
        icon="thermometer"
        color={Colors.tileTemp}
        warning={
          telemetry.pixhawkTempC !== null && telemetry.pixhawkTempC > TEMP_WARN_C
        }
        critical={
          telemetry.pixhawkTempC !== null &&
          telemetry.pixhawkTempC > TEMP_CRITICAL_C
        }
      />

      {/* Machine Temp */}
      <DashTile
        label="Machine"
        value={getValue(telemetry.machineTempC?.toFixed(0) ?? null)}
        unit="°C"
        icon="hardware-chip"
        color={Colors.tileTemp}
        warning={
          telemetry.machineTempC !== null && telemetry.machineTempC > TEMP_WARN_C
        }
        critical={
          telemetry.machineTempC !== null &&
          telemetry.machineTempC > TEMP_CRITICAL_C
        }
      />

      {/* Implement Depth */}
      <DashTile
        label="Depth"
        value={getValue(telemetry.implementDepthCm?.toFixed(0) ?? null)}
        unit="cm"
        icon="arrow-down"
        color={Colors.tileDepth}
      />

      {/* Mode */}
      <DashTile
        label="Mode"
        value={getValue(getModeLabel(telemetry.mode))}
        icon="settings"
        color={Colors.tileMode}
      />

      {/* Headlights */}
      <DashTile
        label="Lights"
        value={getValue(telemetry.headlightsOn ? 'ON' : 'OFF')}
        icon={telemetry.headlightsOn ? 'flashlight' : 'flashlight-outline'}
        color={telemetry.headlightsOn ? Colors.tileHeadlights : Colors.darkLight}
      />

      {/* E-Stop */}
      <DashTile
        label="E-Stop"
        value={getValue(telemetry.eStopActive ? 'ACTIVE' : 'Ready')}
        icon="alert-circle"
        color={telemetry.eStopActive ? Colors.estop : Colors.success}
        critical={telemetry.eStopActive}
      />
    </>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, compact && styles.containerCompact]}
    >
      {compact ? compactTiles : fullTiles}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Layout.dashTileGap,
    paddingVertical: Layout.spacing.xs,
  },
  containerCompact: {
    gap: Layout.spacing.sm,
  },
});
