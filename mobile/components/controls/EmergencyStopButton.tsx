import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Vibration,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useControlStore } from '../../store';
import { Colors, Layout } from '../../constants';

export default function EmergencyStopButton() {
  const { eStopSending, setEStopSending, emergencyStop } = useControlStore();

  const handlePress = () => {
    // Haptic feedback
    Vibration.vibrate(100);

    Alert.alert(
      'Emergency Stop',
      'This will immediately stop the tiller, pump, and raise the implement. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'STOP',
          style: 'destructive',
          onPress: executeEmergencyStop,
        },
      ]
    );
  };

  const executeEmergencyStop = async () => {
    setEStopSending(true);

    // TODO: Send MAVLink commands via MavlinkService:
    // 1. Tiller OFF (relay 0 = 0)
    // 2. Pump OFF (relay 1 = 0)
    // 3. Implement raised (servo = 1000 PWM)

    // Simulate for now
    setTimeout(() => {
      emergencyStop();
    }, 500);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={eStopSending}
      style={[styles.button, eStopSending && styles.sending]}
      activeOpacity={0.8}
    >
      <Ionicons name="hand-left" size={32} color={Colors.textPrimary} />
      <Text style={styles.label}>
        {eStopSending ? 'STOPPING...' : 'EMERGENCY STOP'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: Layout.spacing.lg,
    right: Layout.spacing.lg,
    backgroundColor: Colors.estop,
    minHeight: Layout.estopMinHeight,
    minWidth: 120,
    borderRadius: Layout.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    elevation: 8,
    shadowColor: Colors.estop,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  sending: {
    backgroundColor: Colors.warning,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: Layout.fontSize.sm,
    fontWeight: Layout.fontWeight.bold,
    marginTop: Layout.spacing.xs,
    textAlign: 'center',
  },
});
