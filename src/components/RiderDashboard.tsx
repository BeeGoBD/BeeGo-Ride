import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  CheckCircle2,
  XCircle,
  Banknote,
  Compass,
  ArrowRight,
  Radio,
  LocateFixed,
  Loader2,
  Check,
  Bike,
  ShieldCheck,
  BatteryCharging,
  Zap,
  TrendingUp,
  Clock,
  Layers,
  ChevronRight,
  Power,
  Phone,
} from 'lucide-react';
import { LocationPoint, RideRequest, RouteData, DriverProfile, DriverVerificationStatus } from '../types';
import {
  acceptRide,
  arriveAtPickupSpot,
  startTripToDestination,
  completeTrip,
  declineRide,
  clearCurrentRide,
  RATE_PER_KM_TAKA,
} from '../services/rideSync';
import { calculateRoute, reverseGeocode, DEFAULT_GEOAPIFY_KEY } from '../services/geoapify';
import { requestLiveCoordinates, watchLiveCoordinates } from '../services/geolocation';
import { getCurrentDriver, updateDriverStatus } from '../services/driverAuth';

interface RiderDashboardProps {
  riderId: string;
  activeRide: RideRequest | null;
  apiKey: string;
  onBackToRoles: () => void;
  onSwitchToPassenger: () => void;
  onOpenMyTrips?: () => void;
  onOpenPowerStations?: () => void;
  hideHeader?: boolean;
}

