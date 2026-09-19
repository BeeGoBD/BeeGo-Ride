import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  CheckCircle2,
  XCircle,
  Banknote,
  Compass,
  ArrowLeft,
  Radio,
  LocateFixed,
  Loader2,
  Check,
  Bike,
  ShieldCheck,
  Lock,
  Package,
  Car,
} from 'lucide-react';
import { LocationPoint, RideRequest, RouteData } from '../types';
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

interface RiderDashboardProps {
  riderId: string;
  activeRide: RideRequest | null;
  apiKey: string;
  onBackToRoles: () => void;
  onSwitchToPassenger: () => void;
  hideHeader?: boolean;
}

export const RiderDashboard: React.FC<RiderDashboardProps> = ({
  riderId,
  activeRide,
  apiKey,
  onBackToRoles,
  onSwitchToPassenger,
  hideHeader = false,
}) => {
  const activeKey = apiKey.trim() || DEFAULT_GEOAPIFY_KEY;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Rider Live GPS state
  const [riderLiveGps, setRiderLiveGps] = useState<{
    lat: number;
    lon: number;
    accuracy?: number;
  } | null>(null);
  const [riderAddress, setRiderAddress] = useState<string>('Detecting live location in Bangladesh...');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationPrompted, setLocationPrompted] = useState<boolean>(false);

  const [isAccepting, setIsAccepting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
        if (isMounted) setRiderAddress('Dhaka Central Hub, Bangladesh');
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

  // 2. Initialize and maintain Leaflet Map permanently on Rider Dashboard
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = riderLiveGps?.lat || activeRide?.pickup.lat || 23.7925;
      const initialLon = riderLiveGps?.lon || activeRide?.pickup.lon || 90.4078;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLon],
        zoom: 14,
        zoomControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      const tileUrl = activeKey
        ? `https://maps.geoapify.com/v1/tile/dark-matter-purple-roads/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(
            activeKey
          )}`
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: '&copy; Geoapify | &copy; OpenStreetMap',
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markers = markersLayerRef.current;
    if (!map || !markers) return;

    markers.clearLayers();
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    // A. Always render Rider's Live Motorcycle marker
    const riderLat = riderLiveGps?.lat || 23.7925;
    const riderLon = riderLiveGps?.lon || 90.4078;

    const bikeIcon = L.divIcon({
      className: 'rider-bike-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <span style="position: absolute; width: 42px; height: 42px; border-radius: 9999px; background: rgba(16, 185, 129, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <div style="width: 32px; height: 32px; border-radius: 9999px; background: #10b981; border: 3px solid #ffffff; box-shadow: 0 0 16px rgba(16, 185, 129, 0.8); display: flex; align-items: center; justify-content: center; z-index: 10;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5"></circle>
              <circle cx="5.5" cy="17.5" r="3.5"></circle>
              <circle cx="15" cy="5" r="1"></circle>
              <path d="M12 17.5V14l-3-3 4-3 2 3h2"></path>
            </svg>
          </div>
          <div style="margin-top: 2px; padding: 1px 6px; background: #000; color: #10b981; font-size: 10px; font-weight: 800; border-radius: 4px; border: 1px solid #10b981; white-space: nowrap;">
            You (Bike)
          </div>
        </div>
      `,
      iconSize: [44, 48],
      iconAnchor: [22, 24],
    });

    const riderMarker = L.marker([riderLat, riderLon], {
      icon: bikeIcon,
      zIndexOffset: 900,
    }).addTo(markers);

    riderMarker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 12px; color: #111;">
        <strong>Your Live Bike Location</strong><br/>
        ${riderAddress}<br/>
        <span style="color: #10b981; font-weight: bold;">🟢 Online & Ready</span>
      </div>
    `);

    // B. If a passenger request is pending (requested)
    if (activeRide && activeRide.status === 'requested') {
      // Pickup Pin
      const pickupIcon = L.divIcon({
        className: 'pax-pickup-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="padding: 2px 8px; background: #10b981; color: #000; font-size: 11px; font-weight: 800; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0,0,0,0.6); white-space: nowrap; margin-bottom: 2px;">
              Pickup Spot
            </div>
            <div style="width: 16px; height: 16px; border-radius: 9999px; background: #10b981; border: 2.5px solid #fff; box-shadow: 0 0 10px rgba(16,185,129,0.9);"></div>
          </div>
        `,
        iconSize: [70, 40],
        iconAnchor: [35, 36],
      });

      // Drop-off Pin
      const dropoffIcon = L.divIcon({
        className: 'pax-dropoff-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="padding: 2px 8px; background: #ef4444; color: #fff; font-size: 11px; font-weight: 800; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0,0,0,0.6); white-space: nowrap; margin-bottom: 2px;">
              Drop-off Spot
            </div>
            <div style="width: 16px; height: 16px; border-radius: 4px; background: #ef4444; border: 2.5px solid #fff; box-shadow: 0 0 10px rgba(239,68,68,0.9); transform: rotate(45deg);"></div>
          </div>
        `,
        iconSize: [80, 40],
        iconAnchor: [40, 36],
      });

      L.marker([activeRide.pickup.lat, activeRide.pickup.lon], { icon: pickupIcon })
        .bindPopup(`<strong>Passenger Pickup:</strong> ${activeRide.pickup.formatted}`)
        .addTo(markers);

      L.marker([activeRide.dropoff.lat, activeRide.dropoff.lon], { icon: dropoffIcon })
        .bindPopup(`<strong>Passenger Destination:</strong> ${activeRide.dropoff.formatted}`)
        .addTo(markers);

      // Route polyline between pickup and dropoff
      if (activeRide.routeData?.coordinates && activeRide.routeData.coordinates.length > 0) {
        const polyline = L.polyline(activeRide.routeData.coordinates, {
          color: '#f59e0b',
          weight: 5,
          opacity: 0.95,
          lineJoin: 'round',
        }).addTo(map);
        routeLayerRef.current = polyline;
      }

      // Fit bounds to show Rider, Pickup, and Dropoff
      const bounds = L.latLngBounds([
        [riderLat, riderLon],
        [activeRide.pickup.lat, activeRide.pickup.lon],
        [activeRide.dropoff.lat, activeRide.dropoff.lon],
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      // Just focus on rider
      if (!activeRide || activeRide.status === 'declined' || activeRide.status === 'cancelled') {
        map.setView([riderLat, riderLon], 15);
      }
    }
  }, [riderLiveGps, riderAddress, activeRide, activeKey]);

  // Handle Accept with Rider's LIVE coordinates
  const handleAccept = async () => {
    if (!activeRide) return;
    setIsAccepting(true);
    setActionError(null);

    try {
      const driverStart: LocationPoint = riderLiveGps
        ? {
            lat: riderLiveGps.lat,
            lon: riderLiveGps.lon,
            formatted: riderAddress || 'Rider Live Spot',
          }
        : {
            lat: activeRide.pickup.lat + 0.01,
            lon: activeRide.pickup.lon - 0.008,
            formatted: 'Rider Live Spot',
          };

      let pickupRoute: RouteData | undefined;
      try {
        pickupRoute = await calculateRoute(driverStart, activeRide.pickup, activeKey);
      } catch (err) {
        console.warn('Approaching route fallback');
      }

      acceptRide(riderId, pickupRoute);
    } catch (err: any) {
      setActionError(err.message || 'Failed to accept ride.');
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle Decline
  const handleDecline = () => {
    declineRide();
  };

  const hasIncomingRequest = activeRide && activeRide.status === 'requested';

  return (
    <div
      id="rider-dashboard"
      className={`w-full bg-black text-white flex flex-col ${
        hideHeader ? 'h-full flex-1' : 'min-h-screen'
      }`}
    >
      {/* Top Rider Navigation Bar */}
      {!hideHeader && (
        <header className="w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur px-4 py-3 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToRoles}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h1 className="text-sm font-bold text-white tracking-tight">Captain Dashboard</h1>
            </div>

            <span className="font-mono text-xs text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded flex items-center gap-1">
              <Bike className="w-3.5 h-3.5" />
              <span>{riderId}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToPassenger}
              className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium flex items-center gap-1.5"
              title="Switch to Passenger view"
            >
              <span>Passenger Mode</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area: Split View designed for Android Phone */}
      <div className="flex-1 flex flex-col relative overflow-hidden h-full">
        {/* Top Part: Map Display (Always Live for Rider!) */}
        <div className="h-[46%] w-full bg-black relative shrink-0">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Top Floating Info Banner */}
          <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] pointer-events-auto">
            <div className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-xl px-2.5 py-1.5 shadow-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                  <Bike className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Rider Live GPS • Bangladesh
                  </div>
                  <div className="text-[11px] font-semibold text-white truncate">
                    {riderAddress}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRecenterGps}
                title="Re-center map on your live GPS spot"
                className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white cursor-pointer transition-colors shrink-0"
              >
                <Compass className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Part: Controls & Ride Request Details Panel */}
        <div className="h-[54%] w-full bg-zinc-950 border-t border-zinc-900 p-3 flex flex-col justify-between overflow-y-auto no-scrollbar z-10">
          <div className="flex-1 flex flex-col justify-between">
            {actionError && (
              <div className="mb-2 p-2 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">
                {actionError}
              </div>
            )}

            {/* STATE 1: WAITING FOR RIDE */}
            {!activeRide || activeRide.status === 'declined' || activeRide.status === 'cancelled' ? (
              <div className="flex-1 flex flex-col justify-between py-1">
                {/* Fleet status row */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/90 border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Bike className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Beego Moto</div>
                      <div className="text-[10px] text-amber-400 font-mono font-semibold">
                        ৳{RATE_PER_KM_TAKA}/km • Ready
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-black bg-amber-400 px-2 py-0.5 rounded-md shadow-sm">
                    ONLINE
                  </span>
                </div>

                {/* Dispatch Radar status */}
                <div className="py-2.5 px-2 text-center my-auto">
                  <div className="relative w-12 h-12 mx-auto mb-1.5 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-ping" />
                    <div className="absolute inset-2 rounded-full border border-amber-500/40 animate-pulse" />
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-amber-500/60 flex items-center justify-center text-amber-400 shadow-md">
                      <Radio className="w-4 h-4 animate-pulse" />
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-white">
                    {activeRide?.status === 'declined'
                      ? 'Ride Declined • Listening for Next'
                      : activeRide?.status === 'cancelled'
                      ? 'Ride Cancelled • Ready for Next'
                      : 'Dispatch Radar Active'}
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Broadcasting live GPS coordinates across Dhaka Metro.
                  </p>
                </div>

                {/* Rider info badge */}
                <div className="p-2 bg-black/60 border border-zinc-900 rounded-xl flex items-center justify-between text-[10px] text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Captain: {riderId}</span>
                  </div>
                  <span className="text-amber-400 font-mono font-semibold">Flat ৳70/km</span>
                </div>
              </div>
            ) : null}

            {/* STATE 2: INCOMING REQUEST (BEFORE ACCEPTING - 100% visible on screen without scrolling!) */}
            {hasIncomingRequest && (
              <div
                id="incoming-ride-request-card"
                className="flex-1 flex flex-col justify-between p-2.5 rounded-xl bg-zinc-900 border-2 border-amber-500 shadow-xl animate-in fade-in"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    New Ride Request!
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {activeRide.passengerId}
                  </span>
                </div>

                {/* THE ESTIMATED PRICE */}
                <div className="my-1.5 p-2 rounded-xl bg-black border border-zinc-800 text-center flex items-center justify-between px-4">
                  <span className="text-[11px] text-zinc-400 uppercase font-medium">Estimated Fare:</span>
                  <span className="text-xl font-black text-amber-400 flex items-center gap-1">
                    <Banknote className="w-5 h-5 text-amber-400" />
                    <span>~৳{activeRide.fareTaka}</span>
                  </span>
                </div>

                {/* TRIP DETAILS: PICKUP & DROPOFF */}
                <div className="space-y-1 my-1">
                  <div className="px-2 py-1 bg-black/60 rounded-lg border border-zinc-800 text-[11px] flex items-center justify-between gap-1">
                    <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 shrink-0">
                      <MapPin className="w-3 h-3" /> Pickup:
                    </span>
                    <span className="text-white font-medium truncate">
                      {activeRide.pickup.addressLine1 || activeRide.pickup.formatted.split(',')[0]}
                    </span>
                  </div>

                  <div className="px-2 py-1 bg-black/60 rounded-lg border border-zinc-800 text-[11px] flex items-center justify-between gap-1">
                    <span className="text-[10px] text-red-400 font-bold flex items-center gap-1 shrink-0">
                      <Navigation className="w-3 h-3" /> Drop-off:
                    </span>
                    <span className="text-white font-medium truncate">
                      {activeRide.dropoff.addressLine1 || activeRide.dropoff.formatted.split(',')[0]}
                    </span>
                  </div>

                  <div className="px-2 py-0.5 text-[10px] text-zinc-400 flex items-center justify-between">
                    <span>Distance: <strong className="text-white">{activeRide.distanceKm} km</strong></span>
                    <span className="font-mono text-amber-400">
                      {activeRide.paymentMethod ? activeRide.paymentMethod.toUpperCase() : 'CASH'}
                    </span>
                  </div>
                </div>

                {/* ACTION BUTTONS: ACCEPT OR DECLINE (Zero Scroll Needed) */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    id="decline-ride-btn"
                    type="button"
                    onClick={handleDecline}
                    className="py-2.5 px-3 rounded-xl font-bold text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                  >
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>Decline</span>
                  </button>

                  <button
                    id="accept-ride-btn"
                    type="button"
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="py-2.5 px-3 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/25 transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isAccepting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                        <span>Accepting...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                        <span>Accept Ride</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
