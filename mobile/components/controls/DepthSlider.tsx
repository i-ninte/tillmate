import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { useControlStore, useTelemetryStore } from '../../store';
import { Colors, Layout } from '../../constants';
import { mavlinkService } from '../../services/MavlinkService';
import { buildImplementDepth } from '../../utils/mavlinkBuilders';
import { telemetryLogger } from '../../services/telemetryLogger';

interface DepthSliderProps {
  disabled?: boolean;
}

export default function DepthSlider({ disabled = false }: DepthSliderProps) {
  const { depthPercent, depthPending, setDepth, setDepthPending } =
    useControlStore();
  const actualDepth = useTelemetryStore((s) => s.implementDepthCm);

  // Local state for smooth slider movement
  const [localValue, setLocalValue] = useState(depthPercent);

  const handleValueChange = (value: number) => {
    setLocalValue(value);
  };

  const handleSlidingComplete = async (value: number) => {
    // Only send command on release (not during drag) — safety rule
    setDepthPending(true);

    if (mavlinkService.getIsConnected()) {
      const params = buildImplementDepth(value);
      mavlinkService.sendCommand(params);
      telemetryLogger.logCommand({
        commandId: params.command,
        commandName: 'DO_SET_SERVO',
        param1: params.param1,
        param2: params.param2,
        source: 'realtime',
      });
    }

    // Reflect the target immediately; actual depth arrives via telemetry
    setTimeout(() => {
      setDepth(value);
    }, mavlinkService.getIsConnected() ? 300 : 500);
  };

  const displayDepth =
    actualDepth !== null ? `${actualDepth.toFixed(0)} cm` : '-- cm';

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <View style={styles.header}>
        <Text style={styles.label}>Implement Depth</Text>
        <Text style={styles.value}>{displayDepth}</Text>
      </View>

      <View style={styles.sliderContainer}>
        <Text style={styles.minLabel}>Raised</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={localValue}
          onValueChange={handleValueChange}
          onSlidingComplete={handleSlidingComplete}
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.surfaceLight}
          thumbTintColor={depthPending ? Colors.warning : Colors.primary}
          disabled={disabled}
        />
        <Text style={styles.maxLabel}>Lowered</Text>
      </View>

      <View style={styles.percentContainer}>
        <Text style={styles.percentValue}>{Math.round(localValue)}%</Text>
        {depthPending && <Text style={styles.pending}>Sending...</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  label: {
    fontSize: Layout.fontSize.md,
    fontWeight: Layout.fontWeight.medium,
    color: Colors.textPrimary,
  },
  value: {
    fontSize: Layout.fontSize.lg,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.earth,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    height: Layout.sliderHeight,
  },
  minLabel: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textSecondary,
    width: 50,
  },
  maxLabel: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textSecondary,
    width: 50,
    textAlign: 'right',
  },
  percentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Layout.spacing.xs,
  },
  percentValue: {
    fontSize: Layout.fontSize.md,
    fontWeight: Layout.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  pending: {
    fontSize: Layout.fontSize.sm,
    color: Colors.warning,
    marginLeft: Layout.spacing.sm,
  },
});
