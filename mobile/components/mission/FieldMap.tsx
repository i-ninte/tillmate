import React, { useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMissionStore } from '../../store';
import { WorkPoint, MapRegion } from '../../types';
import { Colors, Layout } from '../../constants';

// Only import MapView on native platforms
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
}

// Import WorkPointMarker only on native
const WorkPointMarker = Platform.OS !== 'web'
  ? require('./WorkPointMarker').default
  : null;

interface FieldMapProps {
  onPointSelect?: (pointId: string) => void;
  editable?: boolean;
  showPath?: boolean;
  initialRegion?: MapRegion;
}

// Default region (can be overridden)
const DEFAULT_REGION: MapRegion = {
  latitude: 0,
  longitude: 0,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function FieldMap({
  onPointSelect,
  editable = true,
  showPath = true,
  initialRegion = DEFAULT_REGION,
}: FieldMapProps) {
  const mapRef = useRef<any>(null);
  const { workPoints, addWorkPoint, selectedPointId, selectWorkPoint, removeWorkPoint, updateWorkPoint } = useMissionStore();

  // Handle map press to add new work point
  const handleMapPress = useCallback(
    (event: any) => {
      if (!editable) return;

      const { latitude, longitude } = event.nativeEvent.coordinate;

      // Create new work point
      const newPoint: WorkPoint = {
        id: `wp-${Date.now()}`,
        seq: workPoints.length,
        lat: latitude,
        lon: longitude,
        implementLowered: false,
        tillerOn: false,
        pumpOn: false,
        label: `Point ${workPoints.length + 1}`,
      };

      addWorkPoint(newPoint);
    },
    [editable, workPoints.length, addWorkPoint]
  );

  // Handle marker press
  const handleMarkerPress = useCallback(
    (pointId: string) => {
      selectWorkPoint(pointId);
      onPointSelect?.(pointId);
    },
    [selectWorkPoint, onPointSelect]
  );

  // Get polyline coordinates from work points
  const pathCoordinates = workPoints.map((wp) => ({
    latitude: wp.lat,
    longitude: wp.lon,
  }));

  // Calculate region to fit all points
  const getRegionForPoints = (): MapRegion => {
    if (workPoints.length === 0) return initialRegion;

    const lats = workPoints.map((p) => p.lat);
    const lons = workPoints.map((p) => p.lon);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;
    const deltaLat = Math.max(0.005, (maxLat - minLat) * 1.5);
    const deltaLon = Math.max(0.005, (maxLon - minLon) * 1.5);

    return {
      latitude: centerLat,
      longitude: centerLon,
      latitudeDelta: deltaLat,
      longitudeDelta: deltaLon,
    };
  };

  // Web version - interactive list with add/edit functionality
  if (Platform.OS === 'web') {
    const handleAddPoint = () => {
      // Add a sample point (in real app, would use geolocation or input)
      const newPoint: WorkPoint = {
        id: `wp-${Date.now()}`,
        seq: workPoints.length,
        lat: 37.7749 + (Math.random() - 0.5) * 0.01,
        lon: -122.4194 + (Math.random() - 0.5) * 0.01,
        implementLowered: false,
        tillerOn: false,
        pumpOn: false,
        label: `Point ${workPoints.length + 1}`,
      };
      addWorkPoint(newPoint);
    };

    const handleToggleAction = (pointId: string, action: 'implementLowered' | 'tillerOn' | 'pumpOn') => {
      const point = workPoints.find(p => p.id === pointId);
      if (point) {
        updateWorkPoint(pointId, { [action]: !point[action] });
      }
    };

    const handleDeletePoint = (pointId: string) => {
      removeWorkPoint(pointId);
    };

    return (
      <View style={styles.webContainer}>
        <View style={styles.webHeader}>
          <Text style={styles.webTitle}>Field Plan</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddPoint}>
            <Ionicons name="add-circle" size={24} color={Colors.primary} />
            <Text style={styles.addButtonText}>Add Point</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.webSubtitle}>
          {workPoints.length === 0
            ? 'No work points added. Click "Add Point" to create waypoints.'
            : `${workPoints.length} work point${workPoints.length > 1 ? 's' : ''} in plan`
          }
        </Text>

        <View style={styles.pointsList}>
          {workPoints.map((point, index) => (
            <View
              key={point.id}
              style={[
                styles.pointItem,
                selectedPointId === point.id && styles.pointItemSelected,
              ]}
            >
              <TouchableOpacity
                style={styles.pointHeader}
                onPress={() => handleMarkerPress(point.id)}
              >
                <View style={styles.pointNumber}>
                  <Text style={styles.pointNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.pointInfo}>
                  <Text style={styles.pointLabel}>{point.label}</Text>
                  <Text style={styles.pointCoords}>
                    {point.lat.toFixed(6)}, {point.lon.toFixed(6)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePoint(point.id)}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                </TouchableOpacity>
              </TouchableOpacity>

              <View style={styles.pointActions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    point.implementLowered && styles.actionButtonActive,
                  ]}
                  onPress={() => handleToggleAction(point.id, 'implementLowered')}
                >
                  <Ionicons
                    name="arrow-down"
                    size={16}
                    color={point.implementLowered ? Colors.textPrimary : Colors.textSecondary}
                  />
                  <Text style={[
                    styles.actionText,
                    point.implementLowered && styles.actionTextActive,
                  ]}>
                    {point.implementLowered ? 'Lowered' : 'Raised'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    point.tillerOn && styles.actionButtonActive,
                  ]}
                  onPress={() => handleToggleAction(point.id, 'tillerOn')}
                >
                  <Ionicons
                    name="cog"
                    size={16}
                    color={point.tillerOn ? Colors.textPrimary : Colors.textSecondary}
                  />
                  <Text style={[
                    styles.actionText,
                    point.tillerOn && styles.actionTextActive,
                  ]}>
                    Tiller {point.tillerOn ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    point.pumpOn && styles.actionButtonActive,
                  ]}
                  onPress={() => handleToggleAction(point.id, 'pumpOn')}
                >
                  <Ionicons
                    name="water"
                    size={16}
                    color={point.pumpOn ? Colors.textPrimary : Colors.textSecondary}
                  />
                  <Text style={[
                    styles.actionText,
                    point.pumpOn && styles.actionTextActive,
                  ]}>
                    Pump {point.pumpOn ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Native version with actual map
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType="satellite"
        initialRegion={workPoints.length > 0 ? getRegionForPoints() : initialRegion}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        rotateEnabled={false}
      >
        {/* Path polyline */}
        {showPath && pathCoordinates.length > 1 && (
          <Polyline
            coordinates={pathCoordinates}
            strokeColor={Colors.primary}
            strokeWidth={3}
            lineDashPattern={[10, 5]}
          />
        )}

        {/* Work point markers */}
        {workPoints.map((point, index) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.lat, longitude: point.lon }}
            onPress={() => handleMarkerPress(point.id)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <WorkPointMarker
              index={index + 1}
              point={point}
              isSelected={selectedPointId === point.id}
            />
          </Marker>
        ))}
      </MapView>

      {/* Instructions overlay */}
      {editable && workPoints.length === 0 && (
        <View style={styles.instructionOverlay}>
          <Text style={styles.instructionText}>
            Tap on the map to add work points
          </Text>
        </View>
      )}

      {/* Point count badge */}
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{workPoints.length} points</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: Layout.radius.md,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  instructionOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -20 }],
  },
  instructionText: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: Colors.textPrimary,
    fontSize: Layout.fontSize.md,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
  },
  countBadge: {
    position: 'absolute',
    top: Layout.spacing.sm,
    right: Layout.spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.round,
  },
  countText: {
    color: Colors.textPrimary,
    fontSize: Layout.fontSize.sm,
    fontWeight: Layout.fontWeight.semibold,
  },
  // Web styles
  webContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
  },
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  webTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
    gap: Layout.spacing.xs,
  },
  addButtonText: {
    color: Colors.primary,
    fontSize: Layout.fontSize.md,
    fontWeight: Layout.fontWeight.medium,
  },
  webSubtitle: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.md,
  },
  pointsList: {
    flex: 1,
    gap: Layout.spacing.sm,
  },
  pointItem: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pointItemSelected: {
    borderColor: Colors.primary,
  },
  pointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  pointNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.md,
  },
  pointNumberText: {
    color: Colors.textPrimary,
    fontSize: Layout.fontSize.md,
    fontWeight: Layout.fontWeight.bold,
  },
  pointInfo: {
    flex: 1,
  },
  pointLabel: {
    fontSize: Layout.fontSize.md,
    fontWeight: Layout.fontWeight.medium,
    color: Colors.textPrimary,
  },
  pointCoords: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textSecondary,
  },
  deleteButton: {
    padding: Layout.spacing.sm,
  },
  pointActions: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.sm,
    borderRadius: Layout.radius.sm,
    gap: Layout.spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textSecondary,
  },
  actionTextActive: {
    color: Colors.textPrimary,
    fontWeight: Layout.fontWeight.medium,
  },
});
