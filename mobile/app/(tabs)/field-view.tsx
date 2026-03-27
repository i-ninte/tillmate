import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useConnectionStore, useTelemetryStore, useMissionStore } from '../../store';
import { Colors, Layout } from '../../constants';
import FarmDashboard from '../../components/dashboard/FarmDashboard';
import FarmControlPanel from '../../components/controls/FarmControlPanel';
import ConnectionBanner from '../../components/common/ConnectionBanner';
import EmergencyStopButton from '../../components/controls/EmergencyStopButton';
import { FieldMap } from '../../components/mission';

export default function FieldViewScreen() {
  const connected = useConnectionStore((s) => s.connected);
  const clearTelemetry = useTelemetryStore((s) => s.clearAll);
  const latDeg = useTelemetryStore((s) => s.latDeg);
  const lonDeg = useTelemetryStore((s) => s.lonDeg);
  const headingDeg = useTelemetryStore((s) => s.headingDeg);
  const gpsFixed = useTelemetryStore((s) => s.gpsFixed);
  const { workPoints, currentPlan } = useMissionStore();
  const [showMap, setShowMap] = useState(true);

  // Machine location from telemetry
  const machineLocation = gpsFixed && latDeg !== null && lonDeg !== null
    ? { lat: latDeg, lon: lonDeg }
    : null;

  // Redirect to connection screen if disconnected
  useEffect(() => {
    if (!connected) {
      clearTelemetry();
      router.replace('/');
    }
  }, [connected]);

  const handlePlanMission = () => {
    router.push('/(tabs)/field-planner');
  };

  const toggleView = () => {
    setShowMap(!showMap);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Connection Banner */}
      <ConnectionBanner />

      {/* Header with view toggle */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Machine Control</Text>
        <TouchableOpacity style={styles.viewToggle} onPress={toggleView}>
          <Ionicons
            name={showMap ? 'list' : 'map'}
            size={20}
            color={Colors.textPrimary}
          />
          <Text style={styles.viewToggleText}>
            {showMap ? 'Dashboard' : 'Map View'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {showMap ? (
          <>
            {/* Dashboard - Compact strip at top */}
            <View style={styles.dashboardStrip}>
              <FarmDashboard compact />
            </View>

            {/* Map Area */}
            <View style={styles.mapContainer}>
              <FieldMap
                editable={false}
                showPath={true}
                machineLocation={machineLocation}
                machineHeading={headingDeg}
                initialRegion={
                  machineLocation
                    ? {
                        latitude: machineLocation.lat,
                        longitude: machineLocation.lon,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }
                    : {
                        latitude: 37.7749,
                        longitude: -122.4194,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }
                }
              />

              {/* GPS Status overlay */}
              <View style={[
                styles.gpsOverlay,
                gpsFixed ? styles.gpsOverlayFixed : styles.gpsOverlayNoFix
              ]}>
                <Ionicons
                  name={gpsFixed ? 'navigate' : 'navigate-outline'}
                  size={16}
                  color={gpsFixed ? Colors.success : Colors.warning}
                />
                <Text style={styles.gpsOverlayText}>
                  {gpsFixed
                    ? `GPS Fixed${machineLocation ? ` (${machineLocation.lat.toFixed(5)}, ${machineLocation.lon.toFixed(5)})` : ''}`
                    : 'Waiting for GPS...'}
                </Text>
              </View>

              {/* Current plan info overlay */}
              {workPoints.length > 0 && (
                <View style={styles.planOverlay}>
                  <Ionicons name="flag" size={16} color={Colors.primary} />
                  <Text style={styles.planOverlayText}>
                    {currentPlan?.name || 'Current Plan'}: {workPoints.length} points
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          /* Dashboard - Full view */
          <View style={styles.dashboardFull}>
            <FarmDashboard />
          </View>
        )}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
    gap: Layout.spacing.xs,
  },
  viewToggleText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  dashboardStrip: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
  },
  dashboardFull: {
    flex: 1,
    padding: Layout.spacing.sm,
  },
  mapContainer: {
    flex: 1,
    margin: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  gpsOverlay: {
    position: 'absolute',
    top: Layout.spacing.sm,
    right: Layout.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
    gap: Layout.spacing.xs,
  },
  gpsOverlayFixed: {
    backgroundColor: 'rgba(74, 124, 35, 0.9)',
  },
  gpsOverlayNoFix: {
    backgroundColor: 'rgba(230, 81, 0, 0.9)',
  },
  gpsOverlayText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textPrimary,
  },
  planOverlay: {
    position: 'absolute',
    top: Layout.spacing.sm,
    left: Layout.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
    gap: Layout.spacing.xs,
  },
  planOverlayText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textPrimary,
  },
  controlSection: {
    paddingHorizontal: Layout.spacing.sm,
    paddingBottom: Layout.spacing.sm,
  },
});
