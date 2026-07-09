/**
 * FieldMap — the boundary/route map surface used across the app.
 *
 * Renders with MapLibre on all platforms:
 *   - iOS / Android via `@maplibre/maplibre-react-native`
 *   - Web via `react-map-gl/maplibre`
 *
 * Same public props on both. Base map defaults to satellite (ESRI World
 * Imagery) so farmers can see their actual field when drawing boundaries.
 *
 * Coordinate order note: MapLibre uses `[lon, lat]` everywhere. That's the
 * boundary between this component and the rest of the app, which uses
 * `{lat, lon}`. Conversion happens right at the MapLibre calls.
 */

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMissionStore } from '../../store';
import { WorkPoint, MapRegion } from '../../types';
import { Colors, Layout, mapStyleJSONFor, ATTRIBUTIONS, BaseMap } from '../../constants';
import { locationService } from '../../utils/locationService';
import WorkPointMarker from './WorkPointMarker';

// Lazy-load per-platform MapLibre bindings — mixing them causes bundler errors.
let RNMap: any = null;
if (Platform.OS !== 'web') {
  try {
    RNMap = require('@maplibre/maplibre-react-native');
  } catch {
    RNMap = null;
  }
}

let WebMap: any = null;
let WebSource: any = null;
let WebLayer: any = null;
let WebMarker: any = null;
if (Platform.OS === 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rmg = require('react-map-gl/maplibre');
    WebMap = rmg.Map;
    WebSource = rmg.Source;
    WebLayer = rmg.Layer;
    WebMarker = rmg.Marker;
    // Styles must be loaded once for the web canvas to render correctly
    require('maplibre-gl/dist/maplibre-gl.css');
  } catch {
    WebMap = null;
  }
}

interface FieldMapProps {
  onPointSelect?: (pointId: string) => void;
  onPointAdded?: (point: WorkPoint) => void;
  editable?: boolean;
  showPath?: boolean;
  // 'points': taps add work points. 'boundary': taps add field boundary corners.
  mode?: 'points' | 'boundary';
  initialRegion?: MapRegion;
  showCurrentLocation?: boolean;
  machineLocation?: { lat: number; lon: number } | null;
  machineHeading?: number | null;
  // 1-based work point the machine is currently heading to (highlighted)
  activePointNumber?: number | null;
  // Trail of where the machine has actually driven
  breadcrumbs?: { lat: number; lon: number }[];
  baseMap?: BaseMap;
}

// Default region — overwritten by user's location once permission is granted
const DEFAULT_REGION: MapRegion = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

function toGeoJSONLine(points: { lat: number; lon: number }[]) {
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: points.map((p) => [p.lon, p.lat]),
    },
    properties: {},
  };
}

function toGeoJSONPolygon(points: { lat: number; lon: number }[]) {
  const ring = [...points, points[0]].map((p) => [p.lon, p.lat]);
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [ring],
    },
    properties: {},
  };
}

