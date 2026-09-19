import { RideRequest, RideStatus, LocationPoint, RouteData, LiveTrackingData, PaymentMethod } from '../types';

export const RATE_PER_KM_TAKA = 70;
const STORAGE_KEY = 'geoapify_active_ride';
const CHANNEL_NAME = 'geoapify_ride_broadcast';
export const REAL_TRIP_HISTORY_KEY = 'beego_real_trip_history';
const LEGACY_TRIP_HISTORY_KEY = 'bigo_real_trip_history';

const DEFAULT_DRIVER = {
  name: 'Tanvir Hossain',
  vehicleType: 'bike' as const,
  vehicleModel: 'Yamaha FZ-S FI (Midnight Black) - Bike',
  plateNumber: 'DHAKA METRO-HA 52-8910',
  rating: 4.95,
  phone: '+880 1712-345678',
};

type RideListener = (ride: RideRequest | null) => void;
const listeners = new Set<RideListener>();

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      const updatedRide = event.data as RideRequest | null;
      notifyListeners(updatedRide);
    };
  } catch (e) {
    console.warn('BroadcastChannel not available, using storage events');
  }
}

// Storage event listener for cross-tab sync fallback
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      try {
        const parsed = e.newValue ? (JSON.parse(e.newValue) as RideRequest) : null;
        notifyListeners(parsed);
      } catch (err) {
        console.error('Error parsing storage ride update', err);
      }
    }
  });
}

function notifyListeners(ride: RideRequest | null) {
  listeners.forEach((listener) => {
    try {
      listener(ride);
    } catch (e) {
      console.error(e);
    }
  });
}

export function getStoredRide(): RideRequest | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RideRequest) : null;
  } catch {
    return null;
  }
}

export function saveAndBroadcastRide(ride: RideRequest | null) {
  if (typeof window !== 'undefined') {
    if (ride) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ride));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  if (broadcastChannel) {
    broadcastChannel.postMessage(ride);
  }

  notifyListeners(ride);
}

export function subscribeToRideUpdates(callback: RideListener): () => void {
  listeners.add(callback);
  // initial invoke with current state
  callback(getStoredRide());
  return () => {
    listeners.delete(callback);
  };
}

// ID generators
export function generatePassengerId(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PAX-${rand}`;
}

export function generateRiderId(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RIDER-${rand}`;
}

