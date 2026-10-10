import { RideRequest, RideStatus, LocationPoint, RouteData, LiveTrackingData, PaymentMethod, ChatMessage } from '../types';
import { getCurrentDriver } from './driverAuth';
import { cloudRealtime } from './cloudRealtime';

export const RATE_PER_KM_TAKA = 25; // Flat ৳25/km guaranteed fair price
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

export const RIDE_STATUS_RANK: Record<string, number> = {
  requested: 1,
  accepted: 2,
  arrived_at_pickup: 3,
  in_transit: 4,
  completed: 5,
  cancelled: 6,
  declined: 6,
};

export function canTransitionStatus(
  currentStatus: RideStatus | string | undefined | null,
  incomingStatus: RideStatus | string | undefined | null
): boolean {
  if (!incomingStatus) return false;
  if (!currentStatus) return true;
  if (currentStatus === incomingStatus) return true;

  // Terminal states cannot be reverted by active states
  if (['completed', 'cancelled', 'declined'].includes(currentStatus)) {
    return false;
  }

  // Cancelled or declined can terminate any active ride
  if (incomingStatus === 'cancelled' || incomingStatus === 'declined') {
    return true;
  }

  const currentRank = RIDE_STATUS_RANK[currentStatus] || 0;
  const incomingRank = RIDE_STATUS_RANK[incomingStatus] || 0;

  // Prevent regressing backwards (e.g. arrived_at_pickup -> accepted is strictly forbidden)
  return incomingRank >= currentRank;
}

export function mergeRideUpdates(
  current: RideRequest | null,
  incoming: RideRequest | null
): RideRequest | null {
  if (!incoming) return current;
  if (!current) return incoming;
  if (current.id !== incoming.id) return incoming;

  const currentRank = RIDE_STATUS_RANK[current.status] || 0;
  const incomingRank = RIDE_STATUS_RANK[incoming.status] || 0;

  // If incoming has an older/regressed status, preserve current's advanced status
  if (!canTransitionStatus(current.status, incoming.status)) {
    return {
      ...incoming,
      status: current.status,
      updatedAt: Math.max(
        (current as any).updatedAt || 0,
        (incoming as any).updatedAt || 0,
        Date.now()
      ),
      chatMessages:
        (incoming.chatMessages?.length || 0) >= (current.chatMessages?.length || 0)
          ? incoming.chatMessages
          : current.chatMessages,
    };
  }

  // If status is strictly progressing forward, accept incoming
  if (incomingRank > currentRank) {
    return {
      ...incoming,
      updatedAt: Math.max((incoming as any).updatedAt || 0, Date.now()),
    };
  }

  // Same status rank: preserve most up-to-date fields
  const currentUpdated = (current as any).updatedAt || current.createdAt || 0;
  const incomingUpdated = (incoming as any).updatedAt || incoming.createdAt || 0;

  return {
    ...incoming,
    chatMessages:
      (incoming.chatMessages?.length || 0) >= (current.chatMessages?.length || 0)
        ? incoming.chatMessages
        : current.chatMessages,
    liveTracking: incoming.liveTracking || current.liveTracking,
    updatedAt: Math.max(currentUpdated, incomingUpdated),
  };
}

type RideListener = (ride: RideRequest | null) => void;
const listeners = new Set<RideListener>();

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      const updatedRide = event.data as RideRequest | null;
      const current = getStoredRide();
      const merged = mergeRideUpdates(current, updatedRide);
      if (merged) {
        notifyListeners(merged);
      } else if (!updatedRide && current && ['completed', 'cancelled', 'declined'].includes(current.status)) {
        notifyListeners(null);
      }
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
        const current = getStoredRide();
        if (parsed && current && current.id === parsed.id) {
          if (!canTransitionStatus(current.status, parsed.status)) {
            // Drop stale status from older storage write
            return;
          }
        }
        const merged = mergeRideUpdates(current, parsed);
        notifyListeners(merged);
      } catch (err) {
        console.error('Error parsing storage ride update', err);
      }
    }
  });
}

