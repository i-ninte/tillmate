import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useMissionStore } from '../../store';
import { WorkPoint, MapRegion } from '../../types';
import { Colors, Layout } from '../../constants';

// Only import MapView on native platforms
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
}

// Import WorkPointMarker only on native
const WorkPointMarker = Platform.OS !== 'web'
  ? require('./WorkPointMarker').default
  : null;

interface FieldMapProps {
  onPointSelect?: (pointId: string) => void;
  onPointAdded?: (point: WorkPoint) => void;
  editable?: boolean;
  showPath?: boolean;
  initialRegion?: MapRegion;
  showCurrentLocation?: boolean;
  machineLocation?: { lat: number; lon: number } | null;
  machineHeading?: number | null;
}

// Default region (San Francisco - will be overridden by user location)
const DEFAULT_REGION: MapRegion = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function FieldMap({
  onPointSelect,
  onPointAdded,
  editable = true,
  showPath = true,
  initialRegion,
  showCurrentLocation = true,
  machineLocation,
  machineHeading,
}: FieldMapProps) {
  const mapRef = useRef<any>(null);
  const {
    workPoints,
    addWorkPoint,
    selectedPointId,
    selectWorkPoint,
    removeWorkPoint,
    updateWorkPoint,
  } = useMissionStore();

  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [mapRegion, setMapRegion] = useState<MapRegion>(initialRegion || DEFAULT_REGION);

  // Request location permissions and get current location
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingLocation(true);

        // Request permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        const hasPermission = status === 'granted';
        setLocationPermission(hasPermission);

        if (hasPermission) {
          // Get current location
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          const userLocation = {
            lat: location.coords.latitude,
            lon: location.coords.longitude,
          };
          setCurrentLocation(userLocation);

          // Set map region to user's location
          const newRegion: MapRegion = {
            latitude: userLocation.lat,
            longitude: userLocation.lon,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          };
          setMapRegion(newRegion);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        // Use default region on error
        setMapRegion(initialRegion || DEFAULT_REGION);
      } finally {
        setIsLoadingLocation(false);
      }
    })();
  }, []);

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
      onPointAdded?.(newPoint);

      // Show action configuration dialog
      if (editable) {
        Alert.alert(
          `Point ${workPoints.length + 1} Added`,
          'Would you like to configure machine actions for this point?',
          [
            {
              text: 'Configure Now',
              onPress: () => {
                selectWorkPoint(newPoint.id);
                onPointSelect?.(newPoint.id);
              },
            },
            {
              text: 'Configure Later',
              style: 'cancel',
            },
          ]
        );
      }
    },
    [editable, workPoints.length, addWorkPoint, onPointAdded, selectWorkPoint, onPointSelect]
  );

  // Handle marker press
  const handleMarkerPress = useCallback(
    (pointId: string) => {
      selectWorkPoint(pointId);
      onPointSelect?.(pointId);
    },
    [selectWorkPoint, onPointSelect]
  );

  // Center map on user location
  const centerOnUser = useCallback(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.lat,
        longitude: currentLocation.lon,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [currentLocation]);

  // Center map on machine location
  const centerOnMachine = useCallback(() => {
    if (machineLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: machineLocation.lat,
        longitude: machineLocation.lon,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [machineLocation]);

  // Fit map to show all points
  const fitToPoints = useCallback(() => {
    if (workPoints.length > 0 && mapRef.current) {
      const coordinates = workPoints.map((wp) => ({
        latitude: wp.lat,
        longitude: wp.lon,
      }));
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [workPoints]);

  // Get polyline coordinates from work points
  const pathCoordinates = workPoints.map((wp) => ({
    latitude: wp.lat,
    longitude: wp.lon,
  }));

  // Calculate region to fit all points
  const getRegionForPoints = (): MapRegion => {
    if (workPoints.length === 0) return mapRegion;

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
      // Add a point near current location or default
      const baseLat = currentLocation?.lat || 37.7749;
      const baseLon = currentLocation?.lon || -122.4194;

      const newPoint: WorkPoint = {
        id: `wp-${Date.now()}`,
        seq: workPoints.length,
        lat: baseLat + (Math.random() - 0.5) * 0.01,
        lon: baseLon + (Math.random() - 0.5) * 0.01,
        implementLowered: false,
        tillerOn: false,
        pumpOn: false,
        label: `Point ${workPoints.length + 1}`,
      };
      addWorkPoint(newPoint);
      onPointAdded?.(newPoint);
    };

    const handleToggleAction = (
      pointId: string,
      action: 'implementLowered' | 'tillerOn' | 'pumpOn'
    ) => {
      const point = workPoints.find((p) => p.id === pointId);
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
          {editable && (
            <TouchableOpacity style={styles.addButton} onPress={handleAddPoint}>
              <Ionicons name="add-circle" size={24} color={Colors.primary} />
              <Text style={styles.addButtonText}>Add Point</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.webSubtitle}>
          {workPoints.length === 0
            ? 'No work points added. Click "Add Point" to create waypoints.'
            : `${workPoints.length} work point${workPoints.length > 1 ? 's' : ''} in plan`}
        </Text>

        <ScrollView style={styles.pointsList}>
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
                {editable && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeletePoint(point.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <View style={styles.pointActions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    point.implementLowered && styles.actionButtonActive,
                  ]}
                  onPress={() => handleToggleAction(point.id, 'implementLowered')}
                  disabled={!editable}
                >
                  <Ionicons
                    name="arrow-down"
                    size={16}
                    color={point.implementLowered ? Colors.textPrimary : Colors.textSecondary}
                  />
                  <Text
                    style={[styles.actionText, point.implementLowered && styles.actionTextActive]}
                  >
                    {point.implementLowered ? 'Lowered' : 'Raised'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, point.tillerOn && styles.actionButtonActive]}
                  onPress={() => handleToggleAction(point.id, 'tillerOn')}
                  disabled={!editable}
                >
                  <Ionicons
                    name="cog"
                    size={16}
                    color={point.tillerOn ? Colors.textPrimary : Colors.textSecondary}
                  />
                  <Text style={[styles.actionText, point.tillerOn && styles.actionTextActive]}>
                    Tiller {point.tillerOn ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, point.pumpOn && styles.actionButtonActive]}
                  onPress={() => handleToggleAction(point.id, 'pumpOn')}
                  disabled={!editable}
                >
                  <Ionicons
                    name="water"
                    size={16}
                    color={point.pumpOn ? Colors.textPrimary : Colors.textSecondary}
                  />
                  <Text style={[styles.actionText, point.pumpOn && styles.actionTextActive]}>
                    Pump {point.pumpOn ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Loading state
  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  // Permission denied state
  if (locationPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="location-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.permissionTitle}>Location Access Required</Text>
        <Text style={styles.permissionText}>
          TillMate needs location access to show the map and let you plan field routes.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status === 'granted');
          }}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Native version with actual map
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType="satellite"
        initialRegion={workPoints.length > 0 ? getRegionForPoints() : mapRegion}
        onPress={handleMapPress}
        showsUserLocation={showCurrentLocation}
        showsMyLocationButton={false}
        showsCompass
        rotateEnabled={false}
        loadingEnabled
        loadingIndicatorColor={Colors.primary}
        loadingBackgroundColor={Colors.background}
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

        {/* Machine location marker */}
        {machineLocation && (
          <Marker
            coordinate={{ latitude: machineLocation.lat, longitude: machineLocation.lon }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.machineMarker}>
              <View style={[
                styles.machineArrow,
                machineHeading != null && { transform: [{ rotate: `${machineHeading}deg` }] }
              ]}>
                <Ionicons name="navigate" size={32} color={Colors.warning} />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Map controls */}
      <View style={styles.mapControls}>
        {machineLocation && (
          <TouchableOpacity style={styles.controlButton} onPress={centerOnMachine}>
            <Ionicons name="navigate" size={24} color={Colors.warning} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.controlButton} onPress={centerOnUser}>
          <Ionicons name="locate" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        {workPoints.length > 0 && (
          <TouchableOpacity style={styles.controlButton} onPress={fitToPoints}>
            <Ionicons name="scan" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Instructions overlay */}
      {editable && workPoints.length === 0 && (
        <View style={styles.instructionOverlay}>
          <Text style={styles.instructionText}>Tap on the map to add work points</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    gap: Layout.spacing.md,
  },
  loadingText: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.xl,
    gap: Layout.spacing.md,
  },
  permissionTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    marginTop: Layout.spacing.md,
  },
  permissionButtonText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  mapControls: {
    position: 'absolute',
    right: Layout.spacing.sm,
    top: '50%',
    transform: [{ translateY: -50 }],
    gap: Layout.spacing.sm,
  },
  controlButton: {
    backgroundColor: Colors.surface,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    fontWeight: '600',
  },
  machineMarker: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  machineArrow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
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
    fontWeight: '700',
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
    fontWeight: '500',
  },
  webSubtitle: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.md,
  },
  pointsList: {
    flex: 1,
  },
  pointItem: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: Layout.spacing.sm,
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
    fontWeight: '700',
  },
  pointInfo: {
    flex: 1,
  },
  pointLabel: {
    fontSize: Layout.fontSize.md,
    fontWeight: '500',
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
    fontWeight: '500',
  },
});