export default function FieldMap({
  onPointSelect,
  onPointAdded,
  editable = true,
  showPath = true,
  mode = 'points',
  initialRegion,
  showCurrentLocation = true,
  machineLocation,
  machineHeading,
  activePointNumber,
  breadcrumbs,
  baseMap = 'satellite',
}: FieldMapProps) {
  const {
    workPoints,
    addWorkPoint,
    selectedPointId,
    selectWorkPoint,
    currentPlan,
    setBoundary,
  } = useMissionStore();

  const boundary = currentPlan?.boundary ?? [];

  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [mapRegion, setMapRegion] = useState<MapRegion>(initialRegion || DEFAULT_REGION);
  const [isRetryingPermission, setIsRetryingPermission] = useState(false);

  // Camera refs
  const cameraRef = useRef<any>(null);
  const webMapRef = useRef<any>(null);

  // Style JSON is stable per base map
  const styleJSON = useMemo(() => mapStyleJSONFor(baseMap), [baseMap]);

  // Handler: retry location permission
  const handleRetryPermission = useCallback(async () => {
    setIsRetryingPermission(true);
    try {
      const result = await locationService.requestPermissions();
      if (result.granted) {
        setLocationPermission(true);
        const position = await locationService.getCurrentPosition();
        if (position) {
          const userLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          setCurrentLocation(userLocation);
          setMapRegion({
            latitude: userLocation.lat,
            longitude: userLocation.lon,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
        }
      } else {
        Alert.alert(
          'Permission Denied',
          Platform.OS === 'web'
            ? 'Please allow location access in your browser settings and refresh the page.'
            : 'Please enable location access in your device settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      console.error('Error requesting permissions:', e);
    } finally {
      setIsRetryingPermission(false);
    }
  }, []);

  const handleContinueWithoutLocation = useCallback(() => {
    setLocationPermission(true);
    setMapRegion(initialRegion || DEFAULT_REGION);
  }, [initialRegion]);

  // Get location on mount
  useEffect(() => {
    const getLocation = async () => {
      try {
        setIsLoadingLocation(true);
        const permissionResult = await locationService.requestPermissions();
        setLocationPermission(permissionResult.granted);

        if (permissionResult.granted) {
          const position = await locationService.getCurrentPosition();
          if (position) {
            const userLocation = {
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            };
            setCurrentLocation(userLocation);
            setMapRegion({
              latitude: userLocation.lat,
              longitude: userLocation.lon,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            });
          } else {
            setMapRegion(initialRegion || DEFAULT_REGION);
          }
        } else {
          setMapRegion(initialRegion || DEFAULT_REGION);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setMapRegion(initialRegion || DEFAULT_REGION);
      } finally {
        setIsLoadingLocation(false);
      }
    };
    getLocation();
  }, []);

  // Unified map-press handler; adds a corner or a work point depending on mode
  const handleMapPress = useCallback(
    (latitude: number, longitude: number) => {
      if (!editable) return;

      if (mode === 'boundary') {
        setBoundary([...boundary, { lat: latitude, lon: longitude }]);
        return;
      }

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
          { text: 'Configure Later', style: 'cancel' },
        ]
      );
    },
    [editable, mode, boundary, setBoundary, workPoints.length, addWorkPoint, onPointAdded, selectWorkPoint, onPointSelect]
  );

  const handleMarkerPress = useCallback(
    (pointId: string) => {
      selectWorkPoint(pointId);
      onPointSelect?.(pointId);
    },
    [selectWorkPoint, onPointSelect]
  );

  // Camera controls
  const centerOnUser = useCallback(() => {
    if (!currentLocation) return;
    const target: [number, number] = [currentLocation.lon, currentLocation.lat];
    if (Platform.OS === 'web') {
      webMapRef.current?.flyTo({ center: target, zoom: 16, duration: 500 });
    } else {
      cameraRef.current?.setCamera({ centerCoordinate: target, zoomLevel: 16, animationDuration: 500 });
    }
  }, [currentLocation]);

  const centerOnMachine = useCallback(() => {
    if (!machineLocation) return;
    const target: [number, number] = [machineLocation.lon, machineLocation.lat];
    if (Platform.OS === 'web') {
      webMapRef.current?.flyTo({ center: target, zoom: 16, duration: 500 });
    } else {
      cameraRef.current?.setCamera({ centerCoordinate: target, zoomLevel: 16, animationDuration: 500 });
    }
  }, [machineLocation]);

  const fitToPoints = useCallback(() => {
    if (workPoints.length === 0) return;
    const lats = workPoints.map((p) => p.lat);
    const lons = workPoints.map((p) => p.lon);
    const bounds = {
      sw: [Math.min(...lons), Math.min(...lats)] as [number, number],
      ne: [Math.max(...lons), Math.max(...lats)] as [number, number],
    };
    if (Platform.OS === 'web') {
      webMapRef.current?.fitBounds([bounds.sw, bounds.ne], { padding: 60, duration: 500 });
    } else {
      cameraRef.current?.fitBounds(bounds.ne, bounds.sw, 60, 500);
    }
  }, [workPoints]);

  // GeoJSON payloads memoised so MapLibre doesn't re-diff every render
  const pathFeature = useMemo(
    () => (showPath && workPoints.length > 1 ? toGeoJSONLine(workPoints) : null),
    [showPath, workPoints]
  );
  const boundaryFeature = useMemo(
    () => (boundary.length >= 3 ? toGeoJSONPolygon(boundary) : null),
    [boundary]
  );
  const partialBoundaryFeature = useMemo(
    () => (boundary.length > 0 && boundary.length < 3 ? toGeoJSONLine(boundary) : null),
    [boundary]
  );
  const breadcrumbFeature = useMemo(
    () => (breadcrumbs && breadcrumbs.length > 1 ? toGeoJSONLine(breadcrumbs) : null),
    [breadcrumbs]
  );

  // Loading / permission states — shared across platforms
  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (locationPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="location-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.permissionTitle}>Location Access Required</Text>
        <Text style={styles.permissionText}>
          TillMate needs location access to show the map and let you plan field routes.
        </Text>
        <TouchableOpacity
          style={[styles.permissionButton, isRetryingPermission && styles.permissionButtonDisabled]}
          onPress={handleRetryPermission}
          disabled={isRetryingPermission}
        >
          <Text style={styles.permissionButtonText}>
            {isRetryingPermission ? 'Requesting...' : 'Grant Permission'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleContinueWithoutLocation}>
          <Text style={styles.skipButtonText}>Continue Without Location</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ────────────────────────────────────────────────────────────────
  // Web branch (react-map-gl / maplibre-gl)
  // ────────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    if (!WebMap) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Map not available on this platform</Text>
        </View>
      );
    }
    // Inline GeoJSON layers; markers are absolutely positioned via <Marker>
    return (
      <View style={styles.container}>
        <WebMap
          ref={webMapRef}
          initialViewState={{
            latitude: mapRegion.latitude,
            longitude: mapRegion.longitude,
            zoom: 15,
          }}
          mapStyle={JSON.parse(styleJSON)}
          style={{ width: '100%', height: '100%' }}
          onClick={(e: any) => handleMapPress(e.lngLat.lat, e.lngLat.lng)}
        >
          {boundaryFeature && (
            <WebSource id="boundary-src" type="geojson" data={boundaryFeature}>
              <WebLayer id="boundary-fill" type="fill" paint={{ 'fill-color': Colors.primary, 'fill-opacity': 0.15 }} />
              <WebLayer id="boundary-line" type="line" paint={{ 'line-color': Colors.warning, 'line-width': 2 }} />
            </WebSource>
          )}
          {partialBoundaryFeature && (
            <WebSource id="partial-src" type="geojson" data={partialBoundaryFeature}>
              <WebLayer id="partial-line" type="line" paint={{ 'line-color': Colors.warning, 'line-width': 2 }} />
            </WebSource>
          )}
          {pathFeature && (
            <WebSource id="path-src" type="geojson" data={pathFeature}>
              <WebLayer
                id="path-line"
                type="line"
                paint={{ 'line-color': Colors.primary, 'line-width': 3, 'line-dasharray': [2, 1] }}
              />
            </WebSource>
          )}
          {breadcrumbFeature && (
            <WebSource id="breadcrumb-src" type="geojson" data={breadcrumbFeature}>
              <WebLayer id="breadcrumb-line" type="line" paint={{ 'line-color': Colors.warning, 'line-width': 3 }} />
            </WebSource>
          )}
          {mode === 'boundary' &&
            boundary.map((b, i) => (
              <WebMarker key={`corner-${i}`} longitude={b.lon} latitude={b.lat} anchor="center">
                <View style={styles.cornerMarker}>
                  <Text style={styles.cornerMarkerText}>{i + 1}</Text>
                </View>
              </WebMarker>
            ))}
          {workPoints.map((point, index) => (
            <WebMarker
              key={point.id}
              longitude={point.lon}
              latitude={point.lat}
              anchor="center"
              onClick={(e: any) => {
                e.originalEvent?.stopPropagation?.();
                handleMarkerPress(point.id);
              }}
            >
              <WorkPointMarker
                index={index + 1}
                point={point}
                isSelected={selectedPointId === point.id || activePointNumber === index + 1}
              />
            </WebMarker>
          ))}
          {machineLocation && (
            <WebMarker longitude={machineLocation.lon} latitude={machineLocation.lat} anchor="center">
              <View style={styles.machineMarker}>
                <View
                  style={[
                    styles.machineArrow,
                    machineHeading != null && { transform: [{ rotate: `${machineHeading}deg` }] },
                  ]}
                >
                  <Ionicons name="navigate" size={32} color={Colors.warning} />
                </View>
              </View>
            </WebMarker>
          )}
        </WebMap>
        {renderOverlays({
          mode,
          boundary,
          workPoints,
          machineLocation,
          onCenterUser: currentLocation ? centerOnUser : null,
          onCenterMachine: machineLocation ? centerOnMachine : null,
          onFitPoints: workPoints.length > 0 ? fitToPoints : null,
          onUndoCorner: boundary.length > 0 ? () => setBoundary(boundary.slice(0, -1)) : null,
          editable,
          attribution: ATTRIBUTIONS[baseMap],
        })}
      </View>
    );
  }

  // ────────────────────────────────────────────────────────────────
  // Native branch (@maplibre/maplibre-react-native)
  // ────────────────────────────────────────────────────────────────
  if (!RNMap) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Map library not available</Text>
      </View>
    );
  }

  const { MapView, Camera, ShapeSource, LineLayer, FillLayer, MarkerView, UserLocation } = RNMap;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        styleJSON={styleJSON}
        onPress={(e: any) => {
          const coords = e?.geometry?.coordinates;
          if (Array.isArray(coords) && coords.length === 2) {
            handleMapPress(coords[1], coords[0]);
          }
        }}
        compassEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [mapRegion.longitude, mapRegion.latitude],
            zoomLevel: 15,
          }}
        />
        {showCurrentLocation && <UserLocation visible={true} />}

        {boundaryFeature && (
          <ShapeSource id="boundary-src" shape={boundaryFeature}>
            <FillLayer id="boundary-fill" style={{ fillColor: Colors.primary, fillOpacity: 0.15 }} />
            <LineLayer id="boundary-line" style={{ lineColor: Colors.warning, lineWidth: 2 }} />
          </ShapeSource>
        )}
        {partialBoundaryFeature && (
          <ShapeSource id="partial-src" shape={partialBoundaryFeature}>
            <LineLayer id="partial-line" style={{ lineColor: Colors.warning, lineWidth: 2 }} />
          </ShapeSource>
        )}
        {pathFeature && (
          <ShapeSource id="path-src" shape={pathFeature}>
            <LineLayer id="path-line" style={{ lineColor: Colors.primary, lineWidth: 3, lineDasharray: [2, 1] }} />
          </ShapeSource>
        )}
        {breadcrumbFeature && (
          <ShapeSource id="breadcrumb-src" shape={breadcrumbFeature}>
            <LineLayer id="breadcrumb-line" style={{ lineColor: Colors.warning, lineWidth: 3 }} />
          </ShapeSource>
        )}

        {mode === 'boundary' &&
          boundary.map((b, i) => (
            <MarkerView key={`corner-${i}`} coordinate={[b.lon, b.lat]} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.cornerMarker}>
                <Text style={styles.cornerMarkerText}>{i + 1}</Text>
              </View>
            </MarkerView>
          ))}

        {workPoints.map((point, index) => (
          <MarkerView
            key={point.id}
            coordinate={[point.lon, point.lat]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <TouchableOpacity onPress={() => handleMarkerPress(point.id)}>
              <WorkPointMarker
                index={index + 1}
                point={point}
                isSelected={selectedPointId === point.id || activePointNumber === index + 1}
              />
            </TouchableOpacity>
          </MarkerView>
        ))}

        {machineLocation && (
          <MarkerView
            coordinate={[machineLocation.lon, machineLocation.lat]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.machineMarker}>
              <View
                style={[
                  styles.machineArrow,
                  machineHeading != null && { transform: [{ rotate: `${machineHeading}deg` }] },
                ]}
              >
                <Ionicons name="navigate" size={32} color={Colors.warning} />
              </View>
            </View>
          </MarkerView>
        )}
      </MapView>

      {renderOverlays({
        mode,
        boundary,
        workPoints,
        machineLocation,
        onCenterUser: currentLocation ? centerOnUser : null,
        onCenterMachine: machineLocation ? centerOnMachine : null,
        onFitPoints: workPoints.length > 0 ? fitToPoints : null,
        onUndoCorner: boundary.length > 0 ? () => setBoundary(boundary.slice(0, -1)) : null,
        editable,
        attribution: ATTRIBUTIONS[baseMap],
      })}
    </View>
  );
}

