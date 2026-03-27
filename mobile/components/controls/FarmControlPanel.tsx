import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useControlStore, useTelemetryStore } from '../../store';
import { Colors, Layout } from '../../constants';
import RelayButton from './RelayButton';
import DepthSlider from './DepthSlider';

interface FarmControlPanelProps {
  onPlanMission?: () => void;
}

export default function FarmControlPanel({
  onPlanMission,
}: FarmControlPanelProps) {
  const {
    tillerOn,
    pumpOn,
    tillerPending,
    pumpPending,
    setTiller,
    setPump,
    setTillerPending,
    setPumpPending,
  } = useControlStore();

  const eStopActive = useTelemetryStore((s) => s.eStopActive);

  const handleTillerToggle = async () => {
    setTillerPending(true);

    // TODO: Send MAVLink command via MavlinkService
    // MAV_CMD_DO_SET_RELAY with relay=0, state=!tillerOn

    // Simulate for now
    setTimeout(() => {
      setTiller(!tillerOn);
    }, 500);
  };

  const handlePumpToggle = async () => {
    setPumpPending(true);

    // TODO: Send MAVLink command via MavlinkService
    // MAV_CMD_DO_SET_RELAY with relay=1, state=!pumpOn

    // Simulate for now
    setTimeout(() => {
      setPump(!pumpOn);
    }, 500);
  };

  // Disable controls if E-Stop is active
  const controlsDisabled = eStopActive;

  return (
    <View style={styles.container}>
      {/* Relay Controls */}
      <View style={styles.relayRow}>
        <RelayButton
          label="Tiller"
          icon="cog"
          isOn={tillerOn}
          isPending={tillerPending}
          onToggle={handleTillerToggle}
          disabled={controlsDisabled}
        />

        <RelayButton
          label="Pump"
          icon="water"
          isOn={pumpOn}
          isPending={pumpPending}
          onToggle={handlePumpToggle}
          disabled={controlsDisabled}
        />

        {/* Plan Mission Button */}
        {onPlanMission && (
          <TouchableOpacity
            onPress={onPlanMission}
            style={styles.planButton}
            activeOpacity={0.7}
          >
            <Ionicons name="map" size={28} color={Colors.textSecondary} />
            <Text style={styles.planLabel}>Plan</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Depth Slider */}
      <DepthSlider disabled={controlsDisabled} />

      {/* E-Stop Warning */}
      {eStopActive && (
        <View style={styles.estopWarning}>
          <Ionicons name="alert-circle" size={20} color={Colors.estop} />
          <Text style={styles.estopText}>
            E-Stop Active - Controls Disabled
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Layout.spacing.sm,
  },
  relayRow: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
  },
  planButton: {
    width: Layout.relayButtonSize,
    height: Layout.relayButtonSize,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planLabel: {
    fontSize: Layout.fontSize.xs,
    fontWeight: Layout.fontWeight.medium,
    color: Colors.textSecondary,
    marginTop: Layout.spacing.xs,
  },
  estopWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.sm,
    borderWidth: 1,
    borderColor: Colors.estop,
  },
  estopText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: Layout.fontWeight.medium,
    color: Colors.estop,
    marginLeft: Layout.spacing.sm,
  },
});
