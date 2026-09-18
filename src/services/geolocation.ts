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
 * Requests the browser's live geolocation with high accuracy and low-accuracy network fallback.
 * If user is in Bangladesh, returns their exact GPS coordinates.
 * If user is testing outside Bangladesh, gracefully localizes to Dhaka hub for Bangladesh ride operations.
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

  const queryPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  let position: GeolocationPosition | null = null;
  let lastError: GeolocationPositionError | null = null;

  // 1. Try high-accuracy (Hardware GPS / precise Wi-Fi) with 4s timeout
  try {
    position = await queryPosition({
      enableHighAccuracy: true,
      timeout: 4000,
      maximumAge: 0,
    });
  } catch (err: any) {
    lastError = err;
  }

  // 2. Fallback to standard network-based location (instant Wi-Fi / IP) if high accuracy timed out or failed
  if (!position) {
    try {
      position = await queryPosition({
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 60000,
      });
    } catch (err: any) {
      lastError = err;
    }
  }

  if (position) {
    const { latitude, longitude, accuracy } = position.coords;
    const inBD = isLocationInBangladesh({ lat: latitude, lon: longitude });

    if (inBD) {
      return {
        lat: latitude,
        lon: longitude,
        accuracy,
        isRealGps: true,
        isSimulatedBangladesh: false,
      };
    } else {
      return {
        lat: DEFAULT_BANGLADESH_SPOT.lat,
        lon: DEFAULT_BANGLADESH_SPOT.lon,
        accuracy: 10,
        isRealGps: true,
        isSimulatedBangladesh: true,
        message: `Detected device GPS (${latitude.toFixed(2)}, ${longitude.toFixed(2)}) is outside Bangladesh. Localized to Dhaka hub for Bangladesh ride services.`,
      };
    }
  }

  // Error handling if permission denied or unavailable
  let msg = 'Could not access device location.';
  if (lastError?.code === 1) {
    msg = 'Location permission was denied. Please allow location access in your browser.';
  } else if (lastError?.code === 2) {
    msg = 'Location information unavailable. Defaulting to Dhaka.';
  } else if (lastError?.code === 3) {
    msg = 'Location request timed out. Defaulting to Dhaka.';
  }

  return {
    lat: DEFAULT_BANGLADESH_SPOT.lat,
    lon: DEFAULT_BANGLADESH_SPOT.lon,
    isRealGps: false,
    isSimulatedBangladesh: true,
    message: msg,
  };
}

/**
 * Subscribes to ongoing live position changes from the device
 */
export function watchLiveCoordinates(
  onUpdate: (res: GeolocationResult) => void
): () => void {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const inBD = isLocationInBangladesh({ lat: latitude, lon: longitude });
      if (inBD) {
        onUpdate({
          lat: latitude,
          lon: longitude,
          accuracy,
          isRealGps: true,
          isSimulatedBangladesh: false,
        });
      }
    },
    (err) => {
      console.warn('watchPosition update error:', err);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 10000,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}
