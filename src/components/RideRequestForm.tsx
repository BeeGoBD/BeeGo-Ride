import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Key,
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
} from 'lucide-react';
import { LocationPoint, RideRequest, RouteData } from '../types';
import { searchAddress, reverseGeocode, DEFAULT_GEOAPIFY_KEY } from '../services/geoapify';
import { RATE_PER_KM_TAKA, updatePassengerLiveLocation } from '../services/rideSync';
import { searchBangladeshDistricts } from '../data/bangladeshDistricts';
import { requestLiveCoordinates, watchLiveCoordinates } from '../services/geolocation';
import { InteractiveLocationMap, PinMode } from './InteractiveLocationMap';

interface RideRequestFormProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  passengerId: string;
  pickup: LocationPoint | null;
  setPickup: (point: LocationPoint | null) => void;
  dropoff: LocationPoint | null;
  setDropoff: (point: LocationPoint | null) => void;
  routeData?: RouteData | null;
  onRequestRide: () => void;
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
  const [userLiveGps, setUserLiveGps] = useState<{ lat: number; lon: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isPickupLiveGps, setIsPickupLiveGps] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(activeKey);
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

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempApiKey.trim()) {
      setErrorMessage('Please enter a valid Geoapify API key.');
      return;
    }
    onApiKeyChange(tempApiKey.trim());
    setShowKeyModal(false);
    setErrorMessage(null);
  };

  const isReadyToRequest = Boolean(pickup && dropoff);

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
        <span className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-black text-emerald-400 shrink-0 mt-0.5" title="Bangladesh District">
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
      <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
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
      className={`w-full mx-auto px-4 py-4 ${isRideOngoing ? 'max-w-xl' : 'max-w-7xl'}`}
    >
      {/* Top Header with Roles, Passenger ID, and Switcher */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBackToRoles}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Roles</span>
          </button>

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-300" />
            <span className="font-mono text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
              {passengerId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSwitchToRider}
            className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium"
            title="Switch to rider in this view"
          >
            Switch to Rider
          </button>

          <button
            id="api-settings-button"
            type="button"
            onClick={() => setShowKeyModal(!showKeyModal)}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Geoapify API key settings"
          >
            <Key className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Optional Key Config Modal */}
      {showKeyModal && (
        <div id="api-key-panel" className="mb-6 p-4 rounded-xl bg-zinc-950 border border-zinc-800 animate-in fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-zinc-400" />
              Geoapify API Key
            </span>
            <button
              onClick={() => setShowKeyModal(false)}
              className="text-zinc-500 hover:text-white text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
          <form onSubmit={handleSaveKey} className="flex gap-2">
            <input
              id="geoapify-key-input"
              type="text"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="Geoapify API key"
              className="flex-1 px-3 py-2 text-xs bg-black border border-zinc-700 rounded-lg text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-white"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-white text-black rounded-lg hover:bg-zinc-200 cursor-pointer"
            >
              Save
            </button>
          </form>
        </div>
      )}

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
              <div className="w-16 h-16 rounded-full bg-zinc-900 border-2 border-emerald-500/60 flex items-center justify-center mx-auto mb-4 relative">
                <Radio className="w-7 h-7 text-emerald-400 animate-pulse" />
                <span className="absolute inset-0 rounded-full border border-emerald-500/30 animate-ping" />
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
                <div className="text-3xl font-black text-emerald-400 flex items-center justify-center gap-1">
                  <Banknote className="w-6 h-6 text-emerald-400" />
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
              <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-4 text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="inline-block px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-mono mb-2">
                Rider Assigned: {activeRide.riderId || 'Guest Rider'}
              </div>

              <h2 className="text-xl font-extrabold text-white mb-2">
                Rider Accepted Your Request!
              </h2>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-5 leading-relaxed">
                Your rider is currently heading to your pickup spot. Please wait at:
              </p>

              <div className="p-4 bg-black border border-emerald-900/50 rounded-xl text-left max-w-sm mx-auto mb-6">
                <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
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
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Rider is on the way • Fare: ৳{activeRide.fareTaka} Taka</span>
              </div>
            </div>
          )}

          {activeRide?.status === 'arrived_at_pickup' && (
            <div className="text-center py-6 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-black flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <span className="inline-block px-3 py-1 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
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
                  <span className="text-emerald-400 font-bold">৳{activeRide.fareTaka} Taka</span>
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
            <div id="ride-request-card" className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-2xl relative">
              <div className="mb-6">
                <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse inline-block" />
                  Ride Request
                </h2>
                <p className="text-xs text-zinc-400 mt-1 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Bangladesh Only • 64 Districts • ৳{RATE_PER_KM_TAKA}/km</span>
                </p>
              </div>

          <div className="space-y-5">
            {/* OPTION 1: PICKUP SPOT */}
            <div ref={pickupContainerRef} className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <label
                    htmlFor="pickup-input"
                    className="text-xs font-semibold text-zinc-300 uppercase tracking-wider"
                  >
                    1. Pickup Spot
                  </label>
                  {isPickupLiveGps && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Location (Default)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="current-location-btn"
                    type="button"
                    onClick={handleResetToLiveGpsPickup}
                    disabled={isLocating}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 font-semibold"
                    title="Detect and use your real-time live GPS location"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isLocating ? 'Detecting GPS...' : isPickupLiveGps ? 'At Live Location' : 'Use My Live Spot'}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                </div>

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
                  placeholder="Click to change or search Bangladesh pickup spot..."
                  autoComplete="off"
                  className="w-full pl-10 pr-10 py-3.5 bg-black border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/40 transition-all font-medium"
                />

                {/* Status Indicator */}
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center gap-1.5">
                  {isSearchingPickup && (
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
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
                <div className="mt-2 flex items-center justify-between gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2.5 py-1.5 rounded-lg">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate font-medium">Pickup: {pickup.formatted}</span>
                  </div>
                  {isPickupLiveGps ? (
                    <span className="shrink-0 text-[10px] font-bold text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded">
                      Live GPS
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResetToLiveGpsPickup}
                      className="shrink-0 text-[10px] text-zinc-400 hover:text-emerald-300 underline cursor-pointer"
                    >
                      Reset to Live GPS
                    </button>
                  )}
                </div>
              )}

              {/* Autocomplete Suggestions Dropdown for Pickup */}
              {isPickupFocused && pickupSuggestions.length > 0 && !pickup && (
                <div
                  id="pickup-suggestions-dropdown"
                  className="absolute z-50 left-0 right-0 mt-1.5 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
                >
                  <div className="px-3 py-1.5 bg-zinc-950/90 border-b border-zinc-800 text-[10px] uppercase tracking-wider font-semibold flex items-center justify-between">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Bangladesh Locations & 64 Districts
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">BD Only</span>
                  </div>
                  {pickupSuggestions.map((item, idx) => (
                    <button
                      key={`pickup-sug-${item.placeId || idx}`}
                      type="button"
                      onClick={() => handleSelectPickup(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-800/90 active:bg-zinc-700 border-b border-zinc-800/60 last:border-b-0 transition-colors flex items-start gap-3 cursor-pointer"
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

            {/* SWITCH PICKUP & DROP-OFF BUTTON */}
            <div className="flex items-center justify-center my-1.5">
              <button
                type="button"
                onClick={handleSwitchLocations}
                disabled={!pickup || !dropoff}
                className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 border border-zinc-700/80 text-zinc-300 hover:text-white transition-all text-xs font-semibold shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                title="Switch Pickup and Drop-off spots"
              >
                <ArrowDownUp className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-180 transition-transform duration-300" />
                <span>Switch Pickup & Drop-off</span>
              </button>
            </div>

            {/* OPTION 2: DROP-OFF SPOT */}
            <div ref={dropoffContainerRef} className="relative">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="dropoff-input"
                  className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  2. Drop-off Spot (Destination in Bangladesh)
                </label>

                <span className="text-[11px] text-zinc-500 font-medium">
                  Type & select
                </span>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Navigation className="w-4 h-4 text-red-400" />
                </div>

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
                  placeholder="Type destination in Bangladesh (e.g. Dhanmondi, Uttara, Agrabad)..."
                  autoComplete="off"
                  className="w-full pl-10 pr-10 py-3.5 bg-black border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/40 transition-all font-medium"
                />

                {/* Status Indicator */}
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center gap-1.5">
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
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Selected Confirmation Pill */}
              {dropoff && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-red-400 bg-red-950/40 border border-red-900/50 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="truncate font-medium">Drop-off: {dropoff.formatted}</span>
                </div>
              )}

              {/* Autocomplete Suggestions Dropdown for Drop-off */}
              {isDropoffFocused && dropoffSuggestions.length > 0 && !dropoff && (
                <div
                  id="dropoff-suggestions-dropdown"
                  className="absolute z-50 left-0 right-0 mt-1.5 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
                >
                  <div className="px-3 py-1.5 bg-zinc-950/90 border-b border-zinc-800 text-[10px] uppercase tracking-wider font-semibold flex items-center justify-between">
                    <span className="text-red-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      Bangladesh Locations & 64 Districts
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">BD Only</span>
                  </div>
                  {dropoffSuggestions.map((item, idx) => (
                    <button
                      key={`dropoff-sug-${item.placeId || idx}`}
                      type="button"
                      onClick={() => handleSelectDropoff(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-800/90 active:bg-zinc-700 border-b border-zinc-800/60 last:border-b-0 transition-colors flex items-start gap-3 cursor-pointer"
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

          {/* REAL-TIME PRICE PREVIEW (1 KM = 70 TAKA) */}
          {approxDistanceKm && approxFareTaka && (
            <div className="mt-6 p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between animate-in fade-in">
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
                  Calculated Trip Fare
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Est. distance ~{approxDistanceKm} km • ৳70 Taka / km
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-emerald-400">
                  ৳{approxFareTaka} Taka
                </div>
              </div>
            </div>
          )}

          {/* OPTION 3: REQUEST FOR RIDE ACTION */}
          <div className="mt-6 pt-5 border-t border-zinc-900">
            <button
              id="request-ride-button"
              type="button"
              onClick={onRequestRide}
              disabled={!isReadyToRequest || isLoadingRoute}
              className={`w-full py-4 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                isReadyToRequest && !isLoadingRoute
                  ? 'bg-white text-black hover:bg-zinc-200 active:scale-[0.99] shadow-xl shadow-white/10'
                  : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800/60'
              }`}
            >
              {isLoadingRoute ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Calculating Route & Sending to Rider Dashboard...</span>
                </>
              ) : (
                <>
                  <span>Request for Ride</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-zinc-500 mt-3">
              {!pickup && !dropoff
                ? 'Enter pickup & drop-off spots to start navigation'
                : !pickup
                ? 'Select your pickup spot from suggestions'
                : !dropoff
                ? 'Select your drop-off spot from suggestions'
                : 'Click Request for Ride to notify the Rider Dashboard'}
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