function notifyListeners(ride: RideRequest | null) {
  if (ride && typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ride));
    } catch {}
  }

  if (ride && ride.status === 'completed') {
    try {
      saveCompletedRideToHistory(ride);
    } catch (e) {
      console.warn('Error auto-saving completed ride to history:', e);
    }
  } else if (ride && ride.status === 'cancelled') {
    try {
      saveCancelledRideToHistory(ride, ride.cancellationReason);
    } catch (e) {
      console.warn('Error auto-saving cancelled ride to history:', e);
    }
  }

  listeners.forEach((listener) => {
    try {
      listener(ride);
    } catch (e) {
      console.error(e);
    }
  });
}

// Background sync with server API to ensure cross-device, cross-tab, cross-browser ride dispatch
let isSyncingWithServer = false;
async function syncActiveRideFromServer() {
  if (isSyncingWithServer || typeof window === 'undefined') return;
  isSyncingWithServer = true;
  try {
    const res = await fetch('/api/rides/active');
    if (!res.ok) return;
    const data = await res.json().catch(() => ({}));
    const serverRide: RideRequest | null = data.ride || null;
    const localRide = getStoredRide();

    // Check if server ride has updates
    if (serverRide) {
      if (localRide && localRide.id === serverRide.id) {
        // If local ride has already advanced to a higher stage (e.g. arrived_at_pickup),
        // do not regress to server's stale status!
        if (!canTransitionStatus(localRide.status, serverRide.status)) {
          // Re-affirm the advanced status to the server so server catches up
          fetch('/api/rides/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rideId: localRide.id, status: localRide.status }),
          }).catch(() => {});
          return;
        }
      }

      const merged = mergeRideUpdates(localRide, serverRide);
      if (merged) {
        const serverUpdated = (merged as any).updatedAt || merged.createdAt || 0;
        const localUpdated = (localRide as any)?.updatedAt || localRide?.createdAt || 0;
        const serverMsgs = merged.chatMessages?.length || 0;
        const localMsgs = localRide?.chatMessages?.length || 0;

        const hasChanged =
          !localRide ||
          localRide.id !== merged.id ||
          localRide.status !== merged.status ||
          serverUpdated > localUpdated ||
          serverMsgs !== localMsgs;

        if (hasChanged) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
          notifyListeners(merged);
        }
      }
    } else if (localRide && (localRide as any)._syncedToBackend) {
      // Server has cleared or finished this ride
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      notifyListeners(null);
    } else if (localRide && localRide.status === 'requested') {
      // Initial sync of locally requested ride to server
      (localRide as any)._syncedToBackend = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localRide));
      }
      fetch('/api/rides/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localRide),
      }).catch(() => {});
    } else if (localRide && ['completed', 'cancelled', 'declined'].includes(localRide.status)) {
      // Completed or cancelled ride cleared after 15 seconds
      const ageMs = Date.now() - ((localRide as any).updatedAt || localRide.createdAt || 0);
      if (ageMs > 15000) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }
        notifyListeners(null);
      }
    }
  } catch (err) {
    // Network delay or offline
  } finally {
    isSyncingWithServer = false;
  }
}

// Start polling interval
if (typeof window !== 'undefined') {
  setInterval(syncActiveRideFromServer, 1200);
  // Also run on window focus
  window.addEventListener('focus', syncActiveRideFromServer);
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
    try {
      broadcastChannel.postMessage(ride);
    } catch {}
  }

  // Realtime Cloud Broadcast (Cross-device, mobile 4G/WiFi, GitHub Pages)
  cloudRealtime.publishRide(ride);

  notifyListeners(ride);
}

