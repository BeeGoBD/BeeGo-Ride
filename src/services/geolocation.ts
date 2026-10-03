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

// Hub coordinates for Bangladesh cities
export const CHATTOGRAM_SPOT = {
  lat: 22.3569,
  lon: 91.7832,
  name: 'GEC Circle, Chattogram',
  formatted: 'GEC Circle, Nasirabad, Chattogram, Bangladesh',
};

export const DHAKA_SPOT = {
  lat: 23.7925,
  lon: 90.4078,
  name: 'Gulshan-2 Circle, Dhaka',
  formatted: 'Gulshan-2 Circle, Dhaka, Bangladesh',
};

const PREFERRED_CITY_KEY = 'beego_preferred_city';

export function getPreferredCity(): 'chattogram' | 'dhaka' {
  if (typeof window === 'undefined') return 'chattogram';
  try {
    const stored = localStorage.getItem(PREFERRED_CITY_KEY);
    if (stored === 'dhaka' || stored === 'chattogram') return stored;
  } catch {}
  return 'chattogram'; // Default to Chittagong as requested by user
}

export function setPreferredCity(city: 'chattogram' | 'dhaka'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFERRED_CITY_KEY, city);
  } catch {}
}

export function getDefaultSpot() {
  const pref = getPreferredCity();
  return pref === 'dhaka' ? DHAKA_SPOT : CHATTOGRAM_SPOT;
}

// Default Bangladesh fallback spot
export const DEFAULT_BANGLADESH_SPOT = CHATTOGRAM_SPOT;

/**
 * Requests the browser's live geolocation with high accuracy.
 * Uses adaptive dual-stage resolution (fast cached/network + high accuracy GPS)
 * so Android WebViews and mobile browsers do not hang on GPS satellite lock.
 */
export async function requestLiveCoordinates(): Promise<GeolocationResult> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    const defaultSpot = getDefaultSpot();
    return {
      lat: defaultSpot.lat,
      lon: defaultSpot.lon,
      isRealGps: false,
      isSimulatedBangladesh: true,
      message: 'Geolocation is not supported by your browser.',
    };
  }

  // Check if real browser location prompt already acquired recent position (< 2 minutes old)
  const earlyGps = (window as any).__BEEGO_LIVE_GPS__;
  if (earlyGps && earlyGps.lat && earlyGps.lon && earlyGps.timestamp && Date.now() - earlyGps.timestamp < 120000) {
    const lat = earlyGps.lat;
    const lon = earlyGps.lon;
    if (Math.abs(lat - 22.35) < 1.2) {
      setPreferredCity('chattogram');
    } else if (Math.abs(lat - 23.8) < 1.0) {
      setPreferredCity('dhaka');
    }
    return {
      lat,
      lon,
      accuracy: earlyGps.accuracy,
      isRealGps: true,
      isSimulatedBangladesh: false,
    };
  }

  const queryPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  let position: GeolocationPosition | null = null;
  let lastError: GeolocationPositionError | null = null;

  // 1. Stage 1: Try high-accuracy with 7s timeout & 30s maxAge (prompts native dialog if needed)
  try {
    position = await queryPosition({
      enableHighAccuracy: true,
      timeout: 7000,
      maximumAge: 30000,
    });
  } catch (err: any) {
    lastError = err;
    console.warn('[Geolocation] High-accuracy attempt failed/timed out, trying fast network/cell location:', err?.message || err);
  }

  // 2. Stage 2: If high-accuracy timed out or hardware GPS is unavailable indoors, try fast network/cell triangulation
  if (!position && lastError?.code !== 1) {
    try {
      position = await queryPosition({
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000,
      });
    } catch (err: any) {
      lastError = err;
      console.warn('[Geolocation] Standard network location failed:', err?.message || err);
    }
  }

  if (position) {
    const { latitude, longitude, accuracy } = position.coords;
    
    // Save to window cache
    (window as any).__BEEGO_LIVE_GPS__ = {
      lat: latitude,
      lon: longitude,
      accuracy,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(
        'beego_real_gps_coords',
        JSON.stringify({ lat: latitude, lon: longitude, accuracy, timestamp: Date.now() })
      );
    } catch {}

    // Auto-detect if user is in Chattogram or Dhaka region
    if (Math.abs(latitude - 22.35) < 1.2) {
      setPreferredCity('chattogram');
    } else if (Math.abs(latitude - 23.8) < 1.0) {
      setPreferredCity('dhaka');
    }

    return {
      lat: latitude,
      lon: longitude,
      accuracy,
      isRealGps: true,
      isSimulatedBangladesh: false,
    };
  }

  // 3. Stage 3: If hardware geolocation timed out, check if user had a recent saved location
  try {
    const saved = localStorage.getItem('beego_real_gps_coords');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.lat && parsed.lon) {
        return {
          lat: parsed.lat,
          lon: parsed.lon,
          accuracy: parsed.accuracy,
          isRealGps: true,
          isSimulatedBangladesh: false,
          message: 'Using last known live location while acquiring fresh GPS fix.',
        };
      }
    }
  } catch {}

  // Error handling if permission denied or unavailable
  let msg = 'Could not access device location.';
  if (lastError?.code === 1) {
    msg = 'Location permission was denied. Please allow location access in your browser or device settings.';
  } else if (lastError?.code === 2) {
    msg = 'Location information unavailable. Please turn on device GPS.';
  } else if (lastError?.code === 3) {
    msg = 'Location request timed out. Please tap Locate to retry.';
  }

  return {
    lat: 0,
    lon: 0,
    accuracy: 0,
    isRealGps: false,
    isSimulatedBangladesh: false,
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
      if (Math.abs(latitude - 22.35) < 1.2) {
        setPreferredCity('chattogram');
      } else if (Math.abs(latitude - 23.8) < 1.0) {
        setPreferredCity('dhaka');
      }

      onUpdate({
        lat: latitude,
        lon: longitude,
        accuracy,
        isRealGps: true,
        isSimulatedBangladesh: false,
      });
    },
    (err) => {
      console.warn('watchPosition update error:', err);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 15000,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}
