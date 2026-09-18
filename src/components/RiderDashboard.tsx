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
          color: '#10b981',
          weight: 5,
          opacity: 0.9,
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
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-sm font-bold text-white tracking-tight">Captain Dashboard</h1>
            </div>

            <span className="font-mono text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded flex items-center gap-1">
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Left Side: Controls & Ride Request Details Panel */}
        <div className="w-full md:w-96 lg:w-[420px] bg-zinc-950 border-r border-zinc-800/80 p-5 flex flex-col justify-between overflow-y-auto z-10">
          <div>
            {/* Live Dispatch Feed Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Live Dispatch Feed
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900/60">
                Rate: ৳{RATE_PER_KM_TAKA}/km
              </span>
            </div>

            {/* Rider Live Location Status Card */}
            <div className="mb-4 p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-lg">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Your Live Rider GPS
                </span>
                <button
                  type="button"
                  onClick={handleRecenterGps}
                  disabled={isLocating}
                  className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <LocateFixed className="w-3 h-3 text-emerald-400" />
                  <span>{isLocating ? 'Locating...' : 'Refresh'}</span>
                </button>
              </div>
              <div className="text-xs font-semibold text-white truncate">{riderAddress}</div>
              {riderLiveGps && (
                <div className="text-[10px] font-mono text-zinc-500 mt-1">
                  {riderLiveGps.lat.toFixed(5)}° N, {riderLiveGps.lon.toFixed(5)}° E
                  {riderLiveGps.accuracy && ` (±${Math.round(riderLiveGps.accuracy)}m)`}
                </div>
              )}
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">
                {actionError}
              </div>
            )}

            {/* STATE 1: WAITING FOR RIDE */}
            {!activeRide || activeRide.status === 'declined' || activeRide.status === 'cancelled' ? (
              <div className="py-8 px-2 text-center">
                <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full border border-emerald-500/40 animate-pulse" />
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-emerald-500/60 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                    <Bike className="w-6 h-6" />
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mb-1">
                  {activeRide?.status === 'declined'
                    ? 'Ride Declined'
                    : activeRide?.status === 'cancelled'
                    ? 'Ride Cancelled'
                    : 'Dispatch Radar Active'}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto mb-6">
                  {activeRide?.status === 'declined' || activeRide?.status === 'cancelled'
                    ? 'Listening for new incoming ride requests...'
                    : 'Broadcasting live GPS coordinates. Ready for instant dispatch.'}
                </p>

                <div className="p-3.5 bg-black/60 border border-zinc-800/80 rounded-2xl text-left text-xs text-zinc-400 space-y-2.5">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Assigned Fleet</span>
                    <span className="font-semibold text-white">Yamaha FZ-S (Bike)</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Base Rate</span>
                    <span className="font-mono font-bold text-emerald-400">৳70 / km</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Captain ID</span>
                    <span className="font-mono text-zinc-400">{riderId}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* STATE 2: INCOMING REQUEST (BEFORE ACCEPTING) */}
            {hasIncomingRequest && (
              <div
                id="incoming-ride-request-card"
                className="p-5 rounded-2xl bg-zinc-900/90 border-2 border-emerald-500/80 shadow-2xl animate-in fade-in"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    New Ride Request!
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {activeRide.passengerId}
                  </span>
                </div>

                {/* THE ESTIMATED PRICE (HIGHLIGHTED BEFORE ACCEPTING) */}
                <div className="my-4 p-4 rounded-xl bg-black border border-zinc-800 text-center">
                  <div className="text-xs text-zinc-400 uppercase tracking-wider font-medium mb-1">
                    Estimated Trip Fare
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-400 tracking-tight flex items-center justify-center gap-1.5">
                    <Banknote className="w-7 h-7 text-emerald-400" />
                    <span>~৳{activeRide.fareTaka} Taka</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Final fare calculated automatically from actual km traveled on bike (৳70/km)
                  </div>
                </div>

                {/* TRIP DETAILS: PICKUP & DROPOFF */}
                <div className="space-y-3 mb-5">
                  <div className="p-3 bg-black/60 rounded-xl border border-zinc-800/80">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Passenger Pickup Spot:</span>
                    </div>
                    <div className="text-xs font-semibold text-white">
                      {activeRide.pickup.addressLine1 || activeRide.pickup.formatted.split(',')[0]}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {activeRide.pickup.addressLine2 || activeRide.pickup.formatted}
                    </div>
                  </div>

                  <div className="p-3 bg-black/60 rounded-xl border border-zinc-800/80">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-red-400 mb-1 flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Drop-off Spot:</span>
                    </div>
                    <div className="text-xs font-semibold text-white">
                      {activeRide.dropoff.addressLine1 || activeRide.dropoff.formatted.split(',')[0]}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {activeRide.dropoff.addressLine2 || activeRide.dropoff.formatted}
                    </div>
                  </div>

                  <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>Estimated Distance:</span>
                    <span className="text-white font-bold">{activeRide.distanceKm} km</span>
                  </div>
                </div>

                {/* ACTION BUTTONS: ACCEPT OR DECLINE */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="decline-ride-btn"
                    type="button"
                    onClick={handleDecline}
                    className="py-3.5 px-4 rounded-xl font-bold text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>Decline</span>
                  </button>

                  <button
                    id="accept-ride-btn"
                    type="button"
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="py-3.5 px-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
          </div>

          {/* Footer Info */}
          <div className="pt-4 mt-6 border-t border-zinc-900 text-[11px] text-zinc-500 flex items-center justify-between">
            <span>Rider: {riderId}</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Bike</span>
            </span>
          </div>
        </div>

        {/* Right Side: Map Display (Always Live for Rider!) */}
        <div className="flex-1 bg-black relative min-h-[420px] md:min-h-full">
          <div ref={mapContainerRef} className="w-full h-full min-h-[420px]" />

          {/* Top Floating Info Banner */}
          <div className="absolute top-4 left-4 right-16 z-[1000] pointer-events-auto">
            <div className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-xl px-3.5 py-2 shadow-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                  <Bike className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Rider Live GPS • Bangladesh
                  </div>
                  <div className="text-xs font-semibold text-white truncate">
                    {riderAddress}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRecenterGps}
                title="Re-center map on your live GPS spot"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white cursor-pointer transition-colors shrink-0"
              >
                <Compass className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
