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
  ArrowLeft,
  Banknote,
  Radio,
  User,
  ArrowDownUp,
  Bike,
  ShieldCheck,
  Lock,
  Compass,
  Sparkles,
  Zap,
  Eye,
  Phone,
} from 'lucide-react';
import { LocationPoint, RideRequest, RouteData, PaymentMethod } from '../types';
import { searchAddress, reverseGeocode, calculateRoute, DEFAULT_GEOAPIFY_KEY } from '../services/geoapify';
import { RATE_PER_KM_TAKA, updatePassengerLiveLocation } from '../services/rideSync';
import { searchBangladeshDistricts, isLocationInBangladesh } from '../data/bangladeshDistricts';
import { requestLiveCoordinates, watchLiveCoordinates } from '../services/geolocation';
import { InteractiveLocationMap, PinMode } from './InteractiveLocationMap';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import {
  getStoredDescopeUser,
  saveStoredDescopeUser,
  normalizeBangladeshPhone,
  isValidBangladeshPhone,
} from '../services/descopeService';

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
  passengerId,
  pickup,
  setPickup,
  dropoff,
  setDropoff,
  routeData: externalRouteData,
  onRequestRide,
  isLoadingRoute,
  errorMessage,
  setErrorMessage,
  activeRide,
  onCancelRide,
  onBackToRoles,
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
  const [isSearchCardCollapsed, setIsSearchCardCollapsed] = useState(false);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  const [userLiveGps, setUserLiveGps] = useState<{ lat: number; lon: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isPickupLiveGps, setIsPickupLiveGps] = useState(true);
  const autoLocatedRef = useRef(false);

  // Mandatory Contact Phone Number for Captain Dispatch
  const [contactPhone, setContactPhone] = useState<string>(() => {
    const user = getStoredDescopeUser();
    return user?.phone ? user.phone.replace(/^\+880/, '0') : '';
  });

  // Live Auto-Route calculation whenever pickup or dropoff change
  const [autoRouteData, setAutoRouteData] = useState<RouteData | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Abort controllers for debouncing search
  const pickupAbortRef = useRef<AbortController | null>(null);
  const dropoffAbortRef = useRef<AbortController | null>(null);
  const pickupDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropoffDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const pickupContainerRef = useRef<HTMLDivElement>(null);
  const dropoffContainerRef = useRef<HTMLDivElement>(null);

  // 1. Automatic Live GPS detection on entering dashboard
  useEffect(() => {
    let isMounted = true;

    const autoDetectGps = async () => {
      setIsLocating(true);
      try {
        const res = await requestLiveCoordinates();
        if (!isMounted) return;
        
        // Only auto-populate pickup if authentic live hardware/device GPS is confirmed in Bangladesh
        if (res.isRealGps) {
          setUserLiveGps({ lat: res.lat, lon: res.lon, accuracy: res.accuracy });
          updatePassengerLiveLocation({ lat: res.lat, lon: res.lon });

          if (!pickup) {
            const point = await reverseGeocode(res.lat, res.lon, activeKey);
            if (!isMounted) return;
            setPickup(point);
            setPickupInput(point.formatted);
            setIsPickupLiveGps(true);
          }
        }
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

  // 2. Synchronize inputs when pickup or dropoff changes
  useEffect(() => {
    if (pickup) {
      setPickupInput(pickup.formatted);
    } else {
      setPickupInput('');
    }
  }, [pickup]);

  useEffect(() => {
    if (dropoff) {
      setDropoffInput(dropoff.formatted);
    } else {
      setDropoffInput('');
    }
  }, [dropoff]);

  // Purge route, destination, and inputs immediately if ride is cancelled or declined
  useEffect(() => {
    if (activeRide?.status === 'cancelled' || activeRide?.status === 'declined') {
      setPickup(null);
      setPickupInput('');
      setDropoff(null);
      setDropoffInput('');
      setAutoRouteData(null);
      setIsSearchCardCollapsed(false);
    }
  }, [activeRide?.status, setPickup, setDropoff]);

  // 3. Auto-calculate route whenever both pickup and dropoff are valid
  useEffect(() => {
    if (!pickup || !dropoff) {
      setAutoRouteData(null);
      return;
    }

    let isCurrent = true;
    setIsCalculatingRoute(true);

    calculateRoute(pickup, dropoff, activeKey)
      .then((data) => {
        if (isCurrent) {
          setAutoRouteData(data);
          setIsCalculatingRoute(false);
        }
      })
      .catch((err) => {
        console.warn('Live route calculation warning:', err);
        if (isCurrent) setIsCalculatingRoute(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [pickup, dropoff, activeKey]);

  // Active route is either the auto-calculated one or external
  const currentRouteData = autoRouteData || externalRouteData || null;

  // Approximate straight-line distance if route is still computing
  const computedDistanceKm = React.useMemo(() => {
    if (currentRouteData && currentRouteData.distanceMeters > 0) {
      return Number((currentRouteData.distanceMeters / 1000).toFixed(1));
    }
    if (!pickup || !dropoff) return null;
    const R = 6371;
    const dLat = ((dropoff.lat - pickup.lat) * Math.PI) / 180;
    const dLon = ((dropoff.lon - pickup.lon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pickup.lat * Math.PI) / 180) *
        Math.cos((dropoff.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c * 1.35;
    return Math.max(0.5, Number(d.toFixed(1)));
  }, [currentRouteData, pickup, dropoff]);

  const computedDurationMins = React.useMemo(() => {
    if (currentRouteData && currentRouteData.timeSeconds > 0) {
      return Math.max(1, Math.round(currentRouteData.timeSeconds / 60));
    }
    if (computedDistanceKm) {
      return Math.max(3, Math.round(computedDistanceKm * 2.5));
    }
    return null;
  }, [currentRouteData, computedDistanceKm]);

  const computedFareTaka = computedDistanceKm
    ? Math.max(70, Math.round(computedDistanceKm * RATE_PER_KM_TAKA))
    : null;

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
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not detect device GPS coordinates.');
    } finally {
      setIsLocating(false);
    }
  };

  // Real-time search for Pickup Spot
  const handlePickupChange = (value: string) => {
    setPickupInput(value);
    setErrorMessage(null);

    if (pickup && value !== pickup.formatted) {
      setPickup(null);
    }

    if (pickupDebounceRef.current) clearTimeout(pickupDebounceRef.current);
    if (pickupAbortRef.current) pickupAbortRef.current.abort();

    const trimmed = value.trim();
    if (!trimmed) {
      setPickupSuggestions([]);
      setIsSearchingPickup(false);
      return;
    }

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
        if (err.name !== 'AbortError' && instant.length === 0) {
          setErrorMessage(err.message || 'Error fetching Bangladesh locations');
        }
      } finally {
        setIsSearchingPickup(false);
      }
    }, 120);
  };

  // Real-time search for Drop-off Spot
  const handleDropoffChange = (value: string) => {
    setDropoffInput(value);
    setErrorMessage(null);

    if (dropoff && value !== dropoff.formatted) {
      setDropoff(null);
    }

    if (dropoffDebounceRef.current) clearTimeout(dropoffDebounceRef.current);
    if (dropoffAbortRef.current) dropoffAbortRef.current.abort();

    const trimmed = value.trim();
    if (!trimmed) {
      setDropoffSuggestions([]);
      setIsSearchingDropoff(false);
      return;
    }

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
        if (err.name !== 'AbortError' && instant.length === 0) {
          setErrorMessage(err.message || 'Error fetching Bangladesh locations');
        }
      } finally {
        setIsSearchingDropoff(false);
      }
    }, 120);
  };

  const handleSelectPickup = (item: LocationPoint) => {
    setPickup(item);
    setPickupInput(item.formatted);
    setIsPickupLiveGps(false);
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
    setIsSearchCardCollapsed(true);
  };

  // Switch Pickup and Drop-off locations
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

  const renderItemIcon = (item: LocationPoint, isDrop: boolean) => {
    if (item.resultType === 'district' || item.category === 'district') {
      return (
        <span className="w-5 h-5 rounded-md bg-[#FFF9E6] border border-[#F5C518]/50 flex items-center justify-center text-[10px] font-black text-[#E6A800] shrink-0 mt-0.5">
          BD
        </span>
      );
    }
    const cat = (item.category || item.resultType || '').toLowerCase();
    if (cat.includes('airport') || cat.includes('flight')) {
      return <Plane className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />;
    }
    if (cat.includes('station') || cat.includes('rail') || cat.includes('metro')) {
      return <Train className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
    }
    if (cat.includes('building') || cat.includes('commercial') || cat.includes('amenity')) {
      return <Building2 className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />;
    }
    return isDrop ? (
      <Navigation className="w-4 h-4 text-[#1A1A1A] shrink-0 mt-0.5" />
    ) : (
      <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
    );
  };

  const isRideOngoing =
    activeRide &&
    (activeRide.status === 'requested' ||
      activeRide.status === 'accepted' ||
      activeRide.status === 'arrived_at_pickup');

  // If ride is active/ongoing, show status card centered
  if (isRideOngoing) {
    return (
      <div id="ride-request-container" className="w-full h-full min-h-[600px] flex-1 flex flex-col p-4 bg-[#F8F9FA] justify-center items-center">
        <div id="passenger-active-ride-card" className="bg-white border border-zinc-200/90 rounded-[32px] p-6 sm:p-8 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.07)] space-y-5 animate-in fade-in text-center max-w-md w-full">
          {activeRide?.status === 'requested' && (
            <div className="py-2">
              <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-[#F5C518]/25 animate-ping opacity-75" />
                <span className="relative w-16 h-16 rounded-full bg-[#FFF9E6] border-2 border-[#F5C518] flex items-center justify-center text-[#E6A800] shadow-sm">
                  <Radio className="w-8 h-8 animate-pulse text-[#E6A800]" />
                </span>
              </div>

              <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-[#E6A800] bg-[#FFF9E6] px-3 py-1 rounded-full border border-[#F5C518]/30 mb-2">
                Broadcasted to nearby captains
              </span>

              <h2 className="text-xl font-black text-[#1A1A1A] mb-1">
                Finding your captain...
              </h2>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto mb-5 leading-relaxed font-medium">
                Nearby BeeGo captains have received your request and will accept in a few seconds.
              </p>

              <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-zinc-200/80 mb-4 max-w-sm mx-auto">
                <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Estimated Total Fare</div>
                <div className="text-3xl font-black text-[#1A1A1A] mt-1 font-mono flex items-center justify-center gap-1.5">
                  <Banknote className="w-6 h-6 text-[#E6A800]" />
                  <span>৳{activeRide.fareTaka}</span>
                  <span className="text-xs text-zinc-400 font-sans font-medium">Cash</span>
                </div>
                <div className="text-xs text-zinc-500 mt-1 font-medium">
                  {activeRide.distanceKm} km • Flat rate: ৳{RATE_PER_KM_TAKA}/km
                </div>
              </div>

              <div className="space-y-2.5 text-left p-3.5 bg-white rounded-2xl border border-zinc-200/90 text-xs mb-5 max-w-sm mx-auto shadow-xs">
                <div className="flex items-start gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1 truncate">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase font-mono block">Pickup Spot</span>
                    <span className="text-zinc-800 font-semibold truncate block">{activeRide.pickup.formatted}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 pt-2 border-t border-zinc-100">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#1A1A1A] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1 truncate">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase font-mono block">Drop-off Destination</span>
                    <span className="text-zinc-800 font-semibold truncate block">{activeRide.dropoff.formatted}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPickup(null);
                  setPickupInput('');
                  setDropoff(null);
                  setDropoffInput('');
                  setAutoRouteData(null);
                  setIsSearchCardCollapsed(false);
                  onCancelRide();
                }}
                className="w-full max-w-sm mx-auto py-3 px-5 rounded-2xl text-xs font-bold text-zinc-600 hover:text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 transition-all cursor-pointer active:scale-95 block"
              >
                Cancel Ride Request
              </button>
            </div>
          )}

          {activeRide?.status === 'accepted' && (
            <div className="py-2 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-3 text-emerald-600 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono font-bold mb-2">
                Captain Assigned: {activeRide.driverDetails?.name || activeRide.riderId || 'Voltx Captain'}
              </div>

              <h2 className="text-xl font-black text-[#1A1A1A] mb-1">
                Captain Accepted Your Request!
              </h2>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-5 leading-relaxed font-medium">
                Your driver is currently heading to your pickup spot. Please wait at:
              </p>

              <div className="p-4 bg-[#F8F9FA] border border-zinc-200/90 rounded-2xl text-left max-w-sm mx-auto mb-5">
                <div className="text-[10px] uppercase tracking-wider text-[#E6A800] font-bold mb-1 flex items-center gap-1.5 font-mono">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Pickup Spot:</span>
                </div>
                <div className="text-sm font-bold text-[#1A1A1A]">
                  {activeRide.pickup.addressLine1 || activeRide.pickup.formatted.split(',')[0]}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {activeRide.pickup.addressLine2 || activeRide.pickup.formatted}
                </div>
              </div>

              <div className="text-xs text-zinc-600 flex items-center justify-center gap-2 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E6A800]" />
                <span>Live route sync active • Fare: ৳{activeRide.fareTaka} Cash</span>
              </div>
            </div>
          )}

          {activeRide?.status === 'arrived_at_pickup' && (
            <div className="py-2 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-[#FFF9E6] border-2 border-[#F5C518] text-[#E6A800] flex items-center justify-center mx-auto mb-3 shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <span className="inline-block px-3 py-1 rounded-full bg-[#FFF9E6] border border-[#F5C518]/40 text-[#E6A800] text-xs font-bold uppercase tracking-wider mb-2">
                Captain Arrived!
              </span>

              <h2 className="text-2xl font-black text-[#1A1A1A] mb-1">
                Your Captain Has Arrived
              </h2>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-5 font-medium">
                Your driver is waiting at the pickup spot. Please meet your captain to begin the trip.
              </p>

              <div className="p-4 bg-[#F8F9FA] border border-zinc-200 rounded-2xl text-left max-w-sm mx-auto space-y-2 mb-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium">Destination:</span>
                  <span className="text-[#1A1A1A] font-bold truncate ml-2">
                    {activeRide.dropoff.addressLine1 || activeRide.dropoff.formatted.split(',')[0]}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-zinc-200">
                  <span className="text-zinc-500 font-medium">Total Price:</span>
                  <span className="text-base font-black text-[#E6A800] font-mono">৳{activeRide.fareTaka} Cash</span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 font-medium">
                Trip navigation will begin as soon as the captain starts driving.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // UBER / CAREEM MAP-FIRST EXPERIENCE
  return (
    <div
      id="ride-request-container"
      className="relative w-full h-full min-h-[100dvh] sm:min-h-[880px] flex-1 flex flex-col overflow-hidden bg-[#F8F9FA] select-none"
    >
      {/* 1. FULL-BLEED INTERACTIVE MAP CANVAS (FIRST THING VISIBLE) */}
      <div className="absolute inset-0 w-full h-full z-0">
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
            setIsSearchCardCollapsed(true);
          }}
          routeData={currentRouteData}
          isLocating={isLocating}
          onLocateUser={handleResetToLiveGpsPickup}
          userLiveGps={userLiveGps}
        />
      </div>

      {/* 2. TOP FLOATING ROUTE BAR (Collapsed or Expanded) */}
      <div className="absolute top-3.5 left-3 right-3 z-30 pointer-events-auto max-w-md mx-auto">
        {isSearchCardCollapsed && dropoff ? (
          <div className="bg-white/95 backdrop-blur-xl border border-zinc-200/90 rounded-2xl px-3.5 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              type="button"
              onClick={onBackToRoles}
              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div
              onClick={() => setIsSearchCardCollapsed(false)}
              className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity px-1"
              title="Click to modify route spots"
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-zinc-900 truncate">
                  {pickup?.addressLine1 || pickup?.formatted?.split(',')[0] || 'Pickup'}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="w-2 h-2 rounded-xs bg-[#1A1A1A] rotate-45 shrink-0" />
                <span className="text-xs font-bold text-zinc-900 truncate">
                  {dropoff?.addressLine1 || dropoff?.formatted?.split(',')[0] || 'Destination'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSearchCardCollapsed(false)}
              className="px-2.5 py-1 rounded-xl bg-[#FFF9E6] hover:bg-[#F5C518]/20 border border-[#F5C518]/50 text-[#1A1A1A] text-[11px] font-black uppercase tracking-wider shrink-0 cursor-pointer active:scale-95 transition-all"
            >
              Edit
            </button>
          </div>
        ) : (
          <div
            id="ride-request-card"
            className="bg-white/95 backdrop-blur-2xl border border-zinc-200/80 rounded-[30px] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04)] relative ring-1 ring-black/[0.03] transition-all animate-in fade-in duration-200 select-none"
          >
            {/* Header: Back Button, Brand Status Pill & View Map */}
            <div className="flex items-center justify-between mb-3 px-0.5">
              <button
                type="button"
                onClick={onBackToRoles}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-black text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50/80 border border-amber-200/60 text-zinc-800 text-[11px] font-bold shadow-2xs">
                <Zap className="w-3.5 h-3.5 text-[#E6A800] fill-[#F5C518]" />
                <span className="tracking-tight">EV Ride Dispatch</span>
              </div>

              {dropoff ? (
                <button
                  type="button"
                  onClick={() => setIsSearchCardCollapsed(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-zinc-800 px-2.5 py-1 rounded-full bg-[#FFF9E6] border border-[#F5C518]/50 hover:bg-[#F5C518]/25 transition-colors cursor-pointer shadow-2xs active:scale-95"
                  title="Collapse and view map"
                >
                  <Eye className="w-3.5 h-3.5 text-[#E6A800]" />
                  <span>View Map</span>
                </button>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
                  Dhaka
                </span>
              )}
            </div>

            {/* Input fields container with vertical transit line & Swap */}
            <div className="relative space-y-2.5">
              {/* Vertical transit line connecting pickup and drop-off */}
              <div className="absolute left-[13px] top-[19px] bottom-[19px] w-0.5 bg-gradient-to-b from-emerald-500 via-amber-300 to-[#1A1A1A] pointer-events-none flex items-center justify-center z-10">
                <button
                  type="button"
                  onClick={handleSwitchLocations}
                  disabled={!pickup || !dropoff}
                  className="pointer-events-auto w-6.5 h-6.5 rounded-full bg-white hover:bg-[#FFF9E6] border border-zinc-200 hover:border-[#F5C518] shadow-md flex items-center justify-center transition-all cursor-pointer active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed group"
                  title="Swap pickup and drop-off"
                >
                  <ArrowDownUp className="w-3.5 h-3.5 text-[#E6A800] group-hover:rotate-180 transition-transform duration-300" />
                </button>
              </div>

              {/* INPUT 1: PICKUP SPOT */}
              <div ref={pickupContainerRef} className="relative pl-7">
                <div className="relative flex items-center bg-[#F8F9FA] hover:bg-white focus-within:bg-white border border-zinc-200/90 focus-within:border-[#F5C518] focus-within:ring-2 focus-within:ring-[#F5C518]/25 rounded-2xl transition-all shadow-2xs">
                  {/* Green Pickup Dot */}
                  <span className="absolute -left-5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0 z-20" />

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
                    placeholder="Pickup location in Dhaka / Bangladesh..."
                    autoComplete="off"
                    className="w-full pl-3 pr-20 py-2.5 bg-transparent text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                  />

                  {/* Right controls: GPS status badge / toggle or Clear */}
                  <div className="absolute right-2 flex items-center gap-1.5">
                    {isSearchingPickup && (
                      <Loader2 className="w-3.5 h-3.5 text-[#E6A800] animate-spin" />
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
                        className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors"
                        title="Clear pickup"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleResetToLiveGpsPickup}
                      disabled={isLocating}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                        isPickupLiveGps
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100'
                          : 'bg-zinc-100 text-zinc-500 hover:text-[#E6A800] hover:bg-amber-50'
                      }`}
                      title={isPickupLiveGps ? 'GPS location active' : 'Use real-time GPS location'}
                    >
                      <LocateFixed className={`w-3 h-3 ${isPickupLiveGps ? 'text-emerald-600 animate-pulse' : 'text-zinc-400'}`} />
                      <span>{isPickupLiveGps ? 'GPS' : 'Locate'}</span>
                    </button>
                  </div>
                </div>

                {/* Autocomplete Suggestions Dropdown for Pickup */}
                {isPickupFocused && pickupSuggestions.length > 0 && !pickup && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white/98 backdrop-blur-xl border border-zinc-200/90 rounded-2xl shadow-[0_20px_48px_rgba(0,0,0,0.18)] overflow-hidden max-h-56 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-1.5 bg-gradient-to-r from-zinc-50 to-amber-50/40 border-b border-zinc-100 text-[10px] uppercase font-mono font-bold text-zinc-500 flex items-center justify-between">
                      <span className="text-[#E6A800] flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Suggested Pickups
                      </span>
                      <span>Bangladesh</span>
                    </div>
                    {pickupSuggestions.map((item, idx) => (
                      <button
                        key={`pickup-sug-${item.placeId || idx}`}
                        type="button"
                        onClick={() => handleSelectPickup(item)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-[#FFFDF5] border-b border-zinc-100 last:border-b-0 transition-colors flex items-start gap-2.5 cursor-pointer group"
                      >
                        {renderItemIcon(item, false)}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[#1A1A1A] group-hover:text-[#E6A800] transition-colors truncate">
                            {item.addressLine1 || item.name || item.formatted.split(',')[0]}
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                            {item.addressLine2 || item.formatted}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* INPUT 2: DROP-OFF DESTINATION */}
              <div ref={dropoffContainerRef} className="relative pl-7">
                <div className="relative flex items-center bg-[#F8F9FA] hover:bg-white focus-within:bg-white border border-zinc-200/90 focus-within:border-[#F5C518] focus-within:ring-2 focus-within:ring-[#F5C518]/25 rounded-2xl transition-all shadow-2xs">
                  {/* Black Destination Diamond */}
                  <span className="absolute -left-5 w-3 h-3 rounded-xs bg-[#1A1A1A] ring-4 ring-zinc-200 shrink-0 transform rotate-45 z-20" />

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
                    placeholder="Where to? (e.g. Gulshan, Airport, Dhanmondi)..."
                    autoComplete="off"
                    className="w-full pl-3 pr-12 py-2.5 bg-transparent text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                  />

                  <div className="absolute right-2 flex items-center gap-1">
                    {isSearchingDropoff && (
                      <Loader2 className="w-3.5 h-3.5 text-[#E6A800] animate-spin" />
                    )}
                    {dropoffInput && !isSearchingDropoff && (
                      <button
                        type="button"
                        onClick={() => {
                          setDropoffInput('');
                          setDropoff(null);
                          setDropoffSuggestions([]);
                          setIsSearchCardCollapsed(false);
                        }}
                        className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors"
                        title="Clear destination"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Autocomplete Suggestions Dropdown for Drop-off */}
                {isDropoffFocused && dropoffSuggestions.length > 0 && !dropoff && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white/98 backdrop-blur-xl border border-zinc-200/90 rounded-2xl shadow-[0_20px_48px_rgba(0,0,0,0.18)] overflow-hidden max-h-56 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-1.5 bg-gradient-to-r from-zinc-50 to-amber-50/40 border-b border-zinc-100 text-[10px] uppercase font-mono font-bold text-zinc-500 flex items-center justify-between">
                      <span className="text-[#E6A800] flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        Suggested Destinations
                      </span>
                      <span>Dhaka & Beyond</span>
                    </div>
                    {dropoffSuggestions.map((item, idx) => (
                      <button
                        key={`dropoff-sug-${item.placeId || idx}`}
                        type="button"
                        onClick={() => handleSelectDropoff(item)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-[#FFFDF5] border-b border-zinc-100 last:border-b-0 transition-colors flex items-start gap-2.5 cursor-pointer group"
                      >
                        {renderItemIcon(item, true)}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[#1A1A1A] group-hover:text-[#E6A800] transition-colors truncate">
                            {item.addressLine1 || item.name || item.formatted.split(',')[0]}
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                            {item.addressLine2 || item.formatted}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick 1-Tap Popular Dhaka Destination Pills (Shown when destination is empty) */}
            {!dropoff && (
              <div className="pt-2.5 mt-1">
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#E6A800]" />
                    Quick Destinations
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {[
                    {
                      name: 'Gulshan 2',
                      lat: 23.7925,
                      lon: 90.4078,
                      formatted: 'Gulshan 2 Circle, Dhaka',
                      addressLine1: 'Gulshan 2 Circle',
                      addressLine2: 'North Commercial Hub, Dhaka',
                    },
                    {
                      name: 'Banani 11',
                      lat: 23.7937,
                      lon: 90.4042,
                      formatted: 'Banani Road 11, Dhaka',
                      addressLine1: 'Banani Road 11',
                      addressLine2: 'Road 11 Lifestyle Hub, Dhaka',
                    },
                    {
                      name: 'Airport T1',
                      lat: 23.8433,
                      lon: 90.4029,
                      formatted: 'Hazrat Shahjalal Int. Airport Terminal 1, Dhaka',
                      addressLine1: 'Airport Terminal 1',
                      addressLine2: 'Uttara, Dhaka',
                    },
                    {
                      name: 'Dhanmondi 27',
                      lat: 23.7538,
                      lon: 90.3768,
                      formatted: 'Dhanmondi 27 Satmasjid Road, Dhaka',
                      addressLine1: 'Dhanmondi 27',
                      addressLine2: 'Satmasjid Road, Dhaka',
                    },
                  ].map((spot) => (
                    <button
                      key={spot.name}
                      type="button"
                      onClick={() => handleSelectDropoff(spot)}
                      className="shrink-0 px-2.5 py-1 rounded-xl bg-zinc-100 hover:bg-[#FFF9E6] border border-zinc-200/80 hover:border-[#F5C518]/60 text-zinc-700 hover:text-black text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                    >
                      <MapPin className="w-3 h-3 text-[#E6A800]" />
                      <span>{spot.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Micro hint & Route status footer */}
            <div className="pt-2 mt-2.5 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518]" />
                <span>Tip: Drag pins or tap map to relocate spots</span>
              </span>
              {isCalculatingRoute && (
                <span className="text-[#E6A800] font-bold flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Updating electric route...
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. ERROR MESSAGE TOAST */}
      {errorMessage && (
        <div className="absolute top-24 left-3 right-3 z-40 max-w-md mx-auto p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 shadow-lg animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. BOTTOM PEEK CHIP (When Destination is NOT Yet Set) */}
      {!dropoff && (
        <div className="fixed sm:absolute bottom-5 left-4 right-4 z-30 pointer-events-none flex justify-center">
          <div className="bg-white/95 backdrop-blur-xl border border-zinc-200/90 px-4 py-2 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex items-center gap-2 animate-in fade-in duration-300">
            <span className="w-2 h-2 rounded-full bg-[#F5C518] animate-pulse" />
            <span className="text-xs font-bold text-zinc-700">
              Tap map or search above to select destination
            </span>
          </div>
        </div>
      )}

      {/* 5. LUXURY BOTTOM SLIDE-UP SHEET (When Destination IS Set) */}
      {dropoff && (
        <div className="fixed sm:absolute bottom-0 sm:bottom-4 left-0 right-0 sm:left-4 sm:right-4 z-40 pointer-events-auto max-w-md mx-auto">
          <div className="bg-white/98 backdrop-blur-2xl border-t sm:border border-zinc-200/90 rounded-t-[32px] sm:rounded-[32px] shadow-[0_-16px_48px_rgba(0,0,0,0.16)] flex flex-col max-h-[min(500px,68dvh)] overflow-hidden animate-in slide-in-from-bottom-6 fade-in duration-300">
            {/* Grab pill */}
            <div className="pt-2 pb-1 flex justify-center shrink-0">
              <div className="w-12 h-1 bg-zinc-300 rounded-full" />
            </div>

            {/* Scrollable sheet body with safe padding */}
            <div className="overflow-y-auto overscroll-contain px-4 sm:px-5 pb-5 pt-1 space-y-3">
              {/* Route Summary Pill */}
              <div className="flex items-center justify-between py-2 px-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#FFF9E6] border border-[#F5C518]/50 text-[#E6A800] flex items-center justify-center shrink-0">
                    <Compass className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="font-black text-[#1A1A1A]">~{computedDistanceKm || '3.5'} km</span>
                    <span className="text-zinc-500 text-[11px] ml-1.5">• ~{computedDurationMins || '12'} min ride</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Fastest Route
                  </span>
                </div>
              </div>

              {/* VEHICLE TIER: BEE MOTO */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FFFDF5] to-[#FFF9E6] border-2 border-[#F5C518] shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#F5C518] text-black flex items-center justify-center shadow-xs shrink-0">
                    <Bike className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[#1A1A1A]">Bee Moto</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-zinc-900 text-[#F5C518] uppercase tracking-wider">
                        Active
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-600 block mt-0.5 font-medium">
                      Fast electric bike • Captain ~3m away • Helmet provided
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-black text-[#1A1A1A] font-mono tracking-tight">
                    {computedFareTaka ? `৳${computedFareTaka}` : `৳70/km`}
                  </div>
                  <span className="text-[10px] text-[#E6A800] font-bold block uppercase tracking-wider">
                    Flat Rate
                  </span>
                </div>
              </div>

              {/* PASSENGER CONTACT DETAILS: PHONE NUMBER (Replaces Cash Selector) */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/90 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-800">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#E6A800]" />
                    <span>Passenger Contact Details <span className="text-rose-500">*</span></span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">Shared with Captain</span>
                </div>

                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1 text-zinc-600 font-mono text-xs font-bold">
                    <span>🇧🇩</span>
                    <span>+880</span>
                  </div>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => {
                      setContactPhone(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="1712345678"
                    required
                    className="w-full pl-20 pr-3 py-2.5 rounded-xl bg-white border border-zinc-200 focus:border-[#F5C518] focus:outline-none text-xs font-mono font-bold text-black transition-colors shadow-2xs"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 font-medium">
                  Your captain will call this number to coordinate arrival and pickup.
                </p>
              </div>

              {/* REQUEST ACTION BUTTON */}
              <button
                id="request-ride-button"
                type="button"
                onClick={() => {
                  if (!pickup || !dropoff) {
                    setErrorMessage('Please select both pickup and destination spots on the map.');
                    return;
                  }
                  const cleanPhone = contactPhone.trim();
                  if (!cleanPhone) {
                    setErrorMessage('Please enter your phone number so your captain can call you upon arrival.');
                    return;
                  }
                  const normalizedPhone = normalizeBangladeshPhone(cleanPhone);
                  if (!isValidBangladeshPhone(normalizedPhone)) {
                    setErrorMessage('Please enter a valid Bangladesh mobile number (e.g. 01712345678).');
                    return;
                  }
                  // Sync into stored user profile
                  const currentUser = getStoredDescopeUser();
                  if (currentUser) {
                    saveStoredDescopeUser({ ...currentUser, phone: normalizedPhone });
                  }
                  onRequestRide(selectedPaymentMethod);
                }}
                disabled={isLoadingRoute || isCalculatingRoute}
                className="w-full py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer bg-[#F5C518] text-black hover:bg-[#E6A800] active:scale-[0.98] shadow-lg shadow-amber-400/25 disabled:opacity-50"
              >
                {isLoadingRoute || isCalculatingRoute ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>{isLoadingRoute ? 'Dispatching Captain...' : 'Calculating Navigation...'}</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Bee Moto • ৳{computedFareTaka || 70}</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
