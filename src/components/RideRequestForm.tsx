import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  LocateFixed,
  X,
  Loader2,
  Building2,
  Plane,
  Train,
  Compass,
  ArrowLeft,
  Banknote,
  Clock,
  Radio,
  User,
  ArrowDownUp,
  Sparkles,
  Car,
  Bike,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { LocationPoint, RideRequest, RouteData, PaymentMethod } from '../types';
import { searchAddress, reverseGeocode, DEFAULT_GEOAPIFY_KEY } from '../services/geoapify';
import { RATE_PER_KM_TAKA, updatePassengerLiveLocation } from '../services/rideSync';
import { searchBangladeshDistricts } from '../data/bangladeshDistricts';
import { requestLiveCoordinates, watchLiveCoordinates } from '../services/geolocation';
import { InteractiveLocationMap, PinMode } from './InteractiveLocationMap';
import { PaymentMethodSelector } from './PaymentMethodSelector';

interface RideRequestFormProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  passengerId: string;
  pickup: LocationPoint | null;
  setPickup: (point: LocationPoint | null) => void;
  dropoff: LocationPoint | null;
  setDropoff: (point: LocationPoint | null) => void;
  routeData?: RouteData | null;
  onRequestRide: (paymentMethod: PaymentMethod) => void;
  isLoadingRoute: boolean;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  activeRide: RideRequest | null;
  onCancelRide: () => void;
  onResetRide: () => void;
  onBackToRoles: () => void;
  onSwitchToRider: () => void;
}

