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
  private initialized = false;

  private async initNative() {
    if (this.initialized) return;
    this.initialized = true;

    // Only try to load expo-location on native platforms
    if (Platform.OS !== 'web') {
      try {
        this.nativeLocation = require('expo-location');
      } catch (e) {
        console.warn('expo-location not available:', e);
      }
    }
  }

  async requestPermissions(): Promise<LocationPermissionResult> {
    await this.initNative();

    // On native platforms (iOS/Android), use expo-location
    if (Platform.OS !== 'web') {
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

    // On web, use browser geolocation API
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve({ granted: true }),
          (error) => {
            // PERMISSION_DENIED = 1
            if (error.code === 1) {
              resolve({ granted: false });
            } else {
              // Other error (position unavailable, timeout), permission might still be granted
              resolve({ granted: true });
            }
          },
          { timeout: 5000, maximumAge: 0 }
        );
      });
    }

    return { granted: false };
  }

  async getCurrentPosition(): Promise<LocationResult | null> {
    await this.initNative();

    // On native platforms (iOS/Android), use expo-location
    if (Platform.OS !== 'web') {
      return this.getNativePosition();
    }

    // On web, use browser geolocation API
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      return new Promise((resolve) => {
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
            console.error('Browser geolocation error:', error.message);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
    }

    return null;
  }

  private async getNativePosition(): Promise<LocationResult | null> {
    if (!this.nativeLocation) return null;

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

  // Check if location services are available
  isAvailable(): boolean {
    if (Platform.OS !== 'web') {
      return !!this.nativeLocation;
    }
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  }
}

// Export singleton instance
export const locationService = new LocationService();
