import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useConnectionStore, useTelemetryStore } from '../store';
import { Colors, Layout } from '../constants';
import FarmDashboard from '../components/dashboard/FarmDashboard';
import FarmControlPanel from '../components/controls/FarmControlPanel';
import ConnectionBanner from '../components/common/ConnectionBanner';
import EmergencyStopButton from '../components/controls/EmergencyStopButton';

export default function FieldViewScreen() {
  const connected = useConnectionStore((s) => s.connected);
  const clearTelemetry = useTelemetryStore((s) => s.clearAll);

  // Redirect to connection screen if disconnected
  useEffect(() => {
    if (!connected) {
      clearTelemetry();
      router.replace('/');
    }
  }, [connected]);

  const handlePlanMission = () => {
    router.push('/field-planner');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Connection Banner */}
      <ConnectionBanner />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Dashboard - Top section */}
        <View style={styles.dashboardSection}>
          <FarmDashboard />
        </View>

        {/* Map would go here in the middle */}
        <View style={styles.mapPlaceholder}>
          {/* TODO: Add FieldMap component */}
        </View>

        {/* Control Panel - Bottom section */}
        <View style={styles.controlSection}>
          <FarmControlPanel onPlanMission={handlePlanMission} />
        </View>
      </View>

      {/* Emergency Stop - Always visible */}
      <EmergencyStopButton />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  dashboardSection: {
    paddingHorizontal: Layout.spacing.sm,
    paddingTop: Layout.spacing.sm,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.surface,
    margin: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
  },
  controlSection: {
    paddingHorizontal: Layout.spacing.sm,
    paddingBottom: Layout.spacing.sm,
  },
});
