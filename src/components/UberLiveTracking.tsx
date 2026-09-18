import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Car,
  Bike,
  Navigation,
  MapPin,
  Clock,
  Milestone,
  CheckCircle,
  Phone,
  MessageSquare,
  AlertCircle,
  Shield,
  Star,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  ArrowLeft,
  Banknote,
  Compass,
} from 'lucide-react';
import { LocationPoint, RideRequest, RouteData, UserRole, LiveTrackingData } from '../types';
import {
  arriveAtPickupSpot,
  startTripToDestination,
  completeTrip,
  cancelRide,
  clearCurrentRide,
  updateLiveTracking,
  RATE_PER_KM_TAKA,
} from '../services/rideSync';
import { calculateRoute, DEFAULT_GEOAPIFY_KEY } from '../services/geoapify';

interface UberLiveTrackingProps {
  role: UserRole;
  activeRide: RideRequest;
  apiKey: string;
  onBackToRoles?: () => void;
  onSwitchRole?: () => void;
  onResetRide?: () => void;
}

export const UberLiveTracking: React.FC<UberLiveTrackingProps> = ({
  role,
  activeRide,
  apiKey,
  onBackToRoles,
  onSwitchRole,
  onResetRide,
}) => {
  const activeKey = apiKey.trim() || DEFAULT_GEOAPIFY_KEY;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const passengerMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const activeRoutePolylineRef = useRef<L.Polyline | null>(null);
  const traveledPolylineRef = useRef<L.Polyline | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Simulation speed: 1x, 2x, 4x
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Current coordinate index along active route
  const [coordIndex, setCoordIndex] = useState<number>(0);
  const [activeRouteCoords, setActiveRouteCoords] = useState<[number, number][]>([]);

  // Telemetry stats
  const [currentSpeed, setCurrentSpeed] = useState<number>(38);
  const [traveledKm, setTraveledKm] = useState<number>(0);
  const [remainingKm, setRemainingKm] = useState<number>(activeRide.distanceKm || 1);
  const [etaMinutes, setEtaMinutes] = useState<number>(activeRide.durationMinutes || 2);
  const [currentInstruction, setCurrentInstruction] = useState<string>('Follow designated route');

  // Contact modal state
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  const status = activeRide.status;
  const isEnRouteToPickup = status === 'accepted';
  const isAtPickup = status === 'arrived_at_pickup';
  const isInTransit = status === 'in_transit';
  const isCompleted = status === 'completed';

  // Driver details
  const driver = activeRide.driverDetails || {
    name: 'Md. Rafiqul Islam',
    vehicleModel: 'Yamaha FZ-S FI (Bike)',
    plateNumber: 'DHAKA METRO-HA 3912',
    rating: 4.9,
    phone: '+880 1712-345678',
  };

  // 1. Prepare Coordinates for current stage
  useEffect(() => {
    let coords: [number, number][] = [];

    if (isEnRouteToPickup) {
      // Driver navigating to passenger's pickup spot
      if (activeRide.pickupRouteData?.coordinates && activeRide.pickupRouteData.coordinates.length > 0) {
        coords = activeRide.pickupRouteData.coordinates;
      } else {
        // Fallback: realistic approach coordinates towards pickup
        const pLat = activeRide.pickup.lat;
        const pLon = activeRide.pickup.lon;
        const startLat = pLat + 0.015;
        const startLon = pLon - 0.012;
        const stepsCount = 50;
        coords = Array.from({ length: stepsCount }, (_, i) => {
          const ratio = i / (stepsCount - 1);
          // slight curvature
          const curve = Math.sin(ratio * Math.PI) * 0.003;
          return [startLat + (pLat - startLat) * ratio + curve, startLon + (pLon - startLon) * ratio - curve];
        });
      }
    } else if (isInTransit || isAtPickup || isCompleted) {
      // Driver navigating from pickup to drop-off
      if (activeRide.routeData?.coordinates && activeRide.routeData.coordinates.length > 0) {
        coords = activeRide.routeData.coordinates;
      } else {
        const pLat = activeRide.pickup.lat;
        const pLon = activeRide.pickup.lon;
        const dLat = activeRide.dropoff.lat;
        const dLon = activeRide.dropoff.lon;
        const stepsCount = 60;
        coords = Array.from({ length: stepsCount }, (_, i) => {
          const ratio = i / (stepsCount - 1);
          return [pLat + (dLat - pLat) * ratio, pLon + (dLon - pLon) * ratio];
        });
      }
    }

    setActiveRouteCoords(coords);
    setCoordIndex(0);
  }, [status, activeRide.id, activeRide.pickupRouteData, activeRide.routeData]);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initialCenter: [number, number] = [activeRide.pickup.lat, activeRide.pickup.lon];
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 15,
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
      subdomains: 'abcd',
      attribution: '&copy; Geoapify | OpenStreetMap',
    }).addTo(map);

    // Passenger / Pickup Radar Marker
    const paxIcon = L.divIcon({
      className: 'uber-pax-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <span style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background: rgba(59, 130, 246, 0.4); animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <div style="width: 18px; height: 18px; border-radius: 9999px; background: #3b82f6; border: 3px solid #ffffff; box-shadow: 0 0 12px rgba(59,130,246,0.9); z-index: 10;"></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const paxMarker = L.marker([activeRide.pickup.lat, activeRide.pickup.lon], {
      icon: paxIcon,
      zIndexOffset: 800,
    }).addTo(map);
    paxMarker.bindPopup(`<strong>Passenger Pickup:</strong><br/>${activeRide.pickup.formatted}`);
    passengerMarkerRef.current = paxMarker;

    // Dropoff Marker (Visible during transit or completion)
    const dropoffIcon = L.divIcon({
      className: 'uber-drop-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="width: 20px; height: 20px; background: #ef4444; border: 3px solid #ffffff; border-radius: 4px; transform: rotate(45deg); box-shadow: 0 0 14px rgba(239,68,68,0.9);"></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const dropMarker = L.marker([activeRide.dropoff.lat, activeRide.dropoff.lon], {
      icon: dropoffIcon,
      zIndexOffset: 700,
    }).addTo(map);
    dropMarker.bindPopup(`<strong>Destination:</strong><br/>${activeRide.dropoff.formatted}`);
    dropoffMarkerRef.current = dropMarker;

    // Vehicle Marker Icon (Yamaha Motorcycle Bike)
    const bikeIcon = L.divIcon({
      className: 'uber-bike-marker',
      html: `
        <div id="uber-car-element" style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transform: rotate(0deg); transition: transform 0.2s ease-out;">
          <div style="width: 38px; height: 38px; background: #10b981; border: 2.5px solid #ffffff; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 18px rgba(0,0,0,0.8);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5"></circle>
              <circle cx="5.5" cy="17.5" r="3.5"></circle>
              <circle cx="15" cy="5" r="1"></circle>
              <path d="M12 17.5V14l-3-3 4-3 2 3h2"></path>
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const startCoord = initialCenter;
    const vMarker = L.marker(startCoord, {
      icon: bikeIcon,
      zIndexOffset: 1200,
    }).addTo(map);
    vehicleMarkerRef.current = vMarker;

    mapInstanceRef.current = map;

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [activeKey, activeRide.id]);

  // Dynamically update passenger marker when passenger live coordinates change
  useEffect(() => {
    if (!passengerMarkerRef.current) return;
    const paxLoc = activeRide.passengerLiveLocation || activeRide.pickup;
    passengerMarkerRef.current.setLatLng([paxLoc.lat, paxLoc.lon]);
  }, [activeRide.passengerLiveLocation]);

  // 3. Draw Polylines when activeRouteCoords changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || activeRouteCoords.length === 0) return;

    if (activeRoutePolylineRef.current) {
      map.removeLayer(activeRoutePolylineRef.current);
    }
    if (traveledPolylineRef.current) {
      map.removeLayer(traveledPolylineRef.current);
    }

    // Active full remaining route polyline (Emerald)
    const polyline = L.polyline(activeRouteCoords, {
      color: '#10b981',
      weight: 5,
      opacity: 0.95,
      lineJoin: 'round',
    }).addTo(map);

    // Traveled past line (Zinc dark)
    const traveledLine = L.polyline([], {
      color: '#52525b',
      weight: 6,
      opacity: 0.8,
      lineJoin: 'round',
    }).addTo(map);

    activeRoutePolylineRef.current = polyline;
    traveledPolylineRef.current = traveledLine;

    map.fitBounds(polyline.getBounds(), { padding: [60, 60] });
  }, [activeRouteCoords]);

  // 4. Live Movement Tracking Animation Loop (Uber Experience)
  useEffect(() => {
    if (activeRouteCoords.length === 0 || isPaused || isCompleted || isAtPickup) {
      return;
    }

    let index = coordIndex;
    let lastTime = performance.now();
    // Step interval in ms based on simulation speed (fast & realistic)
    const baseIntervalMs = Math.max(80, Math.min(450, 18000 / activeRouteCoords.length));
    const stepInterval = baseIntervalMs / simSpeed;

    const totalDistanceM =
      isEnRouteToPickup
        ? (activeRide.pickupRouteData?.distanceMeters || 1800)
        : (activeRide.routeData?.distanceMeters || activeRide.distanceKm * 1000);

    const step = (time: number) => {
      if (time - lastTime >= stepInterval) {
        lastTime = time;

        if (index < activeRouteCoords.length - 1) {
          index += 1;
          setCoordIndex(index);

          const currentCoord = activeRouteCoords[index];
          const prevCoord = activeRouteCoords[index - 1] || currentCoord;

          // Compute heading angle for vehicle icon rotation
          const dLat = currentCoord[0] - prevCoord[0];
          const dLon = currentCoord[1] - prevCoord[1];
          let angleDeg = 0;
          if (dLat !== 0 || dLon !== 0) {
            angleDeg = (Math.atan2(dLon, dLat) * 180) / Math.PI;
          }

          // Move vehicle marker
          if (vehicleMarkerRef.current) {
            vehicleMarkerRef.current.setLatLng(currentCoord);
            const carEl = document.getElementById('uber-car-element');
            if (carEl) {
              carEl.style.transform = `rotate(${Math.round(angleDeg)}deg)`;
            }
          }

          // Update traveled vs remaining route polyline
          if (traveledPolylineRef.current) {
            traveledPolylineRef.current.setLatLngs(activeRouteCoords.slice(0, index + 1));
          }

          // Calculate traveled & remaining distance
          const progressRatio = index / (activeRouteCoords.length - 1);
          const travKm = Number(((totalDistanceM * progressRatio) / 1000).toFixed(1));
          const remKm = Math.max(0, Number(((totalDistanceM * (1 - progressRatio)) / 1000).toFixed(1)));
          const eta = Math.max(1, Math.round(remKm * 2.2));
          const speed = Math.round(32 + Math.sin(index * 0.4) * 8);

          setTraveledKm(travKm);
          setRemainingKm(remKm);
          setEtaMinutes(eta);
          setCurrentSpeed(speed);

          // Turn instruction logic from route steps
          const steps = isEnRouteToPickup
            ? activeRide.pickupRouteData?.steps
            : activeRide.routeData?.steps;

          if (steps && steps.length > 0) {
            const stepIdx = Math.min(steps.length - 1, Math.floor(progressRatio * steps.length));
            setCurrentInstruction(steps[stepIdx]?.instruction || 'Proceed along highway');
          } else {
            setCurrentInstruction(
              isEnRouteToPickup
                ? `Proceeding to passenger pickup in Bangladesh (${remKm} km away)`
                : `Driving to destination (${remKm} km remaining)`
            );
          }

          // Broadcast live tracking data via rideSync (Zero latency cross-tab & passenger sync)
          const liveData: LiveTrackingData = {
            riderLat: currentCoord[0],
            riderLon: currentCoord[1],
            heading: Math.round(angleDeg),
            speedKmh: speed,
            traveledKm: travKm,
            remainingKm: remKm,
            etaMinutes: eta,
            currentStepIndex: Math.floor(progressRatio * (steps?.length || 1)),
            currentStepInstruction: currentInstruction,
            coordIndex: index,
            totalCoords: activeRouteCoords.length,
            stage: isEnRouteToPickup ? 'to_pickup' : 'to_destination',
            updatedAt: Date.now(),
          };

          updateLiveTracking(liveData);
        } else {
          // Reached the end of this stage!
          if (isEnRouteToPickup) {
            arriveAtPickupSpot();
          } else if (isInTransit) {
            completeTrip(activeRide.distanceKm);
          }
          return;
        }
      }

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeRouteCoords, coordIndex, isPaused, simSpeed, status]);

  // Handle rider actions
  const handleArriveAtPickup = () => {
    arriveAtPickupSpot();
  };

  const handleStartTrip = () => {
    startTripToDestination();
  };

  const handleCompleteTrip = () => {
    const finalKm = traveledKm > 0 ? traveledKm : activeRide.distanceKm;
    completeTrip(finalKm);
  };

  const handleCancel = () => {
    cancelRide();
    onResetRide?.();
  };

  const handleFinishAndReset = () => {
    clearCurrentRide();
    onResetRide?.();
  };

  // Re-center map on car
  const handleRecenter = () => {
    if (vehicleMarkerRef.current && mapInstanceRef.current) {
      const pos = vehicleMarkerRef.current.getLatLng();
      mapInstanceRef.current.flyTo(pos, 16, { duration: 0.6 });
    }
  };

  return (
    <div id="uber-live-tracking-view" className="w-full h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* 1. TOP UBER TURN-BY-TURN / STATUS BANNER */}
      <div className="absolute top-4 left-4 right-4 z-[1000] max-w-2xl mx-auto pointer-events-auto">
        <div className="bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/90 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Step Icon */}
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              {isEnRouteToPickup ? (
                <Car className="w-5 h-5 text-emerald-400" />
              ) : isAtPickup ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : isInTransit ? (
                <Navigation className="w-5 h-5 text-emerald-400 rotate-45" />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              )}
            </div>

            {/* Instruction / Status Text */}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isEnRouteToPickup && 'Driver En Route to Pickup'}
                {isAtPickup && 'Driver Arrived at Pickup Spot'}
                {isInTransit && 'Trip in Progress to Destination'}
                {isCompleted && 'Trip Completed Successfully'}
              </div>
              <div className="text-sm font-extrabold text-white truncate mt-0.5">
                {isAtPickup
                  ? 'Vehicle is parked at pickup spot. Ready to board.'
                  : currentInstruction}
              </div>
            </div>
          </div>

          {/* Quick Metrics (Remaining Distance & ETA) */}
          {!isCompleted && !isAtPickup && (
            <div className="text-right shrink-0 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800">
              <div className="text-sm font-black text-white">{remainingKm} km</div>
              <div className="text-[10px] text-zinc-400 font-semibold">{etaMinutes} min away</div>
            </div>
          )}
        </div>
      </div>

      {/* 2. LEAFLET MAP CONTAINER */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 3. MAP FLOATING CONTROLS (Right side) */}
      <div className="absolute right-4 top-24 z-[1000] flex flex-col gap-2 pointer-events-auto">
        {/* Re-center on Vehicle */}
        <button
          onClick={handleRecenter}
          title="Re-center on vehicle"
          className="w-10 h-10 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center shadow-2xl transition-all cursor-pointer"
        >
          <Compass className="w-5 h-5 text-emerald-400" />
        </button>

        {/* Role Switcher Button for Testing/Live Demo */}
        {onSwitchRole && (
          <button
            onClick={onSwitchRole}
            title={`Switch view to ${role === 'passenger' ? 'Rider' : 'Passenger'}`}
            className="w-10 h-10 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center shadow-2xl transition-all cursor-pointer text-xs font-bold"
          >
            {role === 'passenger' ? '🚗' : '👤'}
          </button>
        )}
      </div>

      {/* 4. BOTTOM UBER HUD / DASHBOARD PANEL */}
      <div className="absolute bottom-4 left-4 right-4 z-[1000] max-w-xl mx-auto pointer-events-auto">
        <div className="bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800/90 rounded-2xl p-4 shadow-2xl space-y-3.5">
          {/* Telemetry Stats Bar: Traveled Distance, Speed, Remaining, Fare Meter */}
          {(() => {
            const liveMeterTaka = Math.max(70, Math.round((traveledKm > 0 ? traveledKm : 0.1) * RATE_PER_KM_TAKA));
            return (
              <div className="grid grid-cols-4 gap-2 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80 text-center">
                <div>
                  <div className="text-[9px] uppercase font-bold tracking-wider text-zinc-400">Traveled</div>
                  <div className="text-sm font-black text-emerald-400">{traveledKm} km</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-bold tracking-wider text-zinc-400">Speed</div>
                  <div className="text-sm font-black text-white">{currentSpeed} km/h</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-bold tracking-wider text-zinc-400">Live Meter</div>
                  <div className="text-sm font-black text-emerald-400">৳{liveMeterTaka}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-bold tracking-wider text-zinc-400">Estimated</div>
                  <div className="text-sm font-black text-zinc-300">~৳{activeRide.fareTaka}</div>
                </div>
              </div>
            );
          })()}

          {/* Passenger & Driver Details Strip */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-zinc-800/60">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white shrink-0">
                <Bike className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                  <span>{driver.name}</span>
                  <span className="flex items-center text-[10px] text-amber-400 bg-amber-950/40 border border-amber-900/40 px-1.5 py-0.5 rounded">
                    ★ {driver.rating}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">
                  {driver.vehicleModel} • <span className="font-mono text-zinc-300">{driver.plateNumber}</span>
                </div>
              </div>
            </div>

            {/* Quick Contact Actions (Passenger view) */}
            {role === 'passenger' && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setContactMessage(`Calling driver ${driver.name} at ${driver.phone}...`)}
                  title="Call Driver"
                  className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setContactMessage(`Opened SMS chat with ${driver.name}. "I am standing near the entrance."`)}
                  title="Message Driver"
                  className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Rider Controls: Simulation Speed Toggle */}
            {role === 'rider' && !isCompleted && (
              <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  title={isPaused ? 'Resume Driving' : 'Pause Driving'}
                  className="p-1.5 text-zinc-300 hover:text-white cursor-pointer"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setSimSpeed(simSpeed === 1 ? 2 : simSpeed === 2 ? 4 : 1)}
                  className="text-[10px] font-bold text-zinc-400 hover:text-white px-1.5 py-0.5 rounded bg-zinc-800 cursor-pointer"
                >
                  {simSpeed}x
                </button>
              </div>
            )}
          </div>

          {/* Contact Alert Message if clicked */}
          {contactMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between">
              <span>{contactMessage}</span>
              <button
                onClick={() => setContactMessage(null)}
                className="text-zinc-400 hover:text-white ml-2 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* ACTION BUTTONS BASED ON STAGE & ROLE */}
          <div className="pt-1">
            {/* STAGE 1 (Accepted - En Route): Rider Arrive Action */}
            {role === 'rider' && isEnRouteToPickup && (
              <button
                type="button"
                onClick={handleArriveAtPickup}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-extrabold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>I Have Arrived at Pickup Spot</span>
              </button>
            )}

            {/* STAGE 2 (At Pickup): Rider Start Trip Action */}
            {role === 'rider' && isAtPickup && (
              <button
                type="button"
                onClick={handleStartTrip}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-extrabold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Navigation className="w-4 h-4 fill-black" />
                <span>Passenger Boarded • Start Trip to Destination</span>
              </button>
            )}

            {/* STAGE 2 (At Pickup): Passenger Alert */}
            {role === 'passenger' && isAtPickup && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-center">
                <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Your driver has arrived at your pickup spot!</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Look for {driver.vehicleModel} ({driver.plateNumber}).
                </div>
              </div>
            )}

            {/* STAGE 3 (In Transit): Rider Complete Trip Action */}
            {role === 'rider' && isInTransit && (
              <button
                type="button"
                onClick={handleCompleteTrip}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-extrabold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Complete Ride at Drop-off</span>
              </button>
            )}

            {/* Passenger Cancel Button if waiting */}
            {role === 'passenger' && !isCompleted && !isInTransit && (
              <button
                type="button"
                onClick={handleCancel}
                className="w-full py-2 bg-transparent hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 text-xs font-medium rounded-xl transition-colors cursor-pointer mt-1"
              >
                Cancel Ride
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. UBER TRIP COMPLETED RECEIPT MODAL */}
      {isCompleted && (
        <div className="absolute inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white pt-2">Trip Completed!</h3>
              <p className="text-xs text-zinc-400">
                You have arrived safely at {activeRide.dropoff.formatted}
              </p>
            </div>

            {/* Fare Breakdown */}
            <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl space-y-2.5">
              <div className="flex justify-between items-center text-xs text-zinc-400">
                <span>Actual Distance Traveled</span>
                <span className="font-bold text-white">
                  {activeRide.actualTraveledKm || traveledKm || activeRide.distanceKm} km
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-zinc-400">
                <span>Rate per Kilometer</span>
                <span className="font-bold text-white">৳{RATE_PER_KM_TAKA} Taka / km</span>
              </div>
              <div className="flex justify-between items-center text-xs text-zinc-400">
                <span>Initial Estimated Price</span>
                <span className="text-zinc-400 font-mono">~৳{activeRide.fareTaka} Taka</span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                <div>
                  <span className="text-sm font-bold text-white">Final Calculated Fare</span>
                  <div className="text-[10px] text-zinc-500">Counted by system from kilometers traveled</div>
                </div>
                <span className="text-2xl font-black text-emerald-400">
                  ৳{activeRide.finalFareTaka || activeRide.fareTaka} Taka
                </span>
              </div>
            </div>

            {/* 5-Star Rating for Driver / Passenger */}
            {role === 'passenger' && (
              <div className="space-y-2 text-center">
                <div className="text-xs text-zinc-400 font-semibold">Rate your experience with {driver.name}</div>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setRating(star);
                        setFeedbackSubmitted(true);
                      }}
                      className="cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 transition-all ${
                          star <= rating
                            ? 'text-amber-400 fill-amber-400 scale-110'
                            : 'text-zinc-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {feedbackSubmitted && (
                  <div className="text-[11px] text-emerald-400 font-semibold">
                    Thank you for your {rating}-star rating!
                  </div>
                )}
              </div>
            )}

            {/* Finish & Book Another Ride Button */}
            <button
              type="button"
              onClick={handleFinishAndReset}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl transition-all cursor-pointer shadow-xl text-sm"
            >
              Done • Book Another Ride
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