export const RideRequestForm: React.FC<RideRequestFormProps> = ({
  apiKey,
  onApiKeyChange,
  passengerId,
  pickup,
  setPickup,
  dropoff,
  setDropoff,
  routeData,
  onRequestRide,
  isLoadingRoute,
  errorMessage,
  setErrorMessage,
  activeRide,
  onCancelRide,
  onResetRide,
  onBackToRoles,
  onSwitchToRider,
}) => {
  const activeKey = apiKey.trim() || DEFAULT_GEOAPIFY_KEY;

  const [pickupInput, setPickupInput] = useState(pickup?.formatted || '');
  const [dropoffInput, setDropoffInput] = useState(dropoff?.formatted || '');

  const [pickupSuggestions, setPickupSuggestions] = useState<LocationPoint[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<LocationPoint[]>([]);

  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDropoff, setIsSearchingDropoff] = useState(false);

  const [isPickupFocused, setIsPickupFocused] = useState(false);
  const [isDropoffFocused, setIsDropoffFocused] = useState(false);

  const [pinMode, setPinMode] = useState<PinMode>('pickup');
  const [selectedTier, setSelectedTier] = useState<'select' | 'moto' | 'sedan'>('moto');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
  const [paymentMethodError, setPaymentMethodError] = useState(false);
  const [userLiveGps, setUserLiveGps] = useState<{ lat: number; lon: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isPickupLiveGps, setIsPickupLiveGps] = useState(true);
  const autoLocatedRef = useRef(false);

  // Abort controllers to prevent race conditions on rapid typing
  const pickupAbortRef = useRef<AbortController | null>(null);
  const dropoffAbortRef = useRef<AbortController | null>(null);

  const pickupDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropoffDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const pickupContainerRef = useRef<HTMLDivElement>(null);
  const dropoffContainerRef = useRef<HTMLDivElement>(null);

  // Automatic live GPS detection on entering dashboard
  // Live location becomes the passenger's default pickup location
  useEffect(() => {
    let isMounted = true;

    const autoDetectGps = async () => {
      setIsLocating(true);
      try {
        const res = await requestLiveCoordinates();
        if (!isMounted) return;
        setUserLiveGps({ lat: res.lat, lon: res.lon, accuracy: res.accuracy });

        // Update real-time passenger location for rider telemetry
        updatePassengerLiveLocation({ lat: res.lat, lon: res.lon });

        // Reverse-geocode user's live position and set as default pickup spot
        const point = await reverseGeocode(res.lat, res.lon, activeKey);
        if (!isMounted) return;
        setPickup(point);
        setPickupInput(point.formatted);
        setIsPickupLiveGps(true);
      } catch (err) {
        console.warn('Auto GPS notice:', err);
      } finally {
        if (isMounted) setIsLocating(false);
      }
    };

    if (!autoLocatedRef.current) {
      autoLocatedRef.current = true;
      autoDetectGps();
    }

    // Subscribe to continuous live location updates
    const unwatch = watchLiveCoordinates((res) => {
      if (!isMounted) return;
      setUserLiveGps({ lat: res.lat, lon: res.lon, accuracy: res.accuracy });
      updatePassengerLiveLocation({ lat: res.lat, lon: res.lon });
    });

    return () => {
      isMounted = false;
      unwatch();
    };
  }, [activeKey, setPickup]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickupContainerRef.current && !pickupContainerRef.current.contains(e.target as Node)) {
        setIsPickupFocused(false);
      }
      if (dropoffContainerRef.current && !dropoffContainerRef.current.contains(e.target as Node)) {
        setIsDropoffFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Synchronize when parent updates pickup/dropoff
  useEffect(() => {
    if (pickup) {
      setPickupInput(pickup.formatted);
    }
  }, [pickup]);

  useEffect(() => {
    if (dropoff) {
      setDropoffInput(dropoff.formatted);
    } else {
      setDropoffInput('');
    }
  }, [dropoff]);

  // Reset to passenger's live GPS spot for pickup
  const handleResetToLiveGpsPickup = async () => {
    setIsLocating(true);
    setErrorMessage(null);

    try {
      const res = await requestLiveCoordinates();
      setUserLiveGps({ lat: res.lat, lon: res.lon, accuracy: res.accuracy });
      updatePassengerLiveLocation({ lat: res.lat, lon: res.lon });

      const point = await reverseGeocode(res.lat, res.lon, activeKey);
      setPickup(point);
      setPickupInput(point.formatted);
      setIsPickupLiveGps(true);
      setPickupSuggestions([]);
      setIsPickupFocused(false);

      if (res.message && res.isSimulatedBangladesh) {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not detect device GPS coordinates.');
    } finally {
      setIsLocating(false);
    }
  };

  // Real-time search for Pickup Spot (Strictly Bangladesh only, instant on 1-2 keys)
  const handlePickupChange = (value: string) => {
    setPickupInput(value);
    setErrorMessage(null);

    if (pickup && value !== pickup.formatted) {
      setPickup(null);
    }

    if (pickupDebounceRef.current) {
      clearTimeout(pickupDebounceRef.current);
    }
    if (pickupAbortRef.current) {
      pickupAbortRef.current.abort();
    }

    const trimmed = value.trim();
    if (!trimmed) {
      setPickupSuggestions([]);
      setIsSearchingPickup(false);
      return;
    }

    // Instant match on 1 or 2 keys or district names
    const instant = searchBangladeshDistricts(trimmed, 8);
    if (instant.length > 0) {
      setPickupSuggestions(instant);
    }

    setIsSearchingPickup(true);

    pickupDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      pickupAbortRef.current = controller;

      try {
        const results = await searchAddress(value, activeKey, controller.signal);
        if (results.length > 0) {
          setPickupSuggestions(results);
        } else if (instant.length > 0) {
          setPickupSuggestions(instant);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // If error occurs, keep any instant district matches
          if (instant.length === 0) {
            setErrorMessage(err.message || 'Error fetching Bangladesh locations');
          }
        }
      } finally {
        setIsSearchingPickup(false);
      }
    }, 120);
  };

  // Real-time search for Drop-off Spot (Strictly Bangladesh only, instant on 1-2 keys)
  const handleDropoffChange = (value: string) => {
    setDropoffInput(value);
    setErrorMessage(null);

    if (dropoff && value !== dropoff.formatted) {
      setDropoff(null);
    }

    if (dropoffDebounceRef.current) {
      clearTimeout(dropoffDebounceRef.current);
    }
    if (dropoffAbortRef.current) {
      dropoffAbortRef.current.abort();
    }

    const trimmed = value.trim();
    if (!trimmed) {
      setDropoffSuggestions([]);
      setIsSearchingDropoff(false);
      return;
    }

    // Instant match on 1 or 2 keys or district names
    const instant = searchBangladeshDistricts(trimmed, 8);
    if (instant.length > 0) {
      setDropoffSuggestions(instant);
    }

    setIsSearchingDropoff(true);

    dropoffDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      dropoffAbortRef.current = controller;

      try {
        const results = await searchAddress(value, activeKey, controller.signal);
        if (results.length > 0) {
          setDropoffSuggestions(results);
        } else if (instant.length > 0) {
          setDropoffSuggestions(instant);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          if (instant.length === 0) {
            setErrorMessage(err.message || 'Error fetching Bangladesh locations');
          }
        }
      } finally {
        setIsSearchingDropoff(false);
      }
    }, 120);
  };

  // GPS Current Location for active pin spot
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setErrorMessage(null);

    try {
      const res = await requestLiveCoordinates();
      setUserLiveGps({ lat: res.lat, lon: res.lon, accuracy: res.accuracy });

      // Update real-time passenger location for rider telemetry
      updatePassengerLiveLocation({ lat: res.lat, lon: res.lon });

      const point = await reverseGeocode(res.lat, res.lon, activeKey);

      if (pinMode === 'pickup') {
        setPickup(point);
        setPickupInput(point.formatted);
        setPickupSuggestions([]);
        setIsPickupFocused(false);
      } else {
        setDropoff(point);
        setDropoffInput(point.formatted);
        setDropoffSuggestions([]);
        setIsDropoffFocused(false);
      }

      if (res.message && res.isSimulatedBangladesh) {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not detect device GPS coordinates.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectPickup = (item: LocationPoint) => {
    setPickup(item);
    setPickupInput(item.formatted);
    setPickupSuggestions([]);
    setIsPickupFocused(false);
    setErrorMessage(null);
  };

  const handleSelectDropoff = (item: LocationPoint) => {
    setDropoff(item);
    setDropoffInput(item.formatted);
    setDropoffSuggestions([]);
    setIsDropoffFocused(false);
    setErrorMessage(null);
  };

  // Switch Pickup and Drop-off locations with a single click
  const handleSwitchLocations = () => {
    const prevPickup = pickup;
    const prevPickupInput = pickupInput;

    setPickup(dropoff);
    setPickupInput(dropoffInput);

    setDropoff(prevPickup);
    setDropoffInput(prevPickupInput);

    setPickupSuggestions([]);
    setDropoffSuggestions([]);
    setErrorMessage(null);
  };

  const isReadyToRequest = Boolean(pickup && dropoff && selectedPaymentMethod);

  // Approximate straight-line distance if pickup & dropoff exist (for immediate fare preview)
  const approxDistanceKm = React.useMemo(() => {
    if (!pickup || !dropoff) return null;
    const R = 6371; // km
    const dLat = ((dropoff.lat - pickup.lat) * Math.PI) / 180;
    const dLon = ((dropoff.lon - pickup.lon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pickup.lat * Math.PI) / 180) *
        Math.cos((dropoff.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c * 1.35; // approximate driving factor
    return Math.max(0.5, Number(d.toFixed(1)));
  }, [pickup, dropoff]);

  const approxFareTaka = approxDistanceKm ? Math.round(approxDistanceKm * RATE_PER_KM_TAKA) : null;

  // Helper to render suggestion icon
  const renderItemIcon = (item: LocationPoint, isDrop: boolean) => {
    if (item.resultType === 'district' || item.category === 'district') {
      return (
        <span className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] font-black text-amber-400 shrink-0 mt-0.5" title="Bangladesh District">
          BD
        </span>
      );
    }
    const cat = (item.category || item.resultType || '').toLowerCase();
    if (cat.includes('airport') || cat.includes('flight')) {
      return <Plane className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />;
    }
    if (cat.includes('station') || cat.includes('rail') || cat.includes('metro')) {
      return <Train className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
    }
    if (cat.includes('building') || cat.includes('commercial') || cat.includes('amenity')) {
      return <Building2 className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />;
    }
    return isDrop ? (
      <Navigation className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
    ) : (
      <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
    );
  };

  const isRideOngoing =
    activeRide &&
    (activeRide.status === 'requested' ||
      activeRide.status === 'accepted' ||
      activeRide.status === 'arrived_at_pickup');

  return (
    <div
      id="ride-request-container"
      className="w-full mx-auto px-3 py-2.5 flex-1 flex flex-col"
    >
      {/* Top Compact Navigation & Passenger Badge */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-900 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToRoles}
            className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-all cursor-pointer font-semibold active:scale-95"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>Dashboard</span>
          </button>

          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-400">
            <User className="w-3 h-3 text-amber-400" />
            <span className="truncate max-w-[90px]">{passengerId}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
            ৳{RATE_PER_KM_TAKA}/km
          </span>
        </div>
      </div>

      {/* Error alert banner */}
      {errorMessage && (
        <div
          id="error-alert"
          className="mb-6 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* PASSENGER STATUS 1: RIDE IS ACTIVE / REQUESTED */}
      {isRideOngoing ? (
        <div id="passenger-active-ride-card" className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in">
          {activeRide?.status === 'requested' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-zinc-900 border-2 border-amber-500/60 flex items-center justify-center mx-auto mb-4 relative">
                <Radio className="w-7 h-7 text-amber-400 animate-pulse" />
                <span className="absolute inset-0 rounded-full border border-amber-500/30 animate-ping" />
              </div>

              <h2 className="text-xl font-extrabold text-white mb-1">
                Looking for Nearby Riders...
              </h2>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-5 leading-relaxed">
                Your ride request has been dispatched to the Rider Dashboard. Waiting for a rider to accept.
              </p>

              {/* Price & Trip Info */}
              <div className="p-4 rounded-xl bg-black border border-zinc-800/80 mb-5 max-w-sm mx-auto">
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Estimated Fare</div>
                <div className="text-3xl font-black text-amber-400 flex items-center justify-center gap-1">
                  <Banknote className="w-6 h-6 text-amber-400" />
                  <span>৳{activeRide.fareTaka} Taka</span>
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  {activeRide.distanceKm} km • Rate: ৳{RATE_PER_KM_TAKA} / km
                </div>
              </div>

              <div className="space-y-2 text-left p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800/60 text-xs mb-6 max-w-sm mx-auto">
                <div className="truncate">
                  <span className="text-zinc-500 font-medium">Pickup: </span>
                  <span className="text-zinc-200 font-semibold">{activeRide.pickup.formatted}</span>
                </div>
                <div className="truncate">
                  <span className="text-zinc-500 font-medium">Drop-off: </span>
                  <span className="text-zinc-200 font-semibold">{activeRide.dropoff.formatted}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onCancelRide}
                className="py-2.5 px-5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
              >
                Cancel Ride Request
              </button>
            </div>
          )}

          {activeRide?.status === 'accepted' && (
            <div className="text-center py-6 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-amber-950 border-2 border-amber-500 flex items-center justify-center mx-auto mb-4 text-amber-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="inline-block px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800 text-amber-400 text-xs font-mono mb-2">
                Rider Assigned: {activeRide.riderId || 'Guest Rider'}
              </div>

              <h2 className="text-xl font-extrabold text-white mb-2">
                Rider Accepted Your Request!
              </h2>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-5 leading-relaxed">
                Your rider is currently heading to your pickup spot. Please wait at:
              </p>

              <div className="p-4 bg-black border border-amber-900/50 rounded-xl text-left max-w-sm mx-auto mb-6">
                <div className="text-[11px] uppercase tracking-wider text-amber-400 font-bold mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Pickup Spot:</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {activeRide.pickup.addressLine1 || activeRide.pickup.formatted.split(',')[0]}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {activeRide.pickup.addressLine2 || activeRide.pickup.formatted}
                </div>
              </div>

              <div className="text-xs text-zinc-500 flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Rider is on the way • Fare: ৳{activeRide.fareTaka} Taka</span>
              </div>
            </div>
          )}

          {activeRide?.status === 'arrived_at_pickup' && (
            <div className="text-center py-6 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-amber-400 text-black flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <span className="inline-block px-3 py-1 rounded-full bg-amber-950 border border-amber-600 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                Rider Arrived!
              </span>

              <h2 className="text-2xl font-black text-white mb-2">
                Your Rider Has Arrived
              </h2>
              <p className="text-xs text-zinc-300 max-w-sm mx-auto mb-6">
                Your driver is waiting at the pickup spot. Please meet your rider to begin the trip to your drop-off location.
              </p>

              <div className="p-4 bg-black border border-zinc-800 rounded-xl text-left max-w-sm mx-auto space-y-2 mb-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Destination:</span>
                  <span className="text-white font-semibold truncate ml-2">
                    {activeRide.dropoff.addressLine1 || activeRide.dropoff.formatted.split(',')[0]}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Total Price:</span>
                  <span className="text-amber-400 font-bold">৳{activeRide.fareTaka} Taka</span>
                </div>
              </div>

              <p className="text-xs text-zinc-500">
                Trip navigation will begin as soon as the rider starts driving.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* PASSENGER STATUS 2: FORM TO REQUEST RIDE + INTERACTIVE PICKUP MAP */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Card */}
          <div className="lg:col-span-5 space-y-4">
            <div id="ride-request-card" className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-2xl relative">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                    <span>Plan Your Ride</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Dhaka & 64 Districts • ৳{RATE_PER_KM_TAKA}/km</span>
                  </p>
                </div>

                {/* Bike icon on the opposite side of Plan Your Ride (Right side) */}
                <div className="flex items-center gap-2.5">
                  {approxDistanceKm && (
                    <div className="text-right font-mono hidden sm:block">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Est. Trip</span>
                      <span className="text-sm font-bold text-amber-400">~{approxDistanceKm} km</span>
                    </div>
                  )}
                  <div
                    id="plan-your-ride-bike-icon"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/50 border border-amber-500/50 text-amber-400 shadow-md shadow-amber-950/40"
                    title="Beego Moto is available"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                      <Bike className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-black text-white block leading-tight">Moto Bike</span>
                      <span className="text-[10px] text-amber-400 font-mono block leading-tight font-bold">Available Now</span>
                    </div>
                  </div>
                </div>
              </div>

          <div className="space-y-4">
            {/* UNIFIED ITINERARY INPUTS */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 relative">
              {/* Bike logo at top right of the pickup & dropoff location box */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-800/60">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Route Details
                </span>
                <div
                  id="itinerary-box-bike-logo"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-amber-500/40 text-amber-400 text-xs font-bold"
                  title="Moto bike ride available"
                >
                  <Bike className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] text-zinc-200">Bike Dispatch</span>
                </div>
              </div>

              {/* Vertical transit track connector with integrated Swap button */}
              <div className="absolute left-[26px] sm:left-[30px] top-[48px] bottom-[48px] w-0.5 bg-gradient-to-b from-amber-400 via-zinc-700 to-red-500 pointer-events-none flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleSwitchLocations}
                  disabled={!pickup || !dropoff}
                  className="pointer-events-auto p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer shadow-lg active:scale-90 disabled:cursor-not-allowed group"
                  title="Swap pickup and drop-off"
                >
                  <ArrowDownUp className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-180 transition-transform duration-300" />
                </button>
              </div>

              {/* 1. PICKUP SPOT */}
              <div ref={pickupContainerRef} className="relative pl-8 sm:pl-9 pb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="absolute left-2.5 sm:left-3.5 top-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-amber-400/20" />
                    <label
                      htmlFor="pickup-input"
                      className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider"
                    >
                      Pickup Location
                    </label>
                  </div>

                  <button
                    id="current-location-btn"
                    type="button"
                    onClick={handleResetToLiveGpsPickup}
                    disabled={isLocating}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 font-mono"
                    title="Detect and use your real-time live GPS location"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                    <span>{isLocating ? 'Detecting GPS...' : isPickupLiveGps ? 'Live Location' : 'Use Current GPS'}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="pickup-input"
                    type="text"
                    value={pickupInput}
                    onChange={(e) => handlePickupChange(e.target.value)}
                    onFocus={() => {
                      setIsPickupFocused(true);
                      if (pickupInput && pickupSuggestions.length === 0 && !pickup) {
                        handlePickupChange(pickupInput);
                      }
                    }}
                    placeholder="Search pickup location in Bangladesh..."
                    autoComplete="off"
                    className="w-full pl-3.5 pr-10 py-3 bg-black/90 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40 transition-all font-medium"
                  />

                  {/* Status Indicator */}
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
                    {isSearchingPickup && (
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    )}
                    {pickupInput && !isSearchingPickup && (
                      <button
                        type="button"
                        onClick={() => {
                          setPickupInput('');
                          setPickup(null);
                          setIsPickupLiveGps(false);
                          setPickupSuggestions([]);
                        }}
                        className="text-zinc-500 hover:text-white cursor-pointer"
                        title="Clear pickup spot"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Selected Confirmation Pill */}
                {pickup && (
                  <div className="mt-1.5 flex items-center justify-between gap-1.5 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2.5 py-1 rounded-lg">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate font-medium">{pickup.formatted}</span>
                    </div>
                    {isPickupLiveGps ? (
                      <span className="shrink-0 text-[10px] font-mono font-bold text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded">
                        GPS Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResetToLiveGpsPickup}
                        className="shrink-0 text-[10px] font-mono text-zinc-400 hover:text-amber-300 underline cursor-pointer"
                      >
                        Use GPS
                      </button>
                    )}
                  </div>
                )}

                {/* Autocomplete Suggestions Dropdown for Pickup */}
                {isPickupFocused && pickupSuggestions.length > 0 && !pickup && (
                  <div
                    id="pickup-suggestions-dropdown"
                    className="absolute z-50 left-0 right-0 mt-1.5 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
                  >
                    <div className="px-3 py-1.5 bg-zinc-950/90 border-b border-zinc-800 text-[10px] uppercase tracking-wider font-mono text-zinc-400 flex items-center justify-between">
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Suggested Pickups
                      </span>
                      <span>Bangladesh</span>
                    </div>
                    {pickupSuggestions.map((item, idx) => (
                      <button
                        key={`pickup-sug-${item.placeId || idx}`}
                        type="button"
                        onClick={() => handleSelectPickup(item)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-800 active:bg-zinc-700 border-b border-zinc-800/60 last:border-b-0 transition-colors flex items-start gap-3 cursor-pointer"
                      >
                        {renderItemIcon(item, false)}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-white truncate">
                            {item.addressLine1 || item.name || item.formatted.split(',')[0]}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {item.addressLine2 || item.formatted}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. DROP-OFF SPOT */}
              <div ref={dropoffContainerRef} className="relative pl-8 sm:pl-9 pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="absolute left-2.5 sm:left-3.5 top-4.5 w-2.5 h-2.5 rounded-sm bg-red-400 ring-4 ring-red-400/20" />
                    <label
                      htmlFor="dropoff-input"
                      className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider"
                    >
                      Drop-off Destination
                    </label>
                  </div>

                  <span className="text-[11px] font-mono text-zinc-500">
                    64 Districts
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="dropoff-input"
                    type="text"
                    value={dropoffInput}
                    onChange={(e) => handleDropoffChange(e.target.value)}
                    onFocus={() => {
                      setIsDropoffFocused(true);
                      if (dropoffInput && dropoffSuggestions.length === 0 && !dropoff) {
                        handleDropoffChange(dropoffInput);
                      }
                    }}
                    placeholder="Search destination (e.g. Dhanmondi, Airport, Uttara)..."
                    autoComplete="off"
                    className="w-full pl-3.5 pr-10 py-3 bg-black/90 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/40 transition-all font-medium"
                  />

                  {/* Status Indicator */}
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
                    {isSearchingDropoff && (
                      <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                    )}
                    {dropoffInput && !isSearchingDropoff && (
                      <button
                        type="button"
                        onClick={() => {
                          setDropoffInput('');
                          setDropoff(null);
                          setDropoffSuggestions([]);
                        }}
                        className="text-zinc-500 hover:text-white cursor-pointer"
                        title="Clear destination"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Selected Confirmation Pill */}
                {dropoff && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-red-400 bg-red-950/40 border border-red-900/50 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span className="truncate font-medium">{dropoff.formatted}</span>
                  </div>
                )}

                {/* Autocomplete Suggestions Dropdown for Drop-off */}
                {isDropoffFocused && dropoffSuggestions.length > 0 && !dropoff && (
                  <div
                    id="dropoff-suggestions-dropdown"
                    className="absolute z-50 left-0 right-0 mt-1.5 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
                  >
                    <div className="px-3 py-1.5 bg-zinc-950/90 border-b border-zinc-800 text-[10px] uppercase tracking-wider font-mono text-zinc-400 flex items-center justify-between">
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        Suggested Destinations
                      </span>
                      <span>Bangladesh</span>
                    </div>
                    {dropoffSuggestions.map((item, idx) => (
                      <button
                        key={`dropoff-sug-${item.placeId || idx}`}
                        type="button"
                        onClick={() => handleSelectDropoff(item)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-800 active:bg-zinc-700 border-b border-zinc-800/60 last:border-b-0 transition-colors flex items-start gap-3 cursor-pointer"
                      >
                        {renderItemIcon(item, true)}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-white truncate">
                            {item.addressLine1 || item.name || item.formatted.split(',')[0]}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {item.addressLine2 || item.formatted}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BEEGO RIDE TIER SELECTOR */}
          {approxDistanceKm && (
            <div className="mt-6 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Select Ride Tier
                </span>
                <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Est. {approxDistanceKm} km</span>
                </span>
              </div>

              {/* Notice that only Moto is available */}
              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <Bike className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Only <strong>Beego Moto</strong> is currently active & ready for dispatch.</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Beego Moto - ACTIVE & AVAILABLE */}
                <button
                  id="tier-beego-moto-btn"
                  type="button"
                  onClick={() => setSelectedTier('moto')}
                  className="p-3 rounded-2xl text-left border transition-all cursor-pointer relative flex flex-col justify-between bg-zinc-900 border-amber-400 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Bike className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-400 text-black uppercase">
                      ACTIVE
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-1">
                      <span>Beego Moto</span>
                    </div>
                    <div className="text-[10px] text-amber-400 mt-0.5 font-semibold leading-tight">Instant Bike</div>
                    <div className="text-sm font-black text-amber-400 mt-1.5 font-mono">
                      ৳{Math.round(approxDistanceKm * 70)}
                    </div>
                  </div>
                </button>

                {/* Beego Select - FROZEN & TEMPORARILY UNAVAILABLE */}
                <div
                  id="tier-beego-select-btn"
                  className="p-3 rounded-2xl text-left border border-zinc-800/60 bg-zinc-950/60 opacity-60 cursor-not-allowed relative flex flex-col justify-between select-none"
                  title="Beego Select is temporarily frozen & unavailable"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-500 flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-tight">
                      Frozen
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-400">Beego Select</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5 leading-tight">Temporarily Unavailable</div>
                    <div className="text-xs font-mono text-zinc-500 mt-1.5 line-through">
                      ৳{Math.round(approxDistanceKm * 95)}
                    </div>
                  </div>
                </div>

                {/* Beego Sedan - FROZEN & TEMPORARILY UNAVAILABLE */}
                <div
                  id="tier-beego-sedan-btn"
                  className="p-3 rounded-2xl text-left border border-zinc-800/60 bg-zinc-950/60 opacity-60 cursor-not-allowed relative flex flex-col justify-between select-none"
                  title="Beego Sedan is temporarily frozen & unavailable"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-500 flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-tight">
                      Frozen
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-400">Beego Sedan</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5 leading-tight">Temporarily Unavailable</div>
                    <div className="text-xs font-mono text-zinc-500 mt-1.5 line-through">
                      ৳{Math.round(approxDistanceKm * 85)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Tier Perks Callout */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quickest transit across Dhaka traffic • Sanitized helmet provided</span>
                </span>
                <span className="font-mono text-amber-400 font-bold shrink-0 ml-2">
                  ৳70/km
                </span>
              </div>
            </div>
          )}

          {/* PAYMENT METHOD SELECTION */}
          <div className="mt-5 pt-4 border-t border-zinc-900">
            <PaymentMethodSelector
              selectedMethod={selectedPaymentMethod}
              onSelectMethod={(method) => {
                setSelectedPaymentMethod(method);
                setPaymentMethodError(false);
                setErrorMessage(null);
              }}
              isOpen={isPaymentDropdownOpen}
              onToggleOpen={() => setIsPaymentDropdownOpen((prev) => !prev)}
              requiredError={paymentMethodError}
            />
          </div>

          {/* OPTION 3: REQUEST FOR RIDE ACTION */}
          <div className="mt-4 pt-1">
            <button
              id="request-ride-button"
              type="button"
              onClick={() => {
                if (!pickup || !dropoff) {
                  setErrorMessage('Please select both pickup and drop-off spots.');
                  return;
                }
                if (!selectedPaymentMethod) {
                  setPaymentMethodError(true);
                  setIsPaymentDropdownOpen(true);
                  setErrorMessage('Please select your payment method (Cash, bKash, Nagad, or Rocket) to request the ride.');
                  return;
                }
                onRequestRide(selectedPaymentMethod);
              }}
              disabled={isLoadingRoute}
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                isReadyToRequest && !isLoadingRoute
                  ? 'bg-amber-400 text-black hover:bg-amber-300 active:scale-[0.99] shadow-xl shadow-amber-400/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {isLoadingRoute ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Dispatching to Nearby Captains...</span>
                </>
              ) : isReadyToRequest ? (
                <>
                  <span>
                    Request Beego Moto
                    {approxDistanceKm ? ` • ৳${Math.round(approxDistanceKm * 70)}` : ''}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : !pickup || !dropoff ? (
                <>
                  <span>Select Route to Request</span>
                  <ArrowRight className="w-4 h-4 opacity-40" />
                </>
              ) : (
                <>
                  <span className="text-amber-400 font-semibold">Select Payment Method to Request</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-zinc-500 mt-2.5 font-mono">
              {!pickup && !dropoff
                ? 'Enter pickup & drop-off spots to start navigation'
                : !pickup
                ? 'Select your pickup spot'
                : !dropoff
                ? 'Select your destination'
                : !selectedPaymentMethod
                ? 'Choose Cash, bKash, Nagad, or Rocket'
                : 'Ready for instant dispatch'}
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Map with Dual Arrow Pin & Geolocation */}
      <div className="lg:col-span-7 h-[620px] w-full sticky top-4">
        <InteractiveLocationMap
          apiKey={apiKey}
          pickup={pickup}
          onPickupChange={(point) => {
            setPickup(point);
            setPickupInput(point.formatted);
            setIsPickupLiveGps(false);
            setPickupSuggestions([]);
            setIsPickupFocused(false);
            setErrorMessage(null);
          }}
          dropoff={dropoff}
          onDropoffChange={(point) => {
            setDropoff(point);
            setDropoffInput(point.formatted);
            setDropoffSuggestions([]);
            setIsDropoffFocused(false);
            setErrorMessage(null);
          }}
          pinMode={pinMode}
          onPinModeChange={setPinMode}
          routeData={routeData || null}
          isLocating={isLocating}
          onLocateUser={handleResetToLiveGpsPickup}
          userLiveGps={userLiveGps}
        />
      </div>
    </div>
  )}
</div>
  );
};
