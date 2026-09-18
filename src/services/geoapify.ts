import { LocationPoint, RouteData, RouteStep } from '../types';
import {
  searchBangladeshDistricts,
  isLocationInBangladesh,
  BD_BOUNDS,
} from '../data/bangladeshDistricts';

const STORAGE_KEY = 'geoapify_api_key';
export const DEFAULT_GEOAPIFY_KEY = '4f9780f14a5842f2b40b99ab7adf2af5';

export function getGeoapifyApiKey(): string {
  // Check localStorage first
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)?.trim();
    if (stored) return stored;
  }
  
  // Check env variable
  const envKey = (import.meta.env.VITE_GEOAPIFY_API_KEY as string | undefined)?.trim();
  if (envKey) return envKey;
  
  // Default key provided for the project
  return DEFAULT_GEOAPIFY_KEY;
}

export function saveGeoapifyApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

/**
 * Real-time address autocomplete strictly restricted to Bangladesh.
 * Integrates Bangladesh's 64 districts for instant matching on 1-2 keys
 * and live Geoapify autocomplete filtered to countrycode:bd.
 * Never suggests any location outside Bangladesh.
 */
export async function searchAddress(
  text: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<LocationPoint[]> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 1) return [];

  // 1. Instant Bangladesh districts match (covers 1-key, 2-key and district queries)
  const districtMatches = searchBangladeshDistricts(trimmed, 8);

  const keyToUse = apiKey.trim() || DEFAULT_GEOAPIFY_KEY;
  if (!keyToUse) {
    return districtMatches;
  }

  // 2. Fetch live Geoapify autocomplete restricted to Bangladesh via filter=countrycode:bd & bias=countrycode:bd
  let geoapifyPoints: LocationPoint[] = [];

  try {
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
      trimmed
    )}&filter=countrycode:bd&bias=countrycode:bd&format=json&limit=10&apiKey=${encodeURIComponent(
      keyToUse
    )}`;

    const response = await fetch(url, { signal });
    if (response.ok) {
      const data = await response.json();
      const results = data.results || (data.features ? data.features.map((f: any) => f.properties) : []);

      for (const item of results) {
        // Enforce strict Bangladesh validation:
        // Must have bd country_code or Bangladesh country or belong to one of BD's 64 districts
        if (!isLocationInBangladesh(item)) {
          continue;
        }

        const formatted = item.formatted || `${item.name || ''}, ${item.city || ''}, Bangladesh`;
        const addressLine1 = item.address_line1 || item.name || item.street || formatted.split(',')[0];
        const addressLine2 = item.address_line2 || [item.city, item.state, 'Bangladesh'].filter(Boolean).join(', ') || formatted;

        geoapifyPoints.push({
          lat: item.lat,
          lon: item.lon,
          formatted,
          addressLine1,
          addressLine2,
          name: item.name,
          street: item.street,
          city: item.city,
          country: 'Bangladesh',
          category: item.category,
          resultType: item.result_type,
          placeId: item.place_id || `${item.lat}_${item.lon}`,
        });
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err;
    }
    // Network or API failure fallback: districtMatches remain available
  }

  // 3. Merge district matches with Geoapify live results without duplicates
  const merged: LocationPoint[] = [];
  const seenCoords = new Set<string>();
  const seenNames = new Set<string>();

  // Prioritize exact district matches on short queries (1-2 chars), or live places on longer queries
  const allCandidates = trimmed.length <= 2
    ? [...districtMatches, ...geoapifyPoints]
    : [...geoapifyPoints, ...districtMatches];

  for (const pt of allCandidates) {
    const coordKey = `${pt.lat.toFixed(3)}_${pt.lon.toFixed(3)}`;
    const nameKey = (pt.name || pt.addressLine1 || pt.formatted || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!seenCoords.has(coordKey) && !seenNames.has(nameKey)) {
      seenCoords.add(coordKey);
      seenNames.add(nameKey);
      merged.push(pt);
    }
  }

  return merged;
}

/**
 * Reverse geocoding for current user coordinates with Bangladesh verification
 */
export async function reverseGeocode(lat: number, lon: number, apiKey: string): Promise<LocationPoint> {
  const keyToUse = apiKey.trim() || DEFAULT_GEOAPIFY_KEY;
  if (!keyToUse) {
    throw new Error('Please enter your Geoapify API key for reverse geocoding.');
  }

  const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&format=json&apiKey=${encodeURIComponent(
    keyToUse
  )}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Reverse geocoding failed (${response.status})`);
  }

  const data = await response.json();
  const item = data.results?.[0] || (data.features?.[0]?.properties ?? null);

  const isInBD = isLocationInBangladesh({
    lat,
    lon,
    country: item?.country,
    country_code: item?.country_code,
    formatted: item?.formatted,
  });

  if (!isInBD) {
    throw new Error('Detected location is outside Bangladesh. Please search for a spot inside Bangladesh.');
  }

  if (!item) {
    return {
      lat,
      lon,
      formatted: `${lat.toFixed(5)}, ${lon.toFixed(5)}, Bangladesh`,
      addressLine1: 'Current GPS Location',
      addressLine2: 'Bangladesh',
      country: 'Bangladesh',
    };
  }

  const formatted = item.formatted || `${item.street || item.name || 'Location'}, ${item.city || ''}, Bangladesh`;
  const addressLine1 = item.address_line1 || item.name || item.street || formatted.split(',')[0];
  const addressLine2 = item.address_line2 || [item.city, item.state, 'Bangladesh'].filter(Boolean).join(', ') || formatted;

  return {
    lat: item.lat ?? lat,
    lon: item.lon ?? lon,
    formatted,
    addressLine1,
    addressLine2,
    name: item.name,
    street: item.street,
    city: item.city,
    country: 'Bangladesh',
    placeId: item.place_id,
  };
}

