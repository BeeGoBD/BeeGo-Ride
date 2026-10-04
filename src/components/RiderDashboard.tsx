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
  LocateFixed,
  Loader2,
  Check,
  Bike,
  ShieldCheck,
  Power,
  Phone,
  Flag,
  User,
  MessageSquare,
  Send,
  X,
  Radio,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { LocationPoint, RideRequest, RouteData, DriverProfile, DriverVerificationStatus } from '../types';
import {
  acceptRide,
  arriveAtPickupSpot,
  startTripToDestination,
  completeTrip,
  declineRide,
  clearCurrentRide,
  sendInRideChatMessage,
  RATE_PER_KM_TAKA,
} from '../services/rideSync';
import { calculateRoute, reverseGeocode, DEFAULT_GEOAPIFY_KEY } from '../services/geoapify';
import {
  requestLiveCoordinates,
  watchLiveCoordinates,
  getDefaultSpot,
  getPreferredCity,
  setPreferredCity,
  CHATTOGRAM_SPOT,
  DHAKA_SPOT,
} from '../services/geolocation';
import { getCurrentDriver } from '../services/driverAuth';
import { ReportIssueModal } from './ReportIssueModal';

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

// Interactive Swipe to Confirm Slider (Pathao / Uber style for drivers)
const SwipeActionSlider: React.FC<{
  label: string;
  onConfirm: () => void;
  icon?: React.ReactNode;
}> = ({ label, onConfirm, icon }) => {
  const [sliderX, setSliderX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startDrag = () => setIsDragging(true);

  const onDrag = (clientX: number) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const maxDrag = rect.width - 56;
    const currentDrag = Math.max(0, Math.min(clientX - rect.left - 24, maxDrag));
    setSliderX(currentDrag);

    if (currentDrag >= maxDrag * 0.85) {
      setIsDragging(false);
      setSliderX(0);
      onConfirm();
    }
  };

  const stopDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setSliderX(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => onDrag(e.clientX)}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onTouchMove={(e) => onDrag(e.touches[0].clientX)}
      onTouchEnd={stopDrag}
      className="relative w-full h-14 rounded-2xl bg-zinc-900 border-2 border-[#F5C518]/60 overflow-hidden flex items-center p-1.5 select-none shadow-xl cursor-grab active:cursor-grabbing"
    >
      <div
        style={{ width: `${sliderX + 50}px` }}
        className="absolute left-0 top-0 bottom-0 bg-[#F5C518]/25 transition-all pointer-events-none"
      />
      <div className="w-full text-center text-xs font-black uppercase tracking-wider text-zinc-200 pointer-events-none z-10 flex items-center justify-center gap-1.5 px-12">
        <span>{label}</span>
      </div>
      <div
        style={{ transform: `translateX(${sliderX}px)` }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        className="absolute left-1.5 w-11 h-11 rounded-xl bg-[#F5C518] text-black shadow-md flex items-center justify-center z-20 cursor-pointer active:scale-95 transition-transform"
      >
        {icon || <ArrowRight className="w-5 h-5 stroke-[2.5]" />}
      </div>
    </div>
  );
};

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
  const isUnderReview = false; // Account is active immediately upon OTP verification

  // Big Yellow Switch: Online / Offline (default ONLINE so requests are received immediately)
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // In-Ride Chat drawer state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInputText, setChatInputText] = useState('');

  // Real-time synchronization of driver verification from local storage & admin updates
  useEffect(() => {
    const syncProfile = () => {
      const current = getCurrentDriver();
      if (current) {
        setDriverProfile((prev) => {
          if (!prev || prev.verificationStatus !== current.verificationStatus) {
            if (current.verificationStatus === 'approved') {
              setIsOnline(true);
              setActionError(null);
            }
            return current;
          }
          return prev;
        });
      }
    };
    window.addEventListener('storage', syncProfile);
    const interval = setInterval(syncProfile, 1000);
    return () => {
      window.removeEventListener('storage', syncProfile);
      clearInterval(interval);
    };
  }, []);

  // Rider Live GPS state
  const [riderLiveGps, setRiderLiveGps] = useState<{
    lat: number;
    lon: number;
    accuracy?: number;
  } | null>(null);
  const [riderAddress, setRiderAddress] = useState<string>('Gulshan 2 Circle, Dhaka');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const [isAccepting, setIsAccepting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Automatically request live coordinates on mount
  useEffect(() => {
    let isMounted = true;

    const acquireRiderGps = async () => {
      setIsLocating(true);
      try {
        const coords = await requestLiveCoordinates();
        if (!isMounted) return;
        setRiderLiveGps(coords);

        const rev = await reverseGeocode(coords.lat, coords.lon, activeKey);
        if (isMounted && rev?.formatted) {
          setRiderAddress(rev.formatted.split(',')[0] || rev.formatted);
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([coords.lat, coords.lon], 15);
        }
      } catch (err) {
        console.warn('Could not acquire rider GPS on load:', err);
      } finally {
        if (isMounted) setIsLocating(false);
      }
    };

    acquireRiderGps();

    const stopWatching = watchLiveCoordinates((coords) => {
      if (!isMounted) return;
      setRiderLiveGps(coords);
    });

    return () => {
      isMounted = false;
      stopWatching();
    };
  }, [activeKey]);

  // City Hub Selector for drivers
  const handleSelectCity = (city: 'chattogram' | 'dhaka') => {
    setPreferredCity(city);
    const spot = city === 'dhaka' ? DHAKA_SPOT : CHATTOGRAM_SPOT;
    setRiderAddress(spot.name);
    setRiderLiveGps({
      lat: spot.lat,
      lon: spot.lon,
      accuracy: 10,
    });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([spot.lat, spot.lon], 15, { duration: 1 });
    }
  };

  // Recenter GPS
  const handleRecenterGps = async () => {
    setIsLocating(true);
    setActionError(null);
    try {
      const coords = await requestLiveCoordinates();
      setRiderLiveGps(coords);

      const rev = await reverseGeocode(coords.lat, coords.lon, activeKey);
      if (rev?.formatted) {
        setRiderAddress(rev.formatted.split(',')[0] || rev.formatted);
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([coords.lat, coords.lon], 16, { duration: 1 });
      }
    } catch (err: any) {
      setActionError(err.message || 'Could not refresh device GPS.');
    } finally {
      setIsLocating(false);
    }
  };

  // Initialize and maintain Leaflet Map on Rider Dashboard
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const defaultSpot = getDefaultSpot();
      const initialLat = riderLiveGps?.lat || activeRide?.pickup.lat || defaultSpot.lat;
      const initialLon = riderLiveGps?.lon || activeRide?.pickup.lon || defaultSpot.lon;

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
        <div style="background-color: #F5C518; border: 2.5px solid #000; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(245, 197, 24, 0.6);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18.5" cy="17.5" r="3.5"/>
            <circle cx="5.5" cy="17.5" r="3.5"/>
            <circle cx="15" cy="5" r="1"/>
            <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
          </svg>
        </div>
      `,
      className: 'rider-custom-pin',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const riderPos: [number, number] = riderLiveGps
      ? [riderLiveGps.lat, riderLiveGps.lon]
      : [23.7925, 90.4078];

    L.marker(riderPos, { icon: riderIcon }).addTo(markersLayer);

    // If active ride is present, plot pickup and dropoff
    if (activeRide && activeRide.status !== 'idle' && activeRide.status !== 'declined' && activeRide.status !== 'cancelled') {
      const pickupIcon = L.divIcon({
        html: `
          <div style="background-color: #10B981; border: 2.5px solid #FFFFFF; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#10B981"/></svg>
          </div>
        `,
        className: 'pickup-pin',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const dropoffIcon = L.divIcon({
        html: `
          <div style="background-color: #1A1A1A; border: 2.5px solid #F5C518; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F5C518" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          </div>
        `,
        className: 'dropoff-pin',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      L.marker([activeRide.pickup.lat, activeRide.pickup.lon], { icon: pickupIcon }).addTo(markersLayer);
      L.marker([activeRide.dropoff.lat, activeRide.dropoff.lon], { icon: dropoffIcon }).addTo(markersLayer);

      // Determine which route to display (pickup route vs destination route)
      const currentCoords =
        activeRide.status === 'accepted' && activeRide.pickupRouteData?.coordinates?.length
          ? activeRide.pickupRouteData.coordinates
          : activeRide.routeData?.coordinates?.length
          ? activeRide.routeData.coordinates
          : null;

      if (currentCoords && currentCoords.length > 0) {
        const poly = L.polyline(currentCoords, {
          color: '#E6A800',
          weight: 5,
          opacity: 0.95,
          lineJoin: 'round',
        }).addTo(map);

        routeLayerRef.current = poly;
        map.fitBounds(poly.getBounds(), { padding: [35, 35] });
      } else {
        const bounds = L.latLngBounds([
          riderPos,
          [activeRide.pickup.lat, activeRide.pickup.lon],
          [activeRide.dropoff.lat, activeRide.dropoff.lon],
        ]);
        map.fitBounds(bounds, { padding: [35, 35] });
      }
    }
  }, [riderLiveGps, activeRide]);

  // Handle Accept incoming ride request
  const handleAccept = async () => {
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

  const handleSendChat = (text: string) => {
    if (!text.trim()) return;
    const captainName = driverProfile?.name || 'Captain Tanvir';
    sendInRideChatMessage('rider', captainName, text.trim());
    setChatInputText('');
  };

  const quickPhrases = ['I have arrived', 'On my way', 'Please wait 2 mins', 'Where are you?', 'Ready at pickup'];

  const status = activeRide?.status || 'idle';
  const hasIncomingRequest = isOnline && activeRide && status === 'requested';
  const isEnRouteToPickup = isOnline && activeRide && status === 'accepted';
  const isAtPickup = isOnline && activeRide && status === 'arrived_at_pickup';
  const isInTransit = isOnline && activeRide && status === 'in_transit';
  const isCompleted = isOnline && activeRide && status === 'completed';

  // Play audio chime when a new ride request arrives
  useEffect(() => {
    if (hasIncomingRequest) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.35);
        }
      } catch (e) {}
    }
  }, [hasIncomingRequest]);

  const passengerName = activeRide?.passengerName || activeRide?.passengerId || 'Passenger';
  const passengerPhone = activeRide?.passengerPhone || '';

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
                  ? `Accepting passenger rides at flat ৳${RATE_PER_KM_TAKA}/km`
                  : 'Go online to start receiving trip requests'}
              </p>
            </div>
          </div>

          {/* Big Yellow Switch Toggle */}
          <button
            type="button"
            id="rider-online-toggle-switch"
            onClick={() => setIsOnline(!isOnline)}
            className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 shadow-inner ${
              isOnline ? 'bg-[#F5C518]' : 'bg-zinc-300'
            }`}
            title="Toggle Online Status"
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

      {/* 2. THE MAP STARTS RIGHT AFTER "YOU ARE ONLINE" (Increased from upside into the gap) */}
      <div className="w-full relative bg-zinc-100 border-b border-zinc-200 shrink-0">
        {/* Top Floating Map Radar Banner */}
        <div className="absolute top-2.5 left-3 right-3 z-10 flex items-center justify-between pointer-events-none gap-2">
          <div className="px-3 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-zinc-200 shadow-md flex items-center gap-2 pointer-events-auto min-w-0 flex-1">
            <div className="w-6 h-6 rounded-xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-center text-[#E6A800] shrink-0">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] uppercase font-mono font-bold text-[#E6A800] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live GPS Radar
              </span>
              <span className="text-xs font-black text-[#1A1A1A] block truncate">
                {riderAddress}
              </span>
            </div>

            {/* Quick City Hub Toggle */}
            <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-xl border border-zinc-200 shrink-0">
              <button
                type="button"
                onClick={() => handleSelectCity('chattogram')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  getPreferredCity() === 'chattogram'
                    ? 'bg-[#F5C518] text-black shadow-xs'
                    : 'text-zinc-500 hover:text-black'
                }`}
              >
                Chittagong
              </button>
              <button
                type="button"
                onClick={() => handleSelectCity('dhaka')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  getPreferredCity() === 'dhaka'
                    ? 'bg-[#F5C518] text-black shadow-xs'
                    : 'text-zinc-500 hover:text-black'
                }`}
              >
                Dhaka
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRecenterGps}
            title="Recenter GPS"
            className="w-9 h-9 rounded-2xl bg-white/95 backdrop-blur-md border border-zinc-200 shadow-md flex items-center justify-center text-zinc-700 hover:text-black cursor-pointer pointer-events-auto active:scale-95 transition-all shrink-0"
          >
            <LocateFixed className={`w-4 h-4 ${isLocating ? 'animate-spin text-[#E6A800]' : ''}`} />
          </button>
        </div>

        {/* Leaflet Map Frame (Prominent height occupying the top space) */}
        <div className="w-full h-72 sm:h-80 relative overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      </div>

      {/* 3. BELOW THE MAP: RIDE DISPATCH, INCOMING REQUESTS & ACTIVE TRIP ACTIONS */}
      <div className="p-4 flex flex-col gap-3">
        {/* Error notification */}
        {actionError && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 animate-in fade-in">
            {actionError}
          </div>
        )}

        {/* A. CASE: DRIVER IS OFFLINE */}
        {!isOnline && (
          <div className="p-5 rounded-3xl bg-white border border-zinc-200 shadow-sm text-center flex flex-col items-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
              <Power className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#1A1A1A]">You are currently Offline</h3>
              <p className="text-xs text-zinc-500 max-w-xs mt-0.5">
                Turn ON the switch at the top to connect to Dhaka central dispatch and start receiving passenger rides.
              </p>
            </div>
          </div>
        )}

        {/* B. CASE: DRIVER IS ONLINE & IDLE (Scanning for Requests) */}
        {isOnline && (!activeRide || status === 'idle' || status === 'declined' || status === 'cancelled') && (
          <div className="p-4 rounded-3xl bg-white border border-zinc-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-center text-[#E6A800] relative">
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[#1A1A1A]">Radar Active • Waiting for Requests</h3>
                  <p className="text-[10px] text-zinc-500 font-medium">Auto-dispatching nearest passenger</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#FFF9E6] text-[#E6A800] px-2 py-0.5 rounded-full border border-[#F5C518]/30">
                ৳70/km
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-zinc-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-semibold">Central Dhaka Fleet Connected</span>
              </div>
              <span className="font-mono text-zinc-500 text-[11px]">Fair Rate Guarantee</span>
            </div>
          </div>
        )}

        {/* C. CASE: INCOMING TRIP REQUEST (Accept / Decline) */}
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
                  Trip Earnings (৳70/km)
                </span>
                <span className="text-2xl font-black text-[#1A1A1A] flex items-center gap-1">
                  <Banknote className="w-5 h-5 text-[#E6A800]" />
                  <span>৳{activeRide.fareTaka}</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-500 block">Trip Distance</span>
                <span className="text-sm font-black text-[#1A1A1A]">
                  {activeRide.distanceKm} km
                </span>
              </div>
            </div>

            {/* Pickup & Drop-off addresses */}
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

            {/* Passenger Contact Details & Report Button */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-black text-black truncate">
                      {passengerName}
                    </span>
                    <span className="text-[9px] font-bold text-amber-900 bg-amber-200/80 px-1.5 py-0.2 rounded shrink-0">
                      Client
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-zinc-700 block mt-0.5 truncate">
                    {passengerPhone || 'No phone provided'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {passengerPhone && (
                  <a
                    href={`tel:${passengerPhone}`}
                    className="px-2.5 py-1.5 bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 active:scale-95"
                    title="Call Passenger"
                  >
                    <Phone className="w-3 h-3 fill-black" />
                    <span>Call</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  title="Report Passenger Incident"
                >
                  <Flag className="w-3 h-3 text-rose-600 fill-rose-600" />
                  <span>Report</span>
                </button>
              </div>
            </div>

            {/* Action Buttons: Accept / Decline */}
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

        {/* D. CASE: RIDE ACCEPTED / EN ROUTE TO PICKUP SPOT */}
        {isEnRouteToPickup && (
          <div className="p-4 rounded-3xl bg-white border border-zinc-200 shadow-lg flex flex-col gap-3 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Heading to Pickup Spot
              </span>
              <span className="text-xs font-mono font-bold text-[#E6A800]">
                Fare: ৳{activeRide.fareTaka}
              </span>
            </div>

            {/* Passenger Profile Strip with Call, Chat & Report */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/40 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-black text-black truncate">{passengerName}</span>
                    <span className="text-[9px] font-bold text-amber-900 bg-amber-200 px-1 rounded shrink-0">
                      Passenger
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-zinc-700 block mt-0.5 truncate">
                    {passengerPhone || 'No phone provided'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {passengerPhone && (
                  <a
                    href={`tel:${passengerPhone}`}
                    className="w-8 h-8 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black flex items-center justify-center transition-all shadow-xs active:scale-95"
                    title="Call Passenger"
                  >
                    <Phone className="w-3.5 h-3.5 fill-black" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-800 flex items-center justify-center transition-colors cursor-pointer active:scale-95 relative"
                  title="Chat with Passenger"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {(activeRide.chatMessages?.length || 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#E6A800] text-black text-[8px] font-black flex items-center justify-center">
                      {activeRide.chatMessages!.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer active:scale-95"
                  title="Report Passenger Incident (Not responding, no-show, etc.)"
                >
                  <Flag className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                  <span>Report</span>
                </button>
              </div>
            </div>

            {/* Pickup location indicator */}
            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#F8F9FA] border border-zinc-200 text-xs">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <MapPin className="w-3 h-3" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] uppercase font-bold text-zinc-400 block">Pickup Location</span>
                <span className="font-bold text-[#1A1A1A] block truncate">
                  {activeRide.pickup.addressLine1 || activeRide.pickup.formatted.split(',')[0]}
                </span>
              </div>
            </div>

            {/* Swipe Action: Slide to Confirm Reached Pickup Spot */}
            <SwipeActionSlider
              label="Slide: Reached Pickup Spot"
              onConfirm={() => arriveAtPickupSpot()}
              icon={<CheckCircle2 className="w-5 h-5 text-black" />}
            />
          </div>
        )}

        {/* E. CASE: ARRIVED AT PICKUP SPOT (Waiting to board passenger) */}
        {isAtPickup && (
          <div className="p-4 rounded-3xl bg-white border border-zinc-200 shadow-lg flex flex-col gap-3 animate-in fade-in">
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black text-emerald-950">At Pickup Spot • Passenger Notified</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-800">Waiting to board</span>
            </div>

            {/* Passenger Contact Strip */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/40 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-black text-black truncate">{passengerName}</div>
                  <span className="font-mono text-[11px] font-bold text-zinc-700 block truncate">
                    {passengerPhone || 'No phone provided'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {passengerPhone && (
                  <a
                    href={`tel:${passengerPhone}`}
                    className="w-8 h-8 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black flex items-center justify-center transition-all shadow-xs active:scale-95"
                    title="Call Passenger"
                  >
                    <Phone className="w-3.5 h-3.5 fill-black" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-800 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                  title="Chat with Passenger"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer active:scale-95"
                  title="Report Passenger Incident (Not responding, no-show)"
                >
                  <Flag className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                  <span>Report</span>
                </button>
              </div>
            </div>

            {/* Destination Preview */}
            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#F8F9FA] border border-zinc-200 text-xs">
              <div className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0">
                <Navigation className="w-3 h-3" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] uppercase font-bold text-zinc-400 block">Going To (Drop-off)</span>
                <span className="font-bold text-[#1A1A1A] block truncate">
                  {activeRide.dropoff.addressLine1 || activeRide.dropoff.formatted.split(',')[0]}
                </span>
              </div>
            </div>

            {/* Swipe Action: Slide to Start Trip to Destination */}
            <SwipeActionSlider
              label="Slide: Picked Up Passenger (Start Trip)"
              onConfirm={() => startTripToDestination()}
              icon={<Navigation className="w-5 h-5 fill-black" />}
            />
          </div>
        )}

        {/* F. CASE: IN TRANSIT TO DESTINATION (Trip active) */}
        {isInTransit && (
          <div className="p-4 rounded-3xl bg-white border border-zinc-200 shadow-lg flex flex-col gap-3 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Navigation to Destination
              </span>
              <span className="text-xs font-mono font-bold text-emerald-700">
                Meter: ৳{Math.round(RATE_PER_KM_TAKA * (activeRide.distanceKm || 1))}
              </span>
            </div>

            {/* Drop-off address indicator */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#F8F9FA] border border-zinc-200 text-xs">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 text-[#F5C518] flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] uppercase font-bold text-zinc-400 block">Destination Drop-off</span>
                <span className="font-black text-[#1A1A1A] block truncate">
                  {activeRide.dropoff.addressLine1 || activeRide.dropoff.formatted}
                </span>
              </div>
            </div>

            {/* Passenger Contact Strip */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs">
              <div className="min-w-0">
                <span className="font-bold text-zinc-900 block truncate">{passengerName}</span>
                <span className="font-mono text-[11px] text-zinc-500 block truncate">{passengerPhone}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {passengerPhone && (
                  <a
                    href={`tel:${passengerPhone}`}
                    className="w-8 h-8 rounded-xl bg-[#F5C518] text-black flex items-center justify-center transition-all active:scale-95"
                    title="Call"
                  >
                    <Phone className="w-3.5 h-3.5 fill-black" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="w-8 h-8 rounded-xl bg-white border border-zinc-200 text-zinc-800 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                  title="Chat"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-2 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer active:scale-95"
                  title="Report Issue"
                >
                  <Flag className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                  <span>Report</span>
                </button>
              </div>
            </div>

            {/* Swipe Action: Slide to Complete Ride at Destination */}
            <SwipeActionSlider
              label="Slide: Complete Ride (Destination Reached)"
              onConfirm={() => completeTrip(activeRide.distanceKm)}
              icon={<CheckCircle2 className="w-5 h-5 text-black" />}
            />
          </div>
        )}

        {/* G. CASE: TRIP COMPLETED */}
        {isCompleted && (
          <div className="p-4 rounded-3xl bg-white border border-zinc-200 shadow-xl flex flex-col gap-3 animate-in fade-in">
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-black text-emerald-950">Trip Completed Successfully!</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Saved to History
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#E6A800] uppercase font-bold block">Fare Collected</span>
                <span className="text-2xl font-black text-[#1A1A1A]">
                  ৳{activeRide.finalFareTaka || activeRide.fareTaka}
                </span>
              </div>
              <div className="text-right text-xs">
                <span className="text-zinc-500 block">Distance: {activeRide.actualTraveledKm || activeRide.distanceKm} km</span>
                <span className="text-zinc-500 block font-mono">Payment: {activeRide.paymentMethod || 'Cash'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 text-xs shadow-2xs"
              >
                <Flag className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                <span>Report Passenger Incident / Dispute</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearCurrentRide();
                }}
                className="w-full py-3.5 bg-[#F5C518] hover:bg-[#E6A800] text-black font-black rounded-2xl transition-all shadow-lg shadow-amber-400/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Complete Trip & Back to Radar</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. DRIVER SAFETY & FLEET FOOTER */}
        <div className="pt-2 pb-2 text-center flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Driver Safety & Insurance Active • Dhaka Fleet Dispatch</span>
          </div>
          <p className="text-[10px] text-zinc-400">
            BeeGo Voltx • Eco Electric Fleet Bangladesh
          </p>
        </div>
      </div>

      {/* 5. IN-RIDE REAL-TIME CHAT DRAWER */}
      {isChatOpen && activeRide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Chat Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/30 flex items-center justify-center text-[#E6A800]">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900">Chat with Passenger</h3>
                  <p className="text-[11px] font-mono text-zinc-500">
                    {passengerName} • {passengerPhone || 'No phone'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Message History */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[180px] max-h-[300px]">
              {(activeRide.chatMessages || []).length === 0 ? (
                <div className="text-center py-6 text-zinc-400 text-xs">
                  No messages yet. Send a quick update to the passenger.
                </div>
              ) : (
                activeRide.chatMessages!.map((msg) => {
                  const isDriver = msg.sender === 'rider';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isDriver ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs ${
                          isDriver
                            ? 'bg-[#F5C518] text-black font-semibold rounded-br-xs'
                            : 'bg-zinc-100 text-zinc-900 rounded-bl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-zinc-400 mt-0.5 px-1 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick phrases */}
            <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {quickPhrases.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => handleSendChat(phrase)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-zinc-200 hover:border-[#F5C518] text-[11px] text-zinc-700 whitespace-nowrap cursor-pointer active:scale-95"
                >
                  {phrase}
                </button>
              ))}
            </div>

            {/* Input bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat(chatInputText);
              }}
              className="p-3 border-t border-zinc-100 flex items-center gap-2 bg-white"
            >
              <input
                type="text"
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                placeholder="Type message to passenger..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-900 focus:outline-hidden focus:border-[#F5C518]"
              />
              <button
                type="submit"
                disabled={!chatInputText.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] disabled:opacity-40 text-black font-black text-xs transition-colors cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. REPORT INCIDENT MODAL (Accessible anytime before or after ride) */}
      {activeRide && (
        <ReportIssueModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          reporterRole="driver"
          reporterId={riderId}
          reporterName={driverProfile?.name || 'Driver'}
          reportedRole="passenger"
          reportedId={activeRide.passengerId}
          reportedName={passengerName}
          reportedPhone={passengerPhone}
          rideId={activeRide.id}
        />
      )}
    </div>
  );
};