export function generateRideId(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RIDE-${rand}`;
}

export interface StoredRealTrip {
  id: string;
  date: string;
  time: string;
  timestamp: number;
  pickup: string;
  dropoff: string;
  distanceKm: number;
  fareTaka: number;
  vehicleType: 'bike' | 'car';
  tier: 'moto' | 'select' | 'sedan';
  tierName: string;
  ratePerKm: number;
  vehicleModel: string;
  plateNumber: string;
  driverName: string;
  driverRating: number;
  passengerId: string;
  paymentMethod: PaymentMethod;
  transactionRef: string;
  status: 'completed';
}

export function getRealTripHistory(): StoredRealTrip[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REAL_TRIP_HISTORY_KEY) || localStorage.getItem(LEGACY_TRIP_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRealTrip(trip: StoredRealTrip) {
  if (typeof window === 'undefined') return;
  try {
    const current = getRealTripHistory();
    const updated = [trip, ...current.filter((t) => t.id !== trip.id)];
    localStorage.setItem(REAL_TRIP_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save real trip history', e);
  }
}

/**
 * Passenger requests a new ride
 */
export function requestNewRide(
  passengerId: string,
  pickup: LocationPoint,
  dropoff: LocationPoint,
  routeData: RouteData,
  paymentMethod: PaymentMethod = 'cash'
): RideRequest {
  const distanceKm = Math.max(0.1, Number((routeData.distanceMeters / 1000).toFixed(1)));
  const durationMinutes = Math.max(1, Math.round(routeData.timeSeconds / 60));
  const fareTaka = Math.round(distanceKm * RATE_PER_KM_TAKA);

  const newRide: RideRequest = {
    id: generateRideId(),
    passengerId,
    vehicleType: 'bike',
    paymentMethod,
    pickup,
    dropoff,
    distanceKm,
    durationMinutes,
    fareTaka,
    status: 'requested',
    createdAt: Date.now(),
    routeData,
  };

  saveAndBroadcastRide(newRide);
  return newRide;
}

/**
 * Updates real-time passenger live coordinates so rider sees live movement
 */
export function updatePassengerLiveLocation(coords: { lat: number; lon: number }): void {
  const current = getStoredRide();
  if (!current) return;

  const updated: RideRequest = {
    ...current,
    passengerLiveLocation: {
      lat: coords.lat,
      lon: coords.lon,
      updatedAt: Date.now(),
    },
  };

  saveAndBroadcastRide(updated);
}

/**
 * Rider accepts the ride
 */
export function acceptRide(riderId: string, pickupRouteData?: RouteData): RideRequest | null {
  const current = getStoredRide();
  if (!current) return null;

  const updated: RideRequest = {
    ...current,
    riderId,
    status: 'accepted',
    pickupRouteData: pickupRouteData || current.pickupRouteData,
    driverDetails: current.driverDetails || DEFAULT_DRIVER,
  };

  saveAndBroadcastRide(updated);
  return updated;
}

/**
 * Real-time location & telemetry updates broadcast to passenger
 */
export function updateLiveTracking(tracking: LiveTrackingData): void {
  const current = getStoredRide();
  if (!current) return;

  const updated: RideRequest = {
    ...current,
    liveTracking: tracking,
  };

  saveAndBroadcastRide(updated);
}

/**
 * Rider arrives at the pickup spot
 */
export function arriveAtPickupSpot(): RideRequest | null {
  const current = getStoredRide();
  if (!current) return null;

  const updated: RideRequest = {
    ...current,
    status: 'arrived_at_pickup',
  };

  saveAndBroadcastRide(updated);
  return updated;
}

/**
 * Rider starts navigation from pickup to destination
 */
export function startTripToDestination(): RideRequest | null {
  const current = getStoredRide();
  if (!current) return null;

  const updated: RideRequest = {
    ...current,
    status: 'in_transit',
  };

  saveAndBroadcastRide(updated);
  return updated;
}

/**
 * Trip completes at destination with fair fare calculated by distance
 */
export function completeTrip(actualTraveledKm?: number): RideRequest | null {
  const current = getStoredRide();
  if (!current) return null;

  const traveled = actualTraveledKm && actualTraveledKm > 0
    ? Number(actualTraveledKm.toFixed(2))
    : current.distanceKm;

  // Fair calculation: ৳70 per kilometer
  const finalFare = Math.max(RATE_PER_KM_TAKA, Math.round(traveled * RATE_PER_KM_TAKA));

  const updated: RideRequest = {
    ...current,
    status: 'completed',
    actualTraveledKm: traveled,
    finalFareTaka: finalFare,
  };

  saveAndBroadcastRide(updated);

  // Save to Real Trip History (no mock data)
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });

  saveRealTrip({
    id: current.id,
    date: dateStr,
    time: timeStr,
    timestamp: Date.now(),
    pickup: current.pickup.formatted,
    dropoff: current.dropoff.formatted,
    distanceKm: traveled,
    fareTaka: finalFare,
    vehicleType: 'bike',
    tier: 'moto',
    tierName: 'Beego Moto',
    ratePerKm: RATE_PER_KM_TAKA,
    vehicleModel: current.driverDetails?.vehicleModel || DEFAULT_DRIVER.vehicleModel,
    plateNumber: current.driverDetails?.plateNumber || DEFAULT_DRIVER.plateNumber,
    driverName: current.driverDetails?.name || DEFAULT_DRIVER.name,
    driverRating: current.driverDetails?.rating || DEFAULT_DRIVER.rating,
    passengerId: current.passengerId,
    paymentMethod: current.paymentMethod || 'cash',
    transactionRef: `TXN-BD-${current.id.replace('RIDE-', '')}-${finalFare}`,
    status: 'completed',
  });

  return updated;
}

/**
 * Rider declines the request
 */
export function declineRide(): void {
  const current = getStoredRide();
  if (!current) return;

  const updated: RideRequest = {
    ...current,
    status: 'declined',
  };

  saveAndBroadcastRide(updated);
}

/**
 * Passenger cancels request
 */
export function cancelRide(): void {
  const current = getStoredRide();
  if (!current) return;

  const updated: RideRequest = {
    ...current,
    status: 'cancelled',
  };

  saveAndBroadcastRide(updated);
}

/**
 * Reset / Dismiss ride
 */
export function clearCurrentRide(): void {
  saveAndBroadcastRide(null);
}