export const RiderDashboard: React.FC<RiderDashboardProps> = ({
  riderId,
  activeRide,
  apiKey,
  onBackToRoles,
  onSwitchToPassenger,
  onOpenMyTrips,
  onOpenPowerStations,
  hideHeader = false,
}) => {
  const activeKey = apiKey.trim() || DEFAULT_GEOAPIFY_KEY;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Driver profile & verification status
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(() => getCurrentDriver());
  const isUnderReview =
    !driverProfile ||
    driverProfile.verificationStatus === 'under_review' ||
    driverProfile.verificationStatus === 'pending';

  // Big Yellow Switch: Online / Offline (locked if under review)
  const [isOnline, setIsOnline] = useState<boolean>(() => !isUnderReview);

  // Toggle simulation for testing admin approval
  const handleToggleAdminStatus = () => {
    if (!driverProfile) return;
    const nextStatus: DriverVerificationStatus =
      driverProfile.verificationStatus === 'approved' ? 'under_review' : 'approved';
    const updated = updateDriverStatus(driverProfile.id, nextStatus);
    if (updated) {
      setDriverProfile({ ...updated });
      if (nextStatus === 'approved') {
        setIsOnline(true);
        setActionError(null);
      } else {
        setIsOnline(false);
      }
    }
  };

  // Rider Live GPS state
  const [riderLiveGps, setRiderLiveGps] = useState<{
    lat: number;
    lon: number;
    accuracy?: number;
  } | null>(null);
  const [riderAddress, setRiderAddress] = useState<string>('Gulshan 2 Circle, Dhaka');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationPrompted, setLocationPrompted] = useState<boolean>(false);

  const [isAccepting, setIsAccepting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Nearby Power Stations Data
  const nearbyStations = [
    {
      id: 'st-1',
      name: 'Voltx Hub — Gulshan 2',
      address: 'Road 90, Near Circle',
      distance: '0.6 km',
      batteryLevel: '94%',
      availableBatteries: 6,
      status: 'Fast Swap Ready',
    },
    {
      id: 'st-2',
      name: 'Voltx Hub — Banani 11',
      address: 'Block D, Near Metro Station',
      distance: '1.8 km',
      batteryLevel: '88%',
      availableBatteries: 4,
      status: 'Open 24/7',
    },
    {
      id: 'st-3',
      name: 'Voltx Hub — Dhanmondi 27',
      address: 'Satmasjid Road',
      distance: '4.2 km',
      batteryLevel: '100%',
      availableBatteries: 8,
      status: 'High Stock',
    },
  ];

  // 1. Automatically request live coordinates on mount
  useEffect(() => {
    let isMounted = true;

    const acquireRiderGps = async () => {
      setIsLocating(true);
      try {
        const coords = await requestLiveCoordinates();
        if (!isMounted) return;
        setRiderLiveGps({ lat: coords.lat, lon: coords.lon, accuracy: coords.accuracy });

        const point = await reverseGeocode(coords.lat, coords.lon, activeKey);
        if (!isMounted) return;
        setRiderAddress(point.formatted);
      } catch (err: any) {
        console.warn('Rider GPS detection notice:', err);
        if (isMounted) setRiderAddress('Gulshan 2 Circle, Dhaka');
      } finally {
        if (isMounted) setIsLocating(false);
      }
    };

    if (!locationPrompted) {
      setLocationPrompted(true);
      acquireRiderGps();
    }

    const unwatch = watchLiveCoordinates((coords) => {
      if (!isMounted) return;
      setRiderLiveGps({ lat: coords.lat, lon: coords.lon, accuracy: coords.accuracy });
    });

    return () => {
      isMounted = false;
      unwatch();
    };
  }, [locationPrompted, activeKey]);

  // Re-acquire GPS manually
  const handleRecenterGps = async () => {
    setIsLocating(true);
    setActionError(null);
    try {
      const coords = await requestLiveCoordinates();
      setRiderLiveGps({ lat: coords.lat, lon: coords.lon, accuracy: coords.accuracy });

      const point = await reverseGeocode(coords.lat, coords.lon, activeKey);
      setRiderAddress(point.formatted);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([coords.lat, coords.lon], 16, { duration: 1 });
      }
    } catch (err: any) {
      setActionError(err.message || 'Could not refresh device GPS.');
    } finally {
      setIsLocating(false);
    }
  };

  // 2. Initialize and maintain Leaflet Map on Rider Dashboard
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = riderLiveGps?.lat || activeRide?.pickup.lat || 23.7925;
      const initialLon = riderLiveGps?.lon || activeRide?.pickup.lon || 90.4078;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLon],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    // Refresh map sizing
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
  }, []);

  // Update Markers and Route on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    // Custom yellow rider icon
    const riderIcon = L.divIcon({
      html: `
        <div style="background-color: #F5C518; border: 2.5px solid #000; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(245, 197, 24, 0.5);">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18.5" cy="17.5" r="3.5"/>
            <circle cx="5.5" cy="17.5" r="3.5"/>
            <circle cx="15" cy="5" r="1"/>
            <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
          </svg>
        </div>
      `,
      className: 'rider-custom-pin',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const riderPos: [number, number] = riderLiveGps
      ? [riderLiveGps.lat, riderLiveGps.lon]
      : [23.7925, 90.4078];

    L.marker(riderPos, { icon: riderIcon }).addTo(markersLayer);

    // If incoming request or active ride, plot pickup and dropoff
    if (activeRide && (activeRide.status === 'requested' || activeRide.status === 'accepted' || activeRide.status === 'in_transit')) {
      const pickupIcon = L.divIcon({
        html: `
          <div style="background-color: #10B981; border: 2px solid #FFFFFF; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#10B981"/></svg>
          </div>
        `,
        className: 'pickup-pin',
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });

      const dropoffIcon = L.divIcon({
        html: `
          <div style="background-color: #1A1A1A; border: 2px solid #F5C518; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5C518" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          </div>
        `,
        className: 'dropoff-pin',
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });

      L.marker([activeRide.pickup.lat, activeRide.pickup.lon], { icon: pickupIcon }).addTo(markersLayer);
      L.marker([activeRide.dropoff.lat, activeRide.dropoff.lon], { icon: dropoffIcon }).addTo(markersLayer);

      // Draw polyline if routeData exists
      if (activeRide.routeData && activeRide.routeData.coordinates.length > 0) {
        const poly = L.polyline(activeRide.routeData.coordinates, {
          color: '#E6A800',
          weight: 4,
          opacity: 0.9,
          lineJoin: 'round',
        }).addTo(map);

        routeLayerRef.current = poly;
        map.fitBounds(poly.getBounds(), { padding: [30, 30] });
      }
    }
  }, [riderLiveGps, activeRide]);

  // Handle Accept incoming ride request
  const handleAccept = async () => {
    if (isUnderReview) {
      setActionError('Verification in Progress: You cannot accept rides until your account is approved by admin.');
      return;
    }

    if (!activeRide) return;
    setIsAccepting(true);
    setActionError(null);

    try {
      const riderLat = riderLiveGps?.lat || 23.7925;
      const riderLon = riderLiveGps?.lon || 90.4078;
      const pickupLat = activeRide.pickup.lat;
      const pickupLon = activeRide.pickup.lon;

      const pickupRoute = await calculateRoute(
        { lat: riderLat, lon: riderLon, formatted: riderAddress },
        { lat: pickupLat, lon: pickupLon, formatted: activeRide.pickup.formatted },
        activeKey
      );

      acceptRide(riderId, pickupRoute);
    } catch (err: any) {
      console.warn('Accept ride routing calculation warning:', err);
      acceptRide(riderId);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    declineRide();
  };

  const hasIncomingRequest = isOnline && activeRide && activeRide.status === 'requested';

  return (
    <div
      id="rider-dashboard-view"
      className="w-full flex-1 flex flex-col justify-start overflow-y-auto no-scrollbar select-none bg-[#F8F9FA] text-[#1A1A1A] pb-24"
    >
      {/* PERSISTENT VERIFICATION BANNER / STATUS CARD (Required Specification) */}
      {isUnderReview && (
        <div
          id="driver-verification-status-banner"
          className="mx-4 mt-3 p-4 rounded-3xl bg-gradient-to-r from-amber-50 to-yellow-50/90 border-2 border-amber-300 shadow-md flex flex-col gap-2.5 animate-in fade-in"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#F5C518] text-black flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-amber-950">Driver Verification</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/90 text-amber-900 border border-amber-300">
                    Pending / Processing
                  </span>
                </div>
                <span className="text-[10px] text-amber-800 font-medium block mt-0.5">
                  Account Status: <strong className="font-bold">Under Review</strong>
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-amber-900 font-semibold leading-relaxed bg-white/70 p-2.5 rounded-2xl border border-amber-200/80">
            “Your driver verification is still in processing. Please wait. Review usually takes 1–24 hours.”
          </p>

          <div className="flex items-center justify-between text-[11px] text-amber-800/90 pt-0.5 px-0.5">
            <span>Documents: NID Front, NID Back & Selfie submitted</span>
            <span className="font-mono font-bold text-[10px]">Review Active</span>
          </div>
        </div>
      )}

      {/* 1. ONLINE / OFFLINE BIG YELLOW TOGGLE SWITCH */}
      <div className="p-4 bg-white border-b border-zinc-200 shrink-0">
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8F9FA] border border-zinc-200">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                isOnline
                  ? 'bg-[#F5C518] text-black shadow-md shadow-amber-400/25'
                  : 'bg-zinc-200 text-zinc-500'
              }`}
            >
              <Power className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#1A1A1A]">
                  {isUnderReview
                    ? 'Offline (Verification Pending)'
                    : isOnline
                    ? 'You are Online'
                    : 'You are Offline'}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                  }`}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isUnderReview
                  ? 'Locked: Approval required before accepting rides'
                  : isOnline
                  ? 'Accepting rides & battery swap requests'
                  : 'Go online to start receiving trip requests'}
              </p>
            </div>
          </div>

          {/* Big Yellow Switch Toggle */}
          <button
            type="button"
            id="rider-online-toggle-switch"
            onClick={() => {
              if (isUnderReview) {
                setActionError(
                  'Your driver verification is still in processing. Please wait. Review usually takes 1–24 hours.'
                );
                return;
              }
              setIsOnline(!isOnline);
            }}
            className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shadow-inner ${
              isOnline ? 'bg-[#F5C518]' : 'bg-zinc-300'
            } ${isUnderReview ? 'opacity-60 cursor-not-allowed' : ''}`}
            title={
              isUnderReview
                ? 'Your verification is in processing. Review takes 1-24 hours.'
                : 'Toggle Online Status'
            }
          >
            <div
              className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center text-[10px] font-bold ${
                isOnline ? 'translate-x-6 text-[#E6A800]' : 'translate-x-0 text-zinc-400'
              }`}
            >
              {isOnline ? 'ON' : 'OFF'}
            </div>
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Error notification */}
        {actionError && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {actionError}
          </div>
        )}

        {/* 2. INCOMING TRIP REQUEST CARD (Highest Priority when active) */}
        {hasIncomingRequest && (
          <div
            id="incoming-ride-request-card"
            className="p-4 rounded-3xl bg-white border-2 border-[#F5C518] shadow-xl shadow-amber-500/10 flex flex-col gap-3 animate-in fade-in"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <span className="text-[10px] uppercase font-bold tracking-wider text-black bg-[#F5C518] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                New Trip Request
              </span>
              <span className="text-xs font-mono font-bold text-zinc-500">
                {activeRide.passengerId}
              </span>
            </div>

            {/* Fare and Distance */}
            <div className="p-3 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#E6A800] block">
                  Trip Earnings
                </span>
                <span className="text-2xl font-black text-[#1A1A1A] flex items-center gap-1">
                  <Banknote className="w-5 h-5 text-[#E6A800]" />
                  <span>৳{activeRide.fareTaka}</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-500 block">Distance</span>
                <span className="text-sm font-black text-[#1A1A1A]">
                  {activeRide.distanceKm} km
                </span>
              </div>
            </div>

            {/* Locations */}
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#F8F9FA] border border-zinc-200">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block">Pickup</span>
                  <span className="font-bold text-[#1A1A1A] block truncate">
                    {activeRide.pickup.addressLine1 || activeRide.pickup.formatted.split(',')[0]}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#F8F9FA] border border-zinc-200">
                <div className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Navigation className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block">Drop-off</span>
                  <span className="font-bold text-[#1A1A1A] block truncate">
                    {activeRide.dropoff.addressLine1 || activeRide.dropoff.formatted.split(',')[0]}
                  </span>
                </div>
              </div>
            </div>

            {/* Passenger Contact Phone Details (Client Phone) */}
            {activeRide.passengerPhone && (
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold">
                    <Phone className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold block">Client Phone</span>
                    <span className="font-mono font-black text-black">{activeRide.passengerPhone}</span>
                  </div>
                </div>
                <a
                  href={`tel:${activeRide.passengerPhone}`}
                  className="px-3 py-1.5 bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 active:scale-95"
                >
                  <Phone className="w-3 h-3 fill-black" />
                  <span>Call Client</span>
                </a>
              </div>
            )}

            {/* Action Buttons: Accept / Reject */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                id="decline-ride-btn"
                onClick={handleDecline}
                className="py-3 px-4 rounded-2xl font-bold text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <XCircle className="w-4 h-4 text-zinc-500" />
                <span>Decline</span>
              </button>

              <button
                type="button"
                id="accept-ride-btn"
                onClick={handleAccept}
                disabled={isAccepting}
                className="py-3 px-4 rounded-2xl font-black text-xs bg-[#F5C518] hover:bg-[#E6A800] text-black shadow-lg shadow-amber-400/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Accepting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-black" />
                    <span>Accept Ride</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 3. TODAY'S EARNINGS SUMMARY CARD */}
        <div className="p-4 rounded-3xl bg-white border border-zinc-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FFF9E6] border border-[#F5C518]/30 flex items-center justify-center text-[#E6A800]">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-black text-[#1A1A1A]">Today's Performance</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-[#FFF9E6] text-[#E6A800] px-2 py-0.5 rounded-full border border-[#F5C518]/30">
              Active Tier: ৳70/km
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-[#F8F9FA] border border-zinc-200/80">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Earnings</span>
              <span className="text-base font-black text-[#1A1A1A] mt-0.5 block">৳1,480</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-[#F8F9FA] border border-zinc-200/80">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Trips Done</span>
              <span className="text-base font-black text-[#1A1A1A] mt-0.5 block">8</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-[#F8F9FA] border border-zinc-200/80">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Online Time</span>
              <span className="text-base font-black text-[#1A1A1A] mt-0.5 block">5.4 hrs</span>
            </div>
          </div>

          {/* Quick breakdown: Trips & Battery Swaps */}
          <div className="flex items-center justify-between px-1 text-xs text-zinc-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5 text-[#E6A800]" />
              <span>8 Passenger Trips</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#E6A800]" />
              <span>3 Battery Swaps</span>
            </span>
          </div>
        </div>

        {/* 4. LIVE GPS RADAR & MAP (Collapsible / Expandable) */}
        <div className="rounded-3xl bg-white border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3.5 flex items-center justify-between border-b border-zinc-100">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-[#FFF9E6] border border-[#F5C518]/30 flex items-center justify-center text-[#E6A800] shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-mono font-bold text-[#E6A800] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live GPS • Dhaka Hub
                </div>
                <div className="text-xs font-bold text-[#1A1A1A] truncate">
                  {riderAddress}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleRecenterGps}
                title="Recenter GPS"
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 cursor-pointer"
              >
                <LocateFixed className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsMapExpanded(!isMapExpanded)}
                className="text-xs font-bold text-[#E6A800] px-2 py-1 rounded-lg bg-[#FFF9E6] hover:bg-[#F5C518] hover:text-black transition-colors cursor-pointer"
              >
                {isMapExpanded ? 'Collapse' : 'Expand'}
              </button>
            </div>
          </div>

          {/* Leaflet Map Frame */}
          <div
            className={`w-full transition-all duration-300 relative ${
              isMapExpanded ? 'h-72' : 'h-44'
            }`}
          >
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>
        </div>

        {/* 5. NEARBY POWER STATIONS LIST */}
        <div className="p-4 rounded-3xl bg-white border border-zinc-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FFF9E6] border border-[#F5C518]/30 flex items-center justify-center text-[#E6A800]">
                <Zap className="w-4 h-4 fill-[#F5C518]" />
              </div>
              <div>
                <h3 className="text-xs font-black text-[#1A1A1A]">Nearby Power Stations</h3>
                <p className="text-[10px] text-zinc-500">Voltx Swappable Battery Hubs</p>
              </div>
            </div>

            {onOpenPowerStations && (
              <button
                type="button"
                onClick={onOpenPowerStations}
                className="text-[11px] font-bold text-[#E6A800] hover:underline cursor-pointer"
              >
                View All
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {nearbyStations.map((station) => (
              <div
                key={station.id}
                className="p-3 rounded-2xl bg-[#F8F9FA] border border-zinc-200/80 hover:border-[#F5C518] transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-amber-700 shrink-0 shadow-xs">
                    <BatteryCharging className="w-5 h-5 text-[#E6A800]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#1A1A1A] truncate">
                        {station.name}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                        {station.batteryLevel}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 block truncate">
                      {station.address} • {station.distance} away
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo([23.7925, 90.4078], 16, { duration: 1 });
                    }
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white border border-zinc-200 hover:border-[#F5C518] text-[10px] font-bold text-[#E6A800] hover:text-black hover:bg-[#F5C518] transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                >
                  Navigate
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 6. CAPTAIN SECURITY & POLICY FOOTER */}
        <div className="pt-2 pb-4 text-center flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Driver Safety & Insurance Active • Dhaka Fleet</span>
          </div>
          <p className="text-[10px] text-zinc-400">
            Crafted with love from BeeGo Voltx
          </p>
        </div>
      </div>
    </div>
  );
};