export function subscribeToRideUpdates(callback: RideListener): () => void {
  listeners.add(callback);
  // initial invoke with current state
  callback(getStoredRide());
  // immediately trigger server sync
  syncActiveRideFromServer();

  // Cloud Realtime Subscription (Cross-device across static hosts & mobile networks)
  const unsubCloud = cloudRealtime.subscribeRide((cloudRide) => {
    const current = getStoredRide();
    if (cloudRide) {
      if (current && current.id === cloudRide.id) {
        // Strictly prevent regression from older cloud messages
        if (!canTransitionStatus(current.status, cloudRide.status)) {
          return;
        }
      }
      const merged = mergeRideUpdates(current, cloudRide);
      if (merged) {
        const hasChanged =
          !current ||
          current.id !== merged.id ||
          current.status !== merged.status ||
          (merged as any).updatedAt !== (current as any)?.updatedAt;
        if (hasChanged) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
          notifyListeners(merged);
        }
      }
    } else if (current && ['completed', 'cancelled', 'declined'].includes(current.status)) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      notifyListeners(null);
    }
  });

  // Dedicated Realtime Telemetry Subscription
  const unsubTracking = cloudRealtime.subscribeTracking(({ rideId, tracking }) => {
    const current = getStoredRide();
    if (current && current.id === rideId) {
      const updated: RideRequest = {
        ...current,
        liveTracking: tracking,
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      listeners.forEach((l) => {
        try {
          l(updated);
        } catch (e) {}
      });
    }
  });

  return () => {
    listeners.delete(callback);
    unsubCloud();
    unsubTracking();
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
  pickupCoords?: { lat: number; lon: number };
  dropoffCoords?: { lat: number; lon: number };
  distanceKm: number;
  actualTraveledKm?: number;
  fareTaka: number;
  finalFareTaka?: number;
  riderEarningsTaka?: number;
  vehicleType: 'bike' | 'car';
  tier: 'moto' | 'select' | 'sedan';
  tierName: string;
  ratePerKm: number;
  vehicleModel: string;
  plateNumber: string;
  driverId?: string;
  driverName: string;
  driverRating: number;
  driverPhone?: string;
  passengerId: string;
  passengerName?: string;
  passengerPhone?: string;
  paymentMethod: PaymentMethod;
  transactionRef: string;
  status: 'completed' | 'cancelled';
  cancellationReason?: string;
  tipTaka?: number;
  completedAt?: number;
  durationMinutes?: number;
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
    localStorage.setItem('beego_passenger_activity_history', JSON.stringify(updated));
    localStorage.setItem('beego_driver_activity_history', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('beego:trip_history_updated', { detail: trip }));
  } catch (e) {
    console.error('Failed to save real trip history', e);
  }
}

/**
 * Automatically converts a completed ride into a history trip and saves it
 * for both passenger and driver across devices.
 */
export function saveCompletedRideToHistory(ride: RideRequest): StoredRealTrip | null {
  if (!ride || !ride.id) return null;

  const now = new Date(ride.updatedAt || Date.now());
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  const traveled = ride.actualTraveledKm && ride.actualTraveledKm > 0
    ? Number(ride.actualTraveledKm.toFixed(2))
    : ride.distanceKm || 1;
  const finalFare = ride.finalFareTaka || ride.fareTaka || Math.max(RATE_PER_KM_TAKA, Math.round(traveled * RATE_PER_KM_TAKA));
  const driverEarnings = Math.round(finalFare * 0.85);

  const tripRecord: StoredRealTrip = {
    id: ride.id,
    date: dateStr,
    time: timeStr,
    timestamp: now.getTime(),
    pickup: ride.pickup?.formatted || ride.pickup?.addressLine1 || 'Pickup Spot',
    dropoff: ride.dropoff?.formatted || ride.dropoff?.addressLine1 || 'Destination',
    pickupCoords: ride.pickup ? { lat: ride.pickup.lat, lon: ride.pickup.lon } : undefined,
    dropoffCoords: ride.dropoff ? { lat: ride.dropoff.lat, lon: ride.dropoff.lon } : undefined,
    distanceKm: traveled,
    actualTraveledKm: traveled,
    fareTaka: finalFare,
    finalFareTaka: finalFare,
    riderEarningsTaka: driverEarnings,
    vehicleType: ride.vehicleType || 'bike',
    tier: 'moto',
    tierName: 'BeeGo Moto',
    ratePerKm: RATE_PER_KM_TAKA,
    vehicleModel: ride.driverDetails?.vehicleModel || DEFAULT_DRIVER.vehicleModel,
    plateNumber: ride.driverDetails?.plateNumber || DEFAULT_DRIVER.plateNumber,
    driverId: ride.riderId || 'DRV-9073',
    driverName: ride.driverDetails?.name || DEFAULT_DRIVER.name,
    driverRating: ride.driverDetails?.rating || DEFAULT_DRIVER.rating,
    driverPhone: ride.driverDetails?.phone,
    passengerId: ride.passengerId,
    passengerName: ride.passengerName || 'Passenger',
    passengerPhone: ride.passengerPhone,
    paymentMethod: ride.paymentMethod || 'cash',
    transactionRef: `TXN-BD-${ride.id.replace('RIDE-', '')}-${finalFare}`,
    status: 'completed',
    completedAt: now.getTime(),
    durationMinutes: ride.durationMinutes,
  };

  saveRealTrip(tripRecord);

  // Sync to server history endpoint
  fetch('/api/rides/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tripRecord),
  }).catch(() => {});

  return tripRecord;
}

