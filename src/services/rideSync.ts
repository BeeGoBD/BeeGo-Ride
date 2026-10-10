import { RideRequest, RideStatus, LocationPoint, RouteData, LiveTrackingData, PaymentMethod, ChatMessage } from '../types';
import { getCurrentDriver } from './driverAuth';
import { cloudRealtime } from './cloudRealtime';

export const RATE_PER_KM_TAKA = 25; // Flat ৳25/km guaranteed fair price
const STORAGE_KEY = 'geoapify_active_ride';
const CHANNEL_NAME = 'geoapify_ride_broadcast';
export const REAL_TRIP_HISTORY_KEY = 'beego_real_trip_history';
const LEGACY_TRIP_HISTORY_KEY = 'bigo_real_trip_history';

const DEFAULT_DRIVER = {
  name: 'Voltx Captain',
  vehicleType: 'bike' as const,
  vehicleModel: 'Voltx Eco Speed (Electric)',
  plateNumber: 'Dhaka Metro-Ha 45-8921',
  rating: 5.0,
  phone: '',
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
      const serverUpdated = (serverRide as any).updatedAt || serverRide.createdAt || 0;
      const localUpdated = (localRide as any)?.updatedAt || localRide?.createdAt || 0;
      const serverMsgs = serverRide.chatMessages?.length || 0;
      const localMsgs = localRide?.chatMessages?.length || 0;

      if (!localRide || localRide.id !== serverRide.id || localRide.status !== serverRide.status || serverUpdated > localUpdated || serverMsgs !== localMsgs) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serverRide));
        }
        notifyListeners(serverRide);
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
      const cloudUpdated = (cloudRide as any).updatedAt || cloudRide.createdAt || 0;
      const currentUpdated = (current as any)?.updatedAt || current?.createdAt || 0;
      if (!current || current.id !== cloudRide.id || current.status !== cloudRide.status || cloudUpdated > currentUpdated) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudRide));
        }
        notifyListeners(cloudRide);
      }
    } else if (current && ['completed', 'cancelled', 'declined'].includes(current.status)) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      notifyListeners(null);
    }
  });

  return () => {
    listeners.delete(callback);
    unsubCloud();
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
    driverId: ride.riderId || '',
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
    driverId: ride.riderId || '',
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

  const updated: RideRequest = {
    ...current,
    riderId,
    status: 'accepted',
    pickupRouteData: pickupRouteData || current.pickupRouteData,
    driverDetails: assignedDriver,
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

  saveAndBroadcastRide(updated);

  // Sync to server API periodically
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

  const updated: RideRequest = {
    ...current,
    status: 'arrived_at_pickup',
  };

  saveAndBroadcastRide(updated);

  fetch('/api/rides/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rideId: updated.id, status: 'arrived_at_pickup' }),
  }).catch(() => {});

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

  fetch('/api/rides/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rideId: updated.id, status: 'in_transit' }),
  }).catch(() => {});

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
