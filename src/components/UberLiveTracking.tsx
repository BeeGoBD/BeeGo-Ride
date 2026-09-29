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
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  Undo2,
  RefreshCw,
  LocateFixed,
  Layers,
  Sparkles,
  Route,
  ArrowRight,
} from 'lucide-react';
import { LocationPoint, RideRequest, RouteData, UserRole, LiveTrackingData } from '../types';
import {
  arriveAtPickupSpot,
  startTripToDestination,
  completeTrip,
  cancelRide,
  clearCurrentRide,
  updateLiveTracking,
  sendInRideChatMessage,
  RATE_PER_KM_TAKA,
} from '../services/rideSync';
import { DEFAULT_GEOAPIFY_KEY } from '../services/geoapify';
import {
  TurnAction,
  detectTurnAction,
  extractStreetName,
  generateRealisticSteps,
  createAlternativeRoute,
} from '../utils/navigationHelper';

interface UberLiveTrackingProps {
  role: 'passenger' | 'rider';
  activeRide: RideRequest;
  apiKey: string;
  onBackToRoles?: () => void;
  onSwitchRole?: () => void;
  onResetRide?: () => void;
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
      className="relative w-full h-14 rounded-2xl bg-zinc-900 border-2 border-[#F5C518]/50 overflow-hidden flex items-center p-1.5 select-none shadow-xl cursor-grab active:cursor-grabbing"
    >
      <div
        style={{ width: `${sliderX + 50}px` }}
        className="absolute left-0 top-0 bottom-0 bg-[#F5C518]/20 transition-all pointer-events-none"
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

  // View Mode: 'follow' (navigation mode) or 'overview' (whole route)
  const [viewMode, setViewMode] = useState<'follow' | 'overview'>('follow');

  // Current coordinate index along active route
  const [coordIndex, setCoordIndex] = useState<number>(0);
  const [activeRouteCoords, setActiveRouteCoords] = useState<[number, number][]>([]);

  // Telemetry stats
  const [currentSpeed, setCurrentSpeed] = useState<number>(38);
  const [traveledKm, setTraveledKm] = useState<number>(0);
  const [remainingKm, setRemainingKm] = useState<number>(activeRide.distanceKm || 1);
  const [etaMinutes, setEtaMinutes] = useState<number>(activeRide.durationMinutes || 2);

  // Turn-by-Turn Navigation States
  const [turnAction, setTurnAction] = useState<TurnAction>('straight');
  const [nextRoadName, setNextRoadName] = useState<string>('Main Road');
  const [distanceToNextTurnMeters, setDistanceToNextTurnMeters] = useState<number>(250);
  const [currentInstruction, setCurrentInstruction] = useState<string>('Proceed to destination');

  // Route Recalculation Notification
  const [isRerouting, setIsRerouting] = useState<boolean>(false);
  const [rerouteNotice, setRerouteNotice] = useState<string | null>(null);