/**
 * Saves a cancelled ride into history so passengers & drivers can audit past cancellations
 */
export function saveCancelledRideToHistory(ride: RideRequest, reason?: string): StoredRealTrip | null {
  if (!ride || !ride.id) return null;

  const now = new Date(ride.updatedAt || Date.now());
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  const cancelReason = reason || ride.cancellationReason || 'Cancelled by passenger';

  const tripRecord: StoredRealTrip = {
    id: ride.id,
    date: dateStr,
    time: timeStr,
    timestamp: now.getTime(),
    pickup: ride.pickup?.formatted || ride.pickup?.addressLine1 || 'Pickup Spot',
    dropoff: ride.dropoff?.formatted || ride.dropoff?.addressLine1 || 'Destination',
    pickupCoords: ride.pickup ? { lat: ride.pickup.lat, lon: ride.pickup.lon } : undefined,
    dropoffCoords: ride.dropoff ? { lat: ride.dropoff.lat, lon: ride.dropoff.lon } : undefined,
    distanceKm: ride.distanceKm || 1,
    actualTraveledKm: 0,
    fareTaka: 0,
    finalFareTaka: 0,
    riderEarningsTaka: 0,
    tipTaka: 0,
    vehicleType: ride.vehicleType || 'bike',
    tier: 'moto',
    tierName: 'BeeGo Moto',
    ratePerKm: RATE_PER_KM_TAKA,
    vehicleModel: ride.driverDetails?.vehicleModel || DEFAULT_DRIVER.vehicleModel,
    plateNumber: ride.driverDetails?.plateNumber || DEFAULT_DRIVER.plateNumber,
    driverId: ride.riderId || 'DRV-9073',
    driverName: ride.driverDetails?.name || DEFAULT_DRIVER.name,
    driverRating: ride.driverDetails?.rating || DEFAULT_DRIVER.rating,
    driverPhone: ride.driverDetails?.phone,
    passengerId: ride.passengerId,
    passengerName: ride.passengerName || 'Passenger',
    passengerPhone: ride.passengerPhone,
    paymentMethod: ride.paymentMethod || 'cash',
    transactionRef: `CANCELLED-${ride.id.replace('RIDE-', '')}`,
    status: 'cancelled',
    cancellationReason: cancelReason,
    completedAt: now.getTime(),
    durationMinutes: 0,
  };

  saveRealTrip(tripRecord);

  // Sync to server history endpoint
  fetch('/api/rides/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tripRecord),
  }).catch(() => {});

  return tripRecord;
}

/**
 * Fetches trip history from backend server and merges with local storage
 * to guarantee passenger and driver both have full history across devices.
 */