// Overlays are identical between platforms — hoisted so the two branches
// don't drift out of sync.
function renderOverlays({
  mode,
  boundary,
  workPoints,
  machineLocation,
  onCenterUser,
  onCenterMachine,
  onFitPoints,
  onUndoCorner,
  editable,
  attribution,
}: {
  mode: 'points' | 'boundary';
  boundary: { lat: number; lon: number }[];
  workPoints: WorkPoint[];
  machineLocation?: { lat: number; lon: number } | null;
  onCenterUser: (() => void) | null;
  onCenterMachine: (() => void) | null;
  onFitPoints: (() => void) | null;
  onUndoCorner: (() => void) | null;
  editable: boolean;
  attribution: string;
}) {
  return (
    <>
      <View style={styles.mapControls}>
        {onCenterMachine && (
          <TouchableOpacity style={styles.controlButton} onPress={onCenterMachine}>
            <Ionicons name="navigate" size={24} color={Colors.warning} />
          </TouchableOpacity>
        )}
        {onCenterUser && (
          <TouchableOpacity style={styles.controlButton} onPress={onCenterUser}>
            <Ionicons name="locate" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        {onFitPoints && (
          <TouchableOpacity style={styles.controlButton} onPress={onFitPoints}>
            <Ionicons name="scan" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {editable && mode === 'boundary' && boundary.length < 3 && (
        <View style={styles.instructionOverlay}>
          <Text style={styles.instructionText}>
            Tap the corners of your field ({boundary.length}/3 minimum)
          </Text>
        </View>
      )}
      {editable && mode === 'points' && workPoints.length === 0 && boundary.length === 0 && (
        <View style={styles.instructionOverlay}>
          <Text style={styles.instructionText}>Tap on the map to add work points</Text>
        </View>
      )}

      {mode === 'boundary' && onUndoCorner && (
        <TouchableOpacity style={styles.undoCornerButton} onPress={onUndoCorner}>
          <Ionicons name="arrow-undo" size={18} color={Colors.textPrimary} />
          <Text style={styles.undoCornerText}>Undo corner</Text>
        </TouchableOpacity>
      )}

      <View style={styles.countBadge}>
        <Text style={styles.countText}>{workPoints.length} points</Text>
      </View>

      <View style={styles.attributionBadge}>
        <Text style={styles.attributionText}>{attribution}</Text>
      </View>
    </>
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
  permissionButtonDisabled: {
    opacity: 0.6,
  },
  permissionButtonText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  skipButton: {
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.md,
    marginTop: Layout.spacing.sm,
  },
  skipButtonText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
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
  attributionBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attributionText: {
    fontSize: 10,
    color: Colors.textPrimary,
  },
  cornerMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cornerMarkerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  undoCornerButton: {
    position: 'absolute',
    bottom: Layout.spacing.sm,
    left: Layout.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
    gap: Layout.spacing.xs,
  },
  undoCornerText: {
    color: Colors.textPrimary,
    fontSize: Layout.fontSize.sm,
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
});