/**
 * Real-time routing from pickup to dropoff using Geoapify Routing API
 */
export async function calculateRoute(
  pickup: LocationPoint,
  dropoff: LocationPoint,
  apiKey: string
): Promise<RouteData> {
  const keyToUse = apiKey.trim() || DEFAULT_GEOAPIFY_KEY;
  if (!keyToUse) {
    throw new Error('Please provide your Geoapify API key to calculate navigation route.');
  }

  const url = `https://api.geoapify.com/v1/routing?waypoints=${pickup.lat},${pickup.lon}|${dropoff.lat},${dropoff.lon}&mode=drive&details=instruction_details&apiKey=${encodeURIComponent(
    keyToUse
  )}`;

  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid Geoapify API key. Please check your key.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Routing calculation failed (${response.status})`);
  }

  const data = await response.json();
  const feature = data.features?.[0];
  if (!feature) {
    throw new Error('No driving route could be calculated between these spots.');
  }

  const geometry = feature.geometry;
  const rawCoords = geometry.coordinates;
  const convertedCoords: [number, number][] = [];

  // GeoJSON coordinate order is [longitude, latitude].
  // Leaflet requires [latitude, longitude].
  if (geometry.type === 'LineString') {
    for (const pt of rawCoords) {
      if (Array.isArray(pt) && pt.length >= 2) {
        convertedCoords.push([pt[1], pt[0]]);
      }
    }
  } else if (geometry.type === 'MultiLineString') {
    for (const line of rawCoords) {
      for (const pt of line) {
        if (Array.isArray(pt) && pt.length >= 2) {
          convertedCoords.push([pt[1], pt[0]]);
        }
      }
    }
  }

  const props = feature.properties || {};
  const distanceMeters = props.distance || 0;
  const timeSeconds = props.time || 0;

  // Extract turn-by-turn navigation instructions
  const steps: RouteStep[] = [];
  if (props.legs && Array.isArray(props.legs)) {
    for (const leg of props.legs) {
      if (leg.steps && Array.isArray(leg.steps)) {
        for (const step of leg.steps) {
          if (step.instruction?.text) {
            steps.push({
              instruction: step.instruction.text,
              distance: step.distance || 0,
              time: step.time || 0,
            });
          }
        }
      }
    }
  }

  return {
    distanceMeters,
    timeSeconds,
    coordinates: convertedCoords,
    steps,
  };
}
