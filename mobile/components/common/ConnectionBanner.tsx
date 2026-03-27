import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConnectionStore, useTelemetryStore, selectIsStale } from '../../store';
import { Colors, Layout } from '../../constants';

export default function ConnectionBanner() {
  const connected = useConnectionStore((s) => s.connected);
  const telemetryState = useTelemetryStore();
  const isStale = selectIsStale(telemetryState);

  const getStatus = () => {
    if (!connected) {
      return {
        color: Colors.disconnected,
        icon: 'close-circle' as const,
        text: 'Disconnected',
      };
    }
    if (isStale) {
      return {
        color: Colors.warning,
        icon: 'warning' as const,
        text: 'Connection Unstable',
      };
    }
    return {
      color: Colors.connected,
      icon: 'checkmark-circle' as const,
      text: 'Connected',
    };
  };

  const status = getStatus();

  return (
    <View style={[styles.container, { backgroundColor: status.color }]}>
      <Ionicons name={status.icon} size={18} color={Colors.textPrimary} />
      <Text style={styles.text}>{status.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.md,
  },
  text: {
    color: Colors.textPrimary,
    fontSize: Layout.fontSize.sm,
    fontWeight: Layout.fontWeight.medium,
    marginLeft: Layout.spacing.xs,
  },
});