export async function fetchAndSyncTripHistory(): Promise<StoredRealTrip[]> {
  const localTrips = getRealTripHistory();
  if (typeof window === 'undefined') return localTrips;

  try {
    const res = await fetch('/api/rides/history');
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const serverTrips: StoredRealTrip[] = Array.isArray(data?.trips) ? data.trips : [];
      if (serverTrips.length > 0) {
        const tripMap = new Map<string, StoredRealTrip>();
        localTrips.forEach((t) => tripMap.set(t.id, t));
        serverTrips.forEach((t) => tripMap.set(t.id, { ...tripMap.get(t.id), ...t }));
        const merged = Array.from(tripMap.values()).sort(
          (a, b) => (b.timestamp || b.completedAt || 0) - (a.timestamp || a.completedAt || 0)
        );
        localStorage.setItem(REAL_TRIP_HISTORY_KEY, JSON.stringify(merged));
        localStorage.setItem('beego_passenger_activity_history', JSON.stringify(merged));
        localStorage.setItem('beego_driver_activity_history', JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('beego:trip_history_updated', { detail: merged[0] }));
        return merged;
      }
    }
  } catch (err) {
    // Offline or server unreachable
  }
  return localTrips;
}

/**
 * Passenger requests a new ride
 */
export function requestNewRide(
  passengerId: string,
  pickup: LocationPoint,
  dropoff: LocationPoint,
  routeData: RouteData,
  paymentMethod: PaymentMethod = 'cash',
  passengerPhone?: string
): RideRequest {
  const distanceKm = Math.max(0.1, Number((routeData.distanceMeters / 1000).toFixed(1)));
  const durationMinutes = Math.max(1, Math.round(routeData.timeSeconds / 60));
  const fareTaka = Math.round(distanceKm * RATE_PER_KM_TAKA);

  const newRide: RideRequest = {
    id: generateRideId(),
    passengerId,
    passengerPhone,
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
  (newRide as any)._syncedToBackend = true;

  saveAndBroadcastRide(newRide);

  // Sync to server API
  fetch('/api/rides/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newRide),
  }).catch((err) => console.warn('[Rides Sync] Backend request error:', err));

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
export function acceptRide(
  riderId: string,
  pickupRouteData?: RouteData,
  customDriverDetails?: {
    name: string;
    vehicleModel: string;
    plateNumber: string;
    rating: number;
    phone: string;
  }
): RideRequest | null {
  const current = getStoredRide();
  if (!current) return null;

  const activeDriver = getCurrentDriver();
  const assignedDriver =
    customDriverDetails ||
    (activeDriver
      ? {
          name: activeDriver.name || 'Voltx Captain',
          vehicleModel: activeDriver.vehicleModel || 'Voltx Eco Speed (Electric)',
          plateNumber: activeDriver.plateNumber || 'Dhaka Metro-Ha 45-8921',
          rating: activeDriver.rating || 4.96,
          phone: activeDriver.phone || '+880 1712-345678',
        }
      : current.driverDetails || DEFAULT_DRIVER);

  const now = Date.now();
  const updated: RideRequest = {
    ...current,
    riderId,
    status: 'accepted',
    pickupRouteData: pickupRouteData || current.pickupRouteData,
    driverDetails: assignedDriver,
    updatedAt: now,
  };

  saveAndBroadcastRide(updated);

  // Sync to server API
  fetch('/api/rides/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rideId: updated.id,
      riderId,
      driverDetails: assignedDriver,
      pickupRouteData,
    }),
  }).catch((err) => console.warn('[Rides Sync] Backend accept error:', err));

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

  // 1. Update localStorage without touching status or triggering global ride recreation
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  // 2. Broadcast through BroadcastChannel if active
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(updated);
    } catch {}
  }

  // 3. Publish to dedicated real-time telemetry channel (DO NOT publish full ride with retain on TOPIC_ACTIVE_RIDE)
  cloudRealtime.publishTracking(current.id, tracking);

  // 4. Notify active listeners so vehicle marker moves smoothly on map
  listeners.forEach((listener) => {
    try {
      listener(updated);
    } catch (e) {}
  });

  // 5. Throttled server tracking sync
  fetch('/api/rides/tracking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rideId: current.id,
      liveTracking: tracking,
    }),
  }).catch(() => {});
}

