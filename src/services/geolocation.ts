import { isLocationInBangladesh, BD_BOUNDS } from '../data/bangladeshDistricts';
import { LocationPoint } from '../types';

export interface GeolocationResult {
  lat: number;
  lon: number;
  accuracy?: number;
  isRealGps: boolean;
  isSimulatedBangladesh: boolean;
  message?: string;
}

// Default Bangladesh fallback spot (Gulshan-2 Circle, Dhaka)
export const DEFAULT_BANGLADESH_SPOT = {
  lat: 23.7925,
  lon: 90.4078,
  name: 'Gulshan-2 Circle',
  formatted: 'Gulshan-2 Circle, Dhaka, Bangladesh',
};

/**
 * Requests the browser's live geolocation with high accuracy.
 * If user is physically in Bangladesh, returns their exact GPS coordinates.
 * If user is testing outside Bangladesh (e.g. remote container/browser),
 * gracefully falls back to central Dhaka so Bangladesh ride features work 100%.
 */
export async function requestLiveCoordinates(): Promise<GeolocationResult> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return {
      lat: DEFAULT_BANGLADESH_SPOT.lat,
      lon: DEFAULT_BANGLADESH_SPOT.lon,
      isRealGps: false,
      isSimulatedBangladesh: true,
      message: 'Geolocation is not supported by your browser. Defaulting to Dhaka.',
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Check if user is physically located within Bangladesh
        const inBD = isLocationInBangladesh({ lat: latitude, lon: longitude });

        if (inBD) {
          resolve({
            lat: latitude,
            lon: longitude,
            accuracy,
            isRealGps: true,
            isSimulatedBangladesh: false,
          });
        } else {
          // Testing outside Bangladesh -> Snap to Dhaka hub
          resolve({
            lat: DEFAULT_BANGLADESH_SPOT.lat,
            lon: DEFAULT_BANGLADESH_SPOT.lon,
            accuracy: 10,
            isRealGps: true,
            isSimulatedBangladesh: true,
            message: `Detected GPS (${latitude.toFixed(2)}, ${longitude.toFixed(2)}) is outside Bangladesh. Localized to Dhaka hub for Bangladesh ride operations.`,
          });
        }
      },
      (error) => {
        let msg = 'Could not access device location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Defaulting to Dhaka hub.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information unavailable. Defaulting to Dhaka hub.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Defaulting to Dhaka hub.';
        }

        resolve({
          lat: DEFAULT_BANGLADESH_SPOT.lat,
          lon: DEFAULT_BANGLADESH_SPOT.lon,
          isRealGps: false,
          isSimulatedBangladesh: true,
          message: msg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 10000,
      }
    );
  });
}
