import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  LocateFixed,
  ZoomIn,
  ZoomOut,
  MapPin,
  Check,
  Loader2,
  Navigation,
  Compass,
  Target,
  Flag,
} from 'lucide-react';
import { LocationPoint, RouteData } from '../types';
import { reverseGeocode, DEFAULT_GEOAPIFY_KEY } from '../services/geoapify';
import { isLocationInBangladesh } from '../data/bangladeshDistricts';

export type PinMode = 'pickup' | 'dropoff';

interface InteractiveLocationMapProps {
  apiKey: string;
  pickup: LocationPoint | null;
  onPickupChange: (point: LocationPoint) => void;
  dropoff: LocationPoint | null;
  onDropoffChange: (point: LocationPoint) => void;
  pinMode: PinMode;
  onPinModeChange: (mode: PinMode) => void;
  routeData: RouteData | null;
  isLocating: boolean;
  onLocateUser: () => void;
  userLiveGps?: { lat: number; lon: number; accuracy?: number } | null;
}

export const InteractiveLocationMap: React.FC<InteractiveLocationMapProps> = ({
  apiKey,
  pickup,
  onPickupChange,
  dropoff,
  onDropoffChange,
  pinMode,
  onPinModeChange,
  routeData,
  isLocating,
  onLocateUser,
  userLiveGps,
}) => {
  const activeKey = apiKey.trim() || DEFAULT_GEOAPIFY_KEY;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Markers for the stationary points
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const liveGpsMarkerRef = useRef<L.Marker | null>(null);
  const liveGpsAccuracyCircleRef = useRef<L.Circle | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routeGlowRef = useRef<L.Polyline | null>(null);

  const [isMapMoving, setIsMapMoving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const reverseGeocodeTimeoutRef = useRef<any>(null);
  const isProgrammaticMoveRef = useRef(false);

  // Keep a ref of the current pinMode to avoid stale closures in moveend
  const pinModeRef = useRef<PinMode>(pinMode);
  useEffect(() => {
    pinModeRef.current = pinMode;
  }, [pinMode]);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center: Dhaka Gulshan-2, Bangladesh, or user GPS, or pickup
    const initialLat = pickup?.lat || userLiveGps?.lat || 23.7925;
    const initialLon = pickup?.lon || userLiveGps?.lon || 90.4078;
    const initialZoom = pickup || userLiveGps ? 16 : 14;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });

    const tileUrl = activeKey
      ? `https://maps.geoapify.com/v1/tile/dark-matter-purple-roads/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(
          activeKey
        )}`
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Movestart
    map.on('movestart', () => {
      if (!isProgrammaticMoveRef.current) {
        setIsMapMoving(true);
      }
    });

    // Moveend: reverse geocode center location for active pin mode
    map.on('moveend', () => {
      if (isProgrammaticMoveRef.current) {
        isProgrammaticMoveRef.current = false;
        setIsMapMoving(false);
        return;
      }

      setIsMapMoving(false);
      const center = map.getCenter();

      if (reverseGeocodeTimeoutRef.current) {
        clearTimeout(reverseGeocodeTimeoutRef.current);
      }

      setIsGeocoding(true);
      reverseGeocodeTimeoutRef.current = setTimeout(async () => {
        try {
          const point = await reverseGeocode(center.lat, center.lng, activeKey);
          setCurrentAddress(point.formatted);
          if (pinModeRef.current === 'pickup') {
            onPickupChange(point);
          } else {
            onDropoffChange(point);
          }
        } catch (err) {
          console.warn('Reverse geocode error:', err);
        } finally {
          setIsGeocoding(false);
        }
      }, 350);
    });

    // Click anywhere on map to pan and pinpoint spot
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!isLocationInBangladesh({ lat: e.latlng.lat, lon: e.latlng.lng })) {
        return;
      }
      map.flyTo(e.latlng, Math.max(map.getZoom(), 15), {
        duration: 0.8,
      });
    });

    mapInstanceRef.current = map;

    return () => {
      if (reverseGeocodeTimeoutRef.current) clearTimeout(reverseGeocodeTimeoutRef.current);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [activeKey]);

  // 2. Fly to active target point when switching pin modes or when target changes externally
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const targetPoint = pinMode === 'pickup' ? pickup : dropoff;
    if (targetPoint) {
      setCurrentAddress(targetPoint.formatted);
      const center = map.getCenter();
      const dist = Math.hypot(center.lat - targetPoint.lat, center.lng - targetPoint.lon);
      if (dist > 0.003) {
        isProgrammaticMoveRef.current = true;
        map.flyTo([targetPoint.lat, targetPoint.lon], Math.max(15, map.getZoom()), {
          duration: 0.9,
        });
      }
    } else {
      setCurrentAddress('');
    }
  }, [pinMode, pickup, dropoff]);

  // 3. Render User's Live GPS Dot
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLiveGps) {
      const gpsIcon = L.divIcon({
        className: 'user-live-gps-dot',
        html: `
          <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background: rgba(59, 130, 246, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 14px; height: 14px; border-radius: 9999px; background: #3b82f6; border: 2.5px solid #ffffff; box-shadow: 0 0 12px rgba(59, 130, 246, 0.9);"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      if (!liveGpsMarkerRef.current) {
        liveGpsMarkerRef.current = L.marker([userLiveGps.lat, userLiveGps.lon], {
          icon: gpsIcon,
          zIndexOffset: 800,
        }).addTo(map);
        liveGpsMarkerRef.current.bindPopup('<strong>Your Live GPS Location</strong>');
      } else {
        liveGpsMarkerRef.current.setLatLng([userLiveGps.lat, userLiveGps.lon]);
      }
    } else {
      if (liveGpsMarkerRef.current) {
        map.removeLayer(liveGpsMarkerRef.current);
        liveGpsMarkerRef.current = null;
      }
    }
  }, [userLiveGps]);

  // 4. Render the stationary marker for the non-active point
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // When pinning DROP-OFF, show stationary PICKUP marker
    if (pinMode === 'dropoff' && pickup) {
      if (!pickupMarkerRef.current) {
        const pickupIcon = L.divIcon({
          className: 'stationary-pickup-pin',
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
              <div style="padding: 2px 7px; background: #10b981; color: #000; font-size: 10px; font-weight: 800; border-radius: 9999px; box-shadow: 0 4px 10px rgba(0,0,0,0.6); white-space: nowrap; margin-bottom: 2px;">
                Pickup
              </div>
              <div style="width: 14px; height: 14px; background: #10b981; border: 2px solid #ffffff; border-radius: 9999px; box-shadow: 0 0 8px rgba(16,185,129,0.8);"></div>
            </div>
          `,
          iconSize: [50, 35],
          iconAnchor: [25, 30],
        });

        pickupMarkerRef.current = L.marker([pickup.lat, pickup.lon], {
          icon: pickupIcon,
          zIndexOffset: 500,
        }).addTo(map);
      } else {
        pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lon]);
      }
    } else {
      if (pickupMarkerRef.current) {
        map.removeLayer(pickupMarkerRef.current);
        pickupMarkerRef.current = null;
      }
    }

    // When pinning PICKUP, show stationary DROPOFF marker
    if (pinMode === 'pickup' && dropoff) {
      if (!dropoffMarkerRef.current) {
        const dropoffIcon = L.divIcon({
          className: 'stationary-dropoff-pin',
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
              <div style="padding: 2px 7px; background: #ef4444; color: #fff; font-size: 10px; font-weight: 800; border-radius: 9999px; box-shadow: 0 4px 10px rgba(0,0,0,0.6); white-space: nowrap; margin-bottom: 2px;">
                Drop-off
              </div>
              <div style="width: 14px; height: 14px; background: #ef4444; border: 2px solid #ffffff; border-radius: 9999px; box-shadow: 0 0 8px rgba(239,68,68,0.8);"></div>
            </div>
          `,
          iconSize: [55, 35],
          iconAnchor: [27, 30],
        });

        dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lon], {
          icon: dropoffIcon,
          zIndexOffset: 500,
        }).addTo(map);
      } else {
        dropoffMarkerRef.current.setLatLng([dropoff.lat, dropoff.lon]);
      }
    } else {
      if (dropoffMarkerRef.current) {
        map.removeLayer(dropoffMarkerRef.current);
        dropoffMarkerRef.current = null;
      }
    }
  }, [pinMode, pickup, dropoff]);

  // 5. Render Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeData && routeData.coordinates.length > 0) {
      if (routeGlowRef.current) map.removeLayer(routeGlowRef.current);
      if (routePolylineRef.current) map.removeLayer(routePolylineRef.current);

      // Glow border
      routeGlowRef.current = L.polyline(routeData.coordinates, {
        color: '#000000',
        weight: 8,
        opacity: 0.9,
      }).addTo(map);

      // Route line
      routePolylineRef.current = L.polyline(routeData.coordinates, {
        color: '#10b981',
        weight: 5,
        opacity: 0.95,
        lineJoin: 'round',
      }).addTo(map);
    } else {
      if (routeGlowRef.current) {
        map.removeLayer(routeGlowRef.current);
        routeGlowRef.current = null;
      }
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
    }
  }, [routeData]);

  // Zoom controls
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const isPickupMode = pinMode === 'pickup';

  return (
    <div id="interactive-location-map" className="relative w-full h-full min-h-[460px] rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950">
      {/* Leaflet Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[460px]" />

      {/* DUAL-PIN MODE SWITCHER (Top Left) */}
      <div className="absolute top-4 left-4 z-[999] pointer-events-auto">
        <div className="bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-xl p-1 shadow-xl flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPinModeChange('pickup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isPickupMode
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isPickupMode ? 'bg-black' : 'bg-emerald-400'}`} />
            <span>Pin Pickup</span>
          </button>
          <button
            type="button"
            onClick={() => onPinModeChange('dropoff')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              !isPickupMode
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${!isPickupMode ? 'bg-white' : 'bg-rose-400'}`} />
            <span>Pin Drop-off</span>
          </button>
        </div>
      </div>

      {/* FIXED CENTER PIN (Adapts to Pickup vs Drop-off Mode) */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[1000] flex flex-col items-center transition-transform duration-200 ${
          isMapMoving ? '-translate-y-[calc(100%+14px)] scale-110' : '-translate-y-full scale-100'
        }`}
      >
        {/* Tooltip badge over pin */}
        <div
          className={`bg-zinc-950/95 text-white border shadow-2xl px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap mb-1 ${
            isPickupMode ? 'border-emerald-500/60 text-emerald-300' : 'border-rose-500/60 text-rose-300'
          }`}
        >
          {isGeocoding ? (
            <>
              <Loader2
                className={`w-3.5 h-3.5 animate-spin ${
                  isPickupMode ? 'text-emerald-400' : 'text-rose-400'
                }`}
              />
              <span className="text-zinc-300">Detecting address...</span>
            </>
          ) : (
            <>
              <span
                className={`w-2 h-2 rounded-full animate-ping ${
                  isPickupMode ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <span>{isPickupMode ? 'Pickup Spot Pin' : 'Drop-off Spot Pin'}</span>
            </>
          )}
        </div>

        {/* Pin Icon */}
        <div className="relative flex flex-col items-center">
          <div
            className={`w-9 h-9 rounded-full border-2 border-white flex items-center justify-center shadow-2xl ${
              isPickupMode ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
            }`}
          >
            {isPickupMode ? (
              <Navigation className="w-5 h-5 text-black fill-black rotate-45" />
            ) : (
              <Flag className="w-4 h-4 text-white fill-white" />
            )}
          </div>
          {/* Downward Needle Point */}
          <div
            className={`w-1.5 h-3 rounded-b-full shadow-md ${
              isPickupMode ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
        </div>

        {/* Dynamic Shadow underneath pin */}
        <div
          className={`w-4 h-1.5 bg-black/60 rounded-full blur-[1.5px] transition-all duration-200 ${
            isMapMoving ? 'scale-50 opacity-40 translate-y-3' : 'scale-100 opacity-90 translate-y-0.5'
          }`}
        />
      </div>

      {/* TOP RIGHT / BANNER: Detected Address Info */}
      <div className="absolute top-16 left-4 right-16 z-[999] pointer-events-auto">
        <div className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800/90 rounded-xl px-3.5 py-2 shadow-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${
                isPickupMode
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                {isPickupMode ? 'Pointed Pickup Spot' : 'Pointed Drop-off Spot'}
              </div>
              <div className="text-xs font-semibold text-white truncate">
                {currentAddress || 'Drag map or click anywhere to pinpoint spot'}
              </div>
            </div>
          </div>
          {isGeocoding && (
            <Loader2
              className={`w-4 h-4 animate-spin shrink-0 ${
                isPickupMode ? 'text-emerald-400' : 'text-rose-400'
              }`}
            />
          )}
        </div>
      </div>

      {/* FLOATING CONTROLS (Right Side) */}
      <div className="absolute right-4 bottom-6 z-[999] flex flex-col gap-2 pointer-events-auto">
        {/* GPS Locate Me Button */}
        <button
          type="button"
          onClick={onLocateUser}
          disabled={isLocating}
          title="Locate my GPS position in Bangladesh"
          className="w-10 h-10 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          ) : (
            <LocateFixed className="w-5 h-5 text-emerald-400" />
          )}
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-10 h-10 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer"
        >
          <ZoomIn className="w-5 h-5 text-zinc-300" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-10 h-10 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer"
        >
          <ZoomOut className="w-5 h-5 text-zinc-300" />
        </button>
      </div>

      {/* BOTTOM HINT BANNER */}
      <div className="absolute bottom-3 left-4 z-[999] pointer-events-none">
        <div className="bg-zinc-950/85 backdrop-blur-sm border border-zinc-800/80 rounded-lg px-2.5 py-1 text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
          <Compass
            className={`w-3.5 h-3.5 shrink-0 ${
              isPickupMode ? 'text-emerald-400' : 'text-rose-400'
            }`}
          />
          <span>
            {isPickupMode
              ? 'Move map to adjust pickup arrow'
              : 'Move map to pinpoint destination'}
          </span>
        </div>
      </div>
    </div>
  );
};