  // Contact & Chat modal states
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInputText, setChatInputText] = useState('');

  const quickChatPhrases = [
    'I am here',
    'Pick me up',
    'Coming now',
    'Please wait 2 mins',
    'Where are you?',
    'On the way',
  ];

  const handleSendChat = (text: string) => {
    if (!text.trim()) return;
    const senderRole = role;
    const senderName = role === 'passenger' ? activeRide.passengerId : driver.name;
    sendInRideChatMessage(senderRole, senderName, text.trim());
    setChatInputText('');
  };

  const handleCallDriver = () => {
    const cleanPhone = (driver.phone || '+8801712345678').replace(/[^0-9+]/g, '');
    window.location.href = `tel:${cleanPhone}`;
  };

  const status = activeRide.status;
  const isEnRouteToPickup = status === 'accepted';
  const isAtPickup = status === 'arrived_at_pickup';
  const isInTransit = status === 'in_transit';
  const isCompleted = status === 'completed';

  // Driver details
  const driver = activeRide.driverDetails || {
    name: 'Captain Tanvir',
    vehicleModel: 'Voltx Eco Speed (Electric)',
    plateNumber: 'Dhaka Metro-Ha 45-8921',
    rating: 4.96,
    phone: '+880 1712-345678',
  };

  // 1. Prepare Coordinates for current stage
  useEffect(() => {
    let coords: [number, number][] = [];

    if (isEnRouteToPickup) {
      if (activeRide.pickupRouteData?.coordinates && activeRide.pickupRouteData.coordinates.length > 0) {
        coords = activeRide.pickupRouteData.coordinates;
      } else {
        const pLat = activeRide.pickup.lat;
        const pLon = activeRide.pickup.lon;
        const startLat = pLat + 0.012;
        const startLon = pLon - 0.010;
        const stepsCount = 50;
        coords = Array.from({ length: stepsCount }, (_, i) => {
          const ratio = i / (stepsCount - 1);
          const curve = Math.sin(ratio * Math.PI) * 0.0025;
          return [startLat + (pLat - startLat) * ratio + curve, startLon + (pLon - startLon) * ratio - curve];
        });
      }
    } else if (isInTransit || isAtPickup || isCompleted) {
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
      zoom: 16,
      zoomControl: false,
    });

    const tileUrl = activeKey
      ? `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(
          activeKey
        )}`
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Passenger Live Location Beacon (Pulse Blue Dot with "YOU" badge)
    const paxIcon = L.divIcon({
      className: 'uber-pax-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
          <div style="position: absolute; top: -14px; background: #2563eb; color: #ffffff; font-size: 8.5px; font-weight: 900; font-family: sans-serif; padding: 1px 6px; border-radius: 9999px; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 1.5px solid #ffffff;">YOU</div>
          <span style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background: rgba(59, 130, 246, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <span style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background: rgba(59, 130, 246, 0.25); border: 1.5px solid rgba(59, 130, 246, 0.8);"></span>
          <div style="width: 15px; height: 15px; border-radius: 9999px; background: #1d4ed8; border: 3px solid #ffffff; box-shadow: 0 0 16px rgba(29, 78, 216, 0.95); z-index: 10;"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const paxMarker = L.marker([activeRide.pickup.lat, activeRide.pickup.lon], {
      icon: paxIcon,
      zIndexOffset: 800,
    }).addTo(map);
    passengerMarkerRef.current = paxMarker;

    // Dropoff Destination Marker
    const dropoffIcon = L.divIcon({
      className: 'uber-drop-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.25));">
          <div style="width: 22px; height: 22px; background: #1A1A1A; border: 2.5px solid #F5C518; border-radius: 4px; transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
            <div style="width: 6px; height: 6px; background: #F5C518; border-radius: 9999px;"></div>
          </div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    const dropMarker = L.marker([activeRide.dropoff.lat, activeRide.dropoff.lon], {
      icon: dropoffIcon,
      zIndexOffset: 700,
    }).addTo(map);
    dropoffMarkerRef.current = dropMarker;

    // Vehicle Marker Icon (BeeGo Voltx High-Contrast Electric Bike)
    const bikeIcon = L.divIcon({
      className: 'uber-bike-marker',
      html: `
        <div id="uber-car-element" style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transform: rotate(0deg); transition: transform 0.2s ease-out;">
          <div style="width: 38px; height: 38px; background: #F5C518; border: 2.5px solid #000000; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 18px rgba(0,0,0,0.35);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
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

    // Active full remaining route polyline (Voltx Yellow Signature)
    const polyline = L.polyline(activeRouteCoords, {
      color: '#F5C518',
      weight: 6,
      opacity: 1,
      lineJoin: 'round',
    }).addTo(map);

    // Traveled past line (Muted Charcoal)
    const traveledLine = L.polyline([], {
      color: '#3f3f46',
      weight: 6,
      opacity: 0.85,
      lineJoin: 'round',
    }).addTo(map);

    activeRoutePolylineRef.current = polyline;
    traveledPolylineRef.current = traveledLine;

    if (viewMode === 'overview') {
      map.fitBounds(polyline.getBounds(), { padding: [70, 70] });
    }
  }, [activeRouteCoords, viewMode]);

  // 4. Live Movement Tracking Animation Loop (Uber / Pathao Navigation Engine)
  useEffect(() => {
    if (activeRouteCoords.length === 0 || isPaused || isCompleted || isAtPickup) {
      return;
    }

    let index = coordIndex;
    let lastTime = performance.now();
    const baseIntervalMs = Math.max(90, Math.min(420, 20000 / activeRouteCoords.length));
    const stepInterval = baseIntervalMs / simSpeed;

    const totalDistanceM =
      isEnRouteToPickup
        ? (activeRide.pickupRouteData?.distanceMeters || 1800)
        : (activeRide.routeData?.distanceMeters || activeRide.distanceKm * 1000);

    // Generate or extract steps
    const rawSteps =
      (isEnRouteToPickup ? activeRide.pickupRouteData?.steps : activeRide.routeData?.steps) || [];
    const navigationSteps =
      rawSteps.length >= 2
        ? rawSteps
        : generateRealisticSteps(activeRide.pickup.formatted, activeRide.dropoff.formatted, totalDistanceM);

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

          // If in transit, passenger is inside vehicle so passenger marker moves with vehicle
          if (passengerMarkerRef.current && isInTransit) {
            passengerMarkerRef.current.setLatLng(currentCoord);
          }

          // Update traveled polyline
          if (traveledPolylineRef.current) {
            traveledPolylineRef.current.setLatLngs(activeRouteCoords.slice(0, index + 1));
          }

          // Camera follow in Navigation Mode
          if (viewMode === 'follow' && mapInstanceRef.current) {
            mapInstanceRef.current.panTo(currentCoord, { animate: true, duration: 0.3 });
          }

          // Calculate traveled & remaining distance
          const progressRatio = index / (activeRouteCoords.length - 1);
          const travKm = Number(((totalDistanceM * progressRatio) / 1000).toFixed(1));
          const remKm = Math.max(0, Number(((totalDistanceM * (1 - progressRatio)) / 1000).toFixed(1)));
          const remMeters = Math.round(totalDistanceM * (1 - progressRatio));
          const eta = Math.max(1, Math.round(remKm * 2.2));
          const speed = Math.round(34 + Math.sin(index * 0.4) * 6);

          setTraveledKm(travKm);
          setRemainingKm(remKm);
          setEtaMinutes(eta);
          setCurrentSpeed(speed);

          // Turn-by-Turn Instruction Resolution
          const stepCount = navigationSteps.length;
          const currentStepIndex = Math.min(stepCount - 1, Math.floor(progressRatio * stepCount));
          const activeStep = navigationSteps[currentStepIndex];

          if (activeStep) {
            const action = detectTurnAction(activeStep.instruction);
            const road = extractStreetName(activeStep.instruction);
            setTurnAction(action);
            setNextRoadName(road);
            setCurrentInstruction(activeStep.instruction);

            // Compute distance to next turn (counting down)
            const legProgress = (progressRatio * stepCount) % 1;
            const legDistMeters = Math.max(20, Math.round((activeStep.distance || 300) * (1 - legProgress)));
            setDistanceToNextTurnMeters(legDistMeters);
          }

          // Broadcast live tracking data via rideSync for cross-tab sync
          const liveData: LiveTrackingData = {
            riderLat: currentCoord[0],
            riderLon: currentCoord[1],
            heading: Math.round(angleDeg),
            speedKmh: speed,
            traveledKm: travKm,
            remainingKm: remKm,
            etaMinutes: eta,
            currentStepIndex,
            currentStepInstruction: currentInstruction,
            coordIndex: index,
            totalCoords: activeRouteCoords.length,
            stage: isEnRouteToPickup ? 'to_pickup' : 'to_destination',
            updatedAt: Date.now(),
          };

          updateLiveTracking(liveData);
        } else {
          // Reached the end of this stage
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
  }, [activeRouteCoords, coordIndex, isPaused, simSpeed, status, viewMode]);

  // Recalculate Alternative Route / Shortcut (Specification Feature)
  const handleTriggerReroute = () => {
    if (activeRouteCoords.length <= coordIndex + 3) return;
    setIsRerouting(true);
    setRerouteNotice('Rerouting: Driver taking alternative shortcut route...');

    setTimeout(() => {
      const remaining = activeRouteCoords.slice(coordIndex);
      const alternativeRemaining = createAlternativeRoute(remaining, 0.0038);
      const newFullCoords = [...activeRouteCoords.slice(0, coordIndex), ...alternativeRemaining];

      setActiveRouteCoords(newFullCoords);
      setIsRerouting(false);
      setRerouteNotice('⚡ Faster alternative path active: -2 mins via Hatirjheel Bypass Link');

      // Update turn-by-turn instruction to reflect the new route
      setNextRoadName('Hatirjheel Bypass Link');
      setCurrentInstruction('Take shortcut exit onto Hatirjheel Bypass Link');
      setTurnAction('slight-right');
      setDistanceToNextTurnMeters(160);
      setEtaMinutes((prev) => Math.max(1, prev - 2));

      setTimeout(() => setRerouteNotice(null), 4500);
    }, 600);
  };

  // Re-center on vehicle
  const handleRecenter = () => {
    if (vehicleMarkerRef.current && mapInstanceRef.current) {
      const pos = vehicleMarkerRef.current.getLatLng();
      mapInstanceRef.current.flyTo(pos, 17, { duration: 0.6 });
      setViewMode('follow');
    }
  };

  // Toggle Overview vs Follow
  const handleToggleViewMode = () => {
    if (!mapInstanceRef.current) return;
    if (viewMode === 'follow') {
      setViewMode('overview');
      if (activeRoutePolylineRef.current) {
        mapInstanceRef.current.fitBounds(activeRoutePolylineRef.current.getBounds(), {
          padding: [70, 70],
        });
      }
    } else {
      setViewMode('follow');
      handleRecenter();
    }
  };

  const isApproachingTurn = distanceToNextTurnMeters < 100 && !isCompleted && !isAtPickup;

  const renderTurnIcon = (action: TurnAction) => {
    switch (action) {
      case 'turn-left':
        return <CornerUpLeft className="w-6 h-6 stroke-[3]" />;
      case 'turn-right':
        return <CornerUpRight className="w-6 h-6 stroke-[3]" />;
      case 'slight-left':
        return <CornerUpLeft className="w-6 h-6 stroke-[2.2] -rotate-25" />;
      case 'slight-right':
        return <CornerUpRight className="w-6 h-6 stroke-[2.2] rotate-25" />;
      case 'u-turn':
        return <Undo2 className="w-6 h-6 stroke-[3]" />;
      case 'arrive':
        return <MapPin className="w-6 h-6 stroke-[2.5]" />;
      default:
        return <ArrowUp className="w-6 h-6 stroke-[3]" />;
    }
  };

  return (
    <div id="uber-live-tracking-view" className="w-full h-full bg-[#F8F9FA] text-[#1A1A1A] flex flex-col relative overflow-hidden select-none">
      {/* 1. TOP UBER / PATHAO TURN-BY-TURN HUD (Prominent Navigation Header) */}
      <div className="absolute top-3 left-3 right-3 z-[1000] max-w-xl mx-auto pointer-events-auto">
        <div
          className={`p-3.5 rounded-3xl transition-all shadow-2xl backdrop-blur-xl border-2 flex items-center justify-between gap-3 ${
            isApproachingTurn
              ? 'bg-[#F5C518] text-black border-amber-300 ring-4 ring-amber-400/30'
              : 'bg-zinc-900/95 text-white border-zinc-700/80'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Maneuver Arrow Container */}
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                isApproachingTurn
                  ? 'bg-black text-[#F5C518]'
                  : 'bg-[#F5C518] text-black'
              }`}
            >
              {renderTurnIcon(turnAction)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-base font-black font-mono tracking-tight ${
                    isApproachingTurn ? 'text-black' : 'text-[#F5C518]'
                  }`}
                >
                  In {distanceToNextTurnMeters} m
                </span>
                {isApproachingTurn && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-black text-[#F5C518] px-2 py-0.5 rounded-full animate-pulse">
                    Approaching Turn
                  </span>
                )}
              </div>
              <div
                className={`text-xs font-black truncate mt-0.5 ${
                  isApproachingTurn ? 'text-zinc-900' : 'text-zinc-100'
                }`}
              >
                {isAtPickup
                  ? 'Captain Arrived • Meet at pickup spot'
                  : isCompleted
                  ? 'Trip Completed'
                  : currentInstruction}
              </div>
            </div>
          </div>

          {/* Quick Metrics: Remaining Distance & Dynamic ETA */}
          {!isCompleted && !isAtPickup && (
            <div
              className={`text-right shrink-0 px-3 py-1.5 rounded-2xl border ${
                isApproachingTurn
                  ? 'bg-black/10 border-black/20 text-black'
                  : 'bg-white/10 border-white/10 text-white'
              }`}
            >
              <div className="text-sm font-black font-mono">
                {remainingKm < 1 ? `${Math.round(remainingKm * 1000)} m` : `${remainingKm} km`}
              </div>
              <div
                className={`text-[10px] font-bold ${
                  isApproachingTurn ? 'text-zinc-800' : 'text-zinc-400'
                }`}
              >
                {etaMinutes} min away
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Route Recalculation Toast */}
        {rerouteNotice && (
          <div className="mt-2 p-2.5 rounded-2xl bg-zinc-900 text-[#F5C518] border border-amber-400 shadow-xl flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>{rerouteNotice}</span>
            </div>
          </div>
        )}

        {/* Dynamic Alternative Shortcut Banner during In-Transit */}
        {isInTransit && (
          <div className="mt-2 flex items-center justify-between p-2.5 px-3 rounded-2xl bg-zinc-950/95 backdrop-blur-md border border-[#F5C518]/50 shadow-xl text-white text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-bold text-[11px] text-zinc-200 truncate">
                Smart Route Engine Active
              </span>
            </div>
            <button
              type="button"
              onClick={handleTriggerReroute}
              disabled={isRerouting}
              className="px-2.5 py-1 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer active:scale-95 transition-all disabled:opacity-50 shrink-0"
              title="Recalculate route via faster shortcut"
            >
              <Route className={`w-3 h-3 ${isRerouting ? 'animate-spin' : ''}`} />
              <span>{isRerouting ? 'Recalculating...' : 'Recalculate / Shortcut (-2m)'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. LEAFLET MAP CANVAS */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 3. FLOATING MAP CONTROLS (Right Side) */}
      <div className="absolute right-3.5 top-28 z-[1000] flex flex-col gap-2 pointer-events-auto">
        {/* Toggle Overview vs Follow Navigation Mode */}
        <button
          type="button"
          onClick={handleToggleViewMode}
          title={viewMode === 'follow' ? 'Switch to Route Overview' : 'Switch to Vehicle Follow'}
          className={`w-10 h-10 rounded-2xl border shadow-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
            viewMode === 'overview'
              ? 'bg-[#F5C518] text-black border-amber-300'
              : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-200'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Re-center Camera */}
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter on live location"
          className="w-10 h-10 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 flex items-center justify-center shadow-lg transition-all cursor-pointer active:scale-95"
        >
          <LocateFixed className="w-4 h-4 text-[#E6A800]" />
        </button>

        {/* Reroute / Shortcut simulation button */}
        {isInTransit && (
          <button
            type="button"
            onClick={handleTriggerReroute}
            disabled={isRerouting}
            title="Alternative Shortcut (Recalculate Route)"
            className="w-10 h-10 rounded-2xl bg-white hover:bg-[#FFF9E6] border border-amber-300 text-zinc-900 flex items-center justify-center shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Route className={`w-4 h-4 text-[#E6A800] ${isRerouting ? 'animate-spin' : ''}`} />
          </button>
        )}

        {/* Switch View Role for Testing */}
        {onSwitchRole && (
          <button
            type="button"
            onClick={onSwitchRole}
            title={`Switch view to ${role === 'passenger' ? 'Rider' : 'Passenger'}`}
            className="w-10 h-10 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 flex items-center justify-center shadow-lg transition-all cursor-pointer text-xs font-bold active:scale-95"
          >
            {role === 'passenger' ? '🛵' : '👤'}
          </button>
        )}
      </div>

      {/* 4. BOTTOM HUD / DASHBOARD PANEL */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] max-w-xl mx-auto pointer-events-auto">
        <div className="bg-white/98 backdrop-blur-2xl border border-zinc-200/90 rounded-3xl p-4 shadow-2xl space-y-3">
          {/* Telemetry Stats Bar: Traveled, Speed, Fare, Payment */}
          {(() => {
            const liveMeterTaka = Math.max(25, Math.round((traveledKm > 0 ? traveledKm : 0.1) * RATE_PER_KM_TAKA));
            return (
              <div className="grid grid-cols-4 gap-2 bg-[#F8F9FA] p-2.5 rounded-2xl border border-zinc-200/80 text-center">
                <div>
                  <div className="text-[9px] uppercase font-bold tracking-wider text-zinc-400">Remaining</div>
                  <div className="text-xs font-black text-[#1A1A1A]">
                    {remainingKm < 1 ? `${Math.round(remainingKm * 1000)}m` : `${remainingKm}km`}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-bold tracking-wider text-zinc-400">ETA</div>
                  <div className="text-xs font-black text-[#E6A800]">{etaMinutes} mins</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-bold tracking-wider text-zinc-400">Live Fare</div>
                  <div className="text-xs font-black text-emerald-700 font-mono">৳{liveMeterTaka}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-bold tracking-wider text-zinc-400">Speed</div>
                  <div className="text-xs font-black text-zinc-800">{currentSpeed} km/h</div>
                </div>
              </div>
            );
          })()}

          {/* Passenger & Driver Details Strip */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/30 flex items-center justify-center font-bold text-white shrink-0">
                <Bike className="w-5 h-5 text-[#E6A800]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-[#1A1A1A] flex items-center gap-1.5 truncate">
                  <span>{driver.name}</span>
                  <span className="flex items-center text-[10px] text-[#E6A800] bg-[#FFF9E6] border border-[#F5C518]/40 px-1.5 py-0.2 rounded font-bold">
                    ★ {driver.rating}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                  {driver.vehicleModel} • <span className="font-mono text-zinc-700">{driver.plateNumber}</span>
                </div>
              </div>
            </div>

            {/* In-Ride Communications (Call Dialer & Synchronized Chat) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCallDriver}
                title={`Call Captain: ${driver.phone}`}
                className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                title="Chat with Captain"
                className="w-9 h-9 rounded-xl bg-[#FFF9E6] hover:bg-[#F5C518] text-black border border-[#F5C518]/40 flex items-center justify-center transition-colors cursor-pointer active:scale-95 relative"
              >
                <MessageSquare className="w-4 h-4" />
                {(activeRide.chatMessages?.length || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E6A800] text-black text-[9px] font-black flex items-center justify-center">
                    {activeRide.chatMessages!.length}
                  </span>
                )}
              </button>
            </div>

            {/* Simulation Controls: Speed Toggle & Play/Pause */}
            {!isCompleted && (
              <div className="flex items-center gap-1 bg-zinc-100 px-2 py-1 rounded-xl border border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  title={isPaused ? 'Resume Navigation' : 'Pause Navigation'}
                  className="p-1 text-zinc-600 hover:text-black cursor-pointer"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 text-[#E6A800]" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setSimSpeed(simSpeed === 1 ? 2 : simSpeed === 2 ? 4 : 1)}
                  className="text-[10px] font-bold text-zinc-600 hover:text-black px-1.5 py-0.5 rounded bg-white cursor-pointer"
                  title="Simulation Speed"
                >
                  {simSpeed}x
                </button>
              </div>
            )}
          </div>

          {/* Contact Alert Toast */}
          {contactMessage && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
              <span>{contactMessage}</span>
              <button
                onClick={() => setContactMessage(null)}
                className="text-zinc-500 hover:text-black ml-2 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* ACTION BUTTONS & SLIDERS BASED ON STAGE & ROLE */}
          <div className="pt-1">
            {/* Rider: Slide to confirm Arrived at Pickup */}
            {role === 'rider' && isEnRouteToPickup && (
              <SwipeActionSlider
                label="Slide: Reached Pickup Spot"
                onConfirm={() => arriveAtPickupSpot()}
                icon={<CheckCircle className="w-5 h-5 text-black" />}
              />
            )}

            {/* Passenger: En route to pickup notice */}
            {role === 'passenger' && isEnRouteToPickup && (
              <div className="flex items-center justify-between text-xs px-1 text-zinc-600 font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Captain is riding to your pickup spot
                </span>
                <span className="text-[11px] font-mono text-zinc-500">ETA: {etaMinutes}m</span>
              </div>
            )}

            {/* Rider: Slide to confirm Passenger Picked Up */}
            {role === 'rider' && isAtPickup && (
              <SwipeActionSlider
                label="Slide: Picked Up Passenger"
                onConfirm={() => startTripToDestination()}
                icon={<Navigation className="w-5 h-5 fill-black" />}
              />
            )}

            {/* Passenger Alert at Pickup */}
            {role === 'passenger' && isAtPickup && (
              <div className="space-y-2">
                <div className="p-3 bg-[#FFF9E6] border border-[#F5C518]/50 rounded-2xl text-center">
                  <div className="text-xs font-black text-amber-900 flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-[#E6A800]" />
                    <span>Your captain has arrived at the pickup spot!</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Look for {driver.vehicleModel} ({driver.plateNumber}).
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => startTripToDestination()}
                  className="w-full py-3.5 bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.99] text-black font-black rounded-2xl transition-all shadow-lg shadow-amber-400/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Navigation className="w-4 h-4 fill-black" />
                  <span>I Have Boarded • Start Trip to Destination</span>
                </button>
              </div>
            )}

            {/* Rider: Slide to Complete Ride at Destination */}
            {role === 'rider' && isInTransit && (
              <SwipeActionSlider
                label="Slide: Complete Ride (Destination Reached)"
                onConfirm={() => completeTrip(traveledKm)}
                icon={<CheckCircle className="w-5 h-5 text-black" />}
              />
            )}

            {/* Passenger In Transit notice */}
            {role === 'passenger' && isInTransit && (
              <div className="flex items-center justify-between text-xs px-1 text-zinc-600 font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Navigation Active
                </span>
                <span>To: {activeRide.dropoff.addressLine1 || activeRide.dropoff.formatted.split(',')[0]}</span>
              </div>
            )}

            {/* Completed: Finish Ride */}
            {isCompleted && (
              <button
                type="button"
                onClick={() => {
                  clearCurrentRide();
                  onResetRide?.();
                }}
                className="w-full py-3.5 bg-[#F5C518] hover:bg-[#E6A800] text-black font-black rounded-2xl transition-all shadow-lg shadow-amber-400/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Complete Trip & Back to Home</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. IN-RIDE REAL-TIME CHAT DRAWER */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Chat Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/30 flex items-center justify-center text-[#E6A800]">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900">
                    {role === 'passenger' ? `Chat with ${driver.name}` : `Chat with Passenger`}
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                    <span>Driver Phone: {driver.phone}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-200 hover:bg-zinc-300 text-zinc-700 flex items-center justify-center cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-[#F8F9FA] min-h-[220px]">
              {(activeRide.chatMessages || []).length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs flex flex-col items-center gap-1.5">
                  <MessageSquare className="w-8 h-8 text-zinc-300 stroke-[1.5]" />
                  <span>No messages yet. Send a 1-click message below!</span>
                </div>
              ) : (
                activeRide.chatMessages!.map((msg) => {
                  const isMe = msg.sender === role;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] text-zinc-400 font-bold mb-0.5 px-1">
                        {isMe ? 'You' : msg.senderName}
                      </span>
                      <div
                        className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs font-medium leading-relaxed ${
                          isMe
                            ? 'bg-[#F5C518] text-black rounded-tr-xs shadow-xs'
                            : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-xs shadow-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-zinc-400 mt-0.5 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* 1-Click Fast Quick Text Pills */}
            <div className="p-2.5 bg-white border-t border-zinc-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {quickChatPhrases.map((phrase, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendChat(phrase)}
                  className="px-3 py-1.5 rounded-full bg-[#FFF9E6] hover:bg-[#F5C518] text-black text-xs font-bold whitespace-nowrap transition-colors border border-[#F5C518]/30 cursor-pointer active:scale-95 shrink-0"
                >
                  {phrase}
                </button>
              ))}
            </div>

            {/* Chat Input Field */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat(chatInputText);
              }}
              className="p-3 bg-white border-t border-zinc-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                placeholder="Type your message..."
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
    </div>
  );
};