/**
 * Rider arrives at the pickup spot
 */
export function arriveAtPickupSpot(): RideRequest | null {
  const current = getStoredRide();
  if (!current) return null;

  const now = Date.now();
  const updated: RideRequest = {
    ...current,
    status: 'arrived_at_pickup',
    updatedAt: now,
  };

  saveAndBroadcastRide(updated);

  // Sync to server API with response acknowledgement
  fetch('/api/rides/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rideId: updated.id, status: 'arrived_at_pickup' }),
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data?.ride) {
        const cur = getStoredRide();
        const merged = mergeRideUpdates(cur, data.ride);
        if (merged && merged.status !== cur?.status) {
          saveAndBroadcastRide(merged);
        }
      }
    })
    .catch((err) => console.warn('[Rides Sync] Status update network error:', err));

  return updated;
}

/**
 * Rider starts navigation from pickup to destination
 */
export function startTripToDestination(): RideRequest | null {
  const current = getStoredRide();
  if (!current) return null;

  const now = Date.now();
  const updated: RideRequest = {
    ...current,
    status: 'in_transit',
    updatedAt: now,
  };

  saveAndBroadcastRide(updated);

  fetch('/api/rides/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rideId: updated.id, status: 'in_transit' }),
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data?.ride) {
        const cur = getStoredRide();
        const merged = mergeRideUpdates(cur, data.ride);
        if (merged && merged.status !== cur?.status) {
          saveAndBroadcastRide(merged);
        }
      }
    })
    .catch((err) => console.warn('[Rides Sync] Start trip status error:', err));

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
    updatedAt: Date.now(),
  };

  saveAndBroadcastRide(updated);

  fetch('/api/rides/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rideId: updated.id,
      status: 'completed',
      actualTraveledKm: traveled,
      finalFareTaka: finalFare,
    }),
  }).catch(() => {});

  // Save to Real Trip History and sync across devices & server
  saveCompletedRideToHistory(updated);

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

  fetch('/api/rides/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rideId: updated.id, status: 'declined' }),
  }).catch(() => {});
}

/**
 * Passenger cancels request with optional reason
 */
export function cancelRide(reason?: string): void {
  const current = getStoredRide();
  if (!current) return;

  const cancelReason = reason || 'Cancelled by passenger';
  const updated: RideRequest = {
    ...current,
    status: 'cancelled',
    cancellationReason: cancelReason,
    updatedAt: Date.now(),
  };

  try {
    saveCancelledRideToHistory(updated, cancelReason);
  } catch (e) {
    console.warn('Error saving cancelled ride in cancelRide:', e);
  }

  saveAndBroadcastRide(updated);

  fetch('/api/rides/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rideId: updated.id,
      status: 'cancelled',
      cancellationReason: cancelReason,
    }),
  }).catch(() => {});
}

/**
 * Reset / Dismiss ride
 */
export function clearCurrentRide(): void {
  const current = getStoredRide();
  if (current) {
    if (current.status === 'completed') {
      try {
        saveCompletedRideToHistory(current);
      } catch {}
    }
    fetch('/api/rides/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rideId: current.id }),
    }).catch(() => {});
  }
  saveAndBroadcastRide(null);
}

/**
 * Send in-ride synchronized chat message between passenger and driver
 */
export function sendInRideChatMessage(
  sender: 'passenger' | 'rider',
  senderName: string,
  text: string
): RideRequest | null {
  const current = getStoredRide();
  if (!current) return null;

  const newMessage: ChatMessage = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    sender,
    senderName,
    text: text.trim(),
    timestamp: Date.now(),
  };

  const currentMessages = current.chatMessages || [];
  const updated: RideRequest = {
    ...current,
    chatMessages: [...currentMessages, newMessage],
  };

  saveAndBroadcastRide(updated);

  fetch('/api/rides/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rideId: current.id,
      sender,
      senderName,
      text: text.trim(),
    }),
  }).catch(() => {});

  return updated;
}
