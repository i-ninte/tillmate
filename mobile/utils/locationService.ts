/**
 * Cross-platform location service
 * Uses expo-location on native (iOS/Android) and browser Geolocation API on web
 */

import { Platform } from 'react-native';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface LocationPermissionResult {
  granted: boolean;
}

export interface LocationResult {
  coords: LocationCoords;
}

// Platform-specific implementation
class LocationService {
  private nativeLocation: any = null;

  constructor() {
    // Only require expo-location on native platforms
    if (Platform.OS !== 'web') {
      try {
        this.nativeLocation = require('expo-location');
      } catch (e) {
        console.warn('expo-location not available:', e);
      }
    }
  }

  async requestPermissions(): Promise<LocationPermissionResult> {
    if (Platform.OS === 'web') {
      // Web: Check if geolocation is available
      return new Promise((resolve) => {
        if (!('geolocation' in navigator)) {
          resolve({ granted: false });
          return;
        }

        // Try to get position to check permission
        navigator.geolocation.getCurrentPosition(
          () => resolve({ granted: true }),
          (error) => {
            // PERMISSION_DENIED = 1
            resolve({ granted: error.code !== 1 });
          },
          { timeout: 5000 }
        );
      });
    }

    // Native: Use expo-location
    if (this.nativeLocation) {
      try {
        const { status } = await this.nativeLocation.requestForegroundPermissionsAsync();
        return { granted: status === 'granted' };
      } catch (e) {
        console.error('Error requesting location permissions:', e);
        return { granted: false };
      }
    }

    return { granted: false };
  }

  async getCurrentPosition(): Promise<LocationResult | null> {
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        if (!('geolocation' in navigator)) {
          resolve(null);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              },
            });
          },
          (error) => {
            console.error('Web geolocation error:', error);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
    }

    // Native: Use expo-location
    if (this.nativeLocation) {
      try {
        const location = await this.nativeLocation.getCurrentPositionAsync({
          accuracy: this.nativeLocation.Accuracy?.High || 6,
        });
        return {
          coords: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        };
      } catch (e) {
        console.error('Error getting native location:', e);
        return null;
      }
    }

    return null;
  }
}

// Export singleton instance
export const locationService = new LocationService();
