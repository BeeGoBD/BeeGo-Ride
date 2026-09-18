export interface LocationPoint {
  lat: number;
  lon: number;
  formatted: string;
  addressLine1?: string;
  addressLine2?: string;
  name?: string;
  street?: string;
  city?: string;
  country?: string;
  category?: string;
  resultType?: string;
  placeId?: string;
}

export interface RouteStep {
  instruction: string;
  distance: number; // in meters
  time: number; // in seconds
}

export interface RouteData {
  distanceMeters: number;
  timeSeconds: number;
  coordinates: [number, number][]; // [lat, lon] for Leaflet
  steps: RouteStep[];
}

export type UserRole = 'passenger' | 'rider';
export type RideStage = 'request' | 'navigation';

export type RideStatus =
  | 'idle'
  | 'requested'
  | 'accepted'
  | 'arrived_at_pickup'
  | 'in_transit'
  | 'completed'
  | 'declined'
  | 'cancelled';

export interface LiveTrackingData {
  riderLat: number;
  riderLon: number;
  heading: number; // degrees 0-360 for car orientation
  speedKmh: number; // current speed
  traveledKm: number; // distance rider has already traveled
  remainingKm: number; // distance remaining
  etaMinutes: number; // remaining minutes
  currentStepIndex: number;
  currentStepInstruction: string;
  coordIndex: number;
  totalCoords: number;
  stage: 'to_pickup' | 'at_pickup' | 'to_destination' | 'completed';
  updatedAt: number;
}

export interface RideRequest {
  id: string; // e.g. RIDE-8392
  passengerId: string; // e.g. PAX-4821
  riderId?: string; // e.g. RIDER-9302
  vehicleType?: 'bike' | 'car';
  pickup: LocationPoint;
  dropoff: LocationPoint;
  distanceKm: number; // estimated distance
  durationMinutes: number; // estimated duration
  fareTaka: number; // estimated fare: 1 km = 70 Taka
  actualTraveledKm?: number; // actual distance traveled counted by system
  finalFareTaka?: number; // fair calculation after finishing ride according to kilometers
  passengerLiveLocation?: {
    lat: number;
    lon: number;
    updatedAt: number;
  };
  status: RideStatus;
  createdAt: number;
  routeData?: RouteData;
  pickupRouteData?: RouteData; // route from rider to pickup
  liveTracking?: LiveTrackingData;
  driverDetails?: {
    name: string;
    vehicleType?: 'bike' | 'car';
    vehicleModel: string;
    plateNumber: string;
    rating: number;
    phone: string;
  };
}
