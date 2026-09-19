import React, { useEffect, useRef, useState, useCallback } from 'react';
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
} from 'lucide-react';
import { LocationPoint, RouteData } from '../types';
import { reverseGeocode, DEFAULT_GEOAPIFY_KEY } from '../services/geoapify';
import { isLocationInBangladesh } from '../data/bangladeshDistricts';

interface InteractivePickupMapProps {
  apiKey: string;
  pickup: LocationPoint | null;
  onPickupChange: (point: LocationPoint) => void;
  dropoff: LocationPoint | null;
  routeData: RouteData | null;
  isLocating: boolean;
  onLocateUser: () => void;
}

export const InteractivePickupMap: React.FC<InteractivePickupMapProps> = ({
  apiKey,
  pickup,
  onPickupChange,
  dropoff,
  routeData,
  isLocating,
  onLocateUser,
}) => {
  const activeKey = apiKey.trim() || DEFAULT_GEOAPIFY_KEY;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routeGlowRef = useRef<L.Polyline | null>(null);

  const [isMapMoving, setIsMapMoving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const reverseGeocodeTimeoutRef = useRef<any>(null);
  const isProgrammaticMoveRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center: Dhaka, Bangladesh or current pickup
    const initialLat = pickup?.lat || 23.8103;
    const initialLon = pickup?.lon || 90.4125;
    const initialZoom = pickup ? 16 : 14;

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

    // Map drag and movement handlers
    map.on('movestart', () => {
      if (!isProgrammaticMoveRef.current) {
        setIsMapMoving(true);
      }
    });

    map.on('moveend', () => {
      if (isProgrammaticMoveRef.current) {
        isProgrammaticMoveRef.current = false;
        setIsMapMoving(false);
        return;
      }

      setIsMapMoving(false);
      const center = map.getCenter();

      // Trigger reverse geocoding for new center
      if (reverseGeocodeTimeoutRef.current) {
        clearTimeout(reverseGeocodeTimeoutRef.current);
      }

      setIsGeocoding(true);
      reverseGeocodeTimeoutRef.current = setTimeout(async () => {
        try {
          const point = await reverseGeocode(center.lat, center.lng, activeKey);
          setCurrentAddress(point.formatted);
          onPickupChange(point);
        } catch (err) {
          console.warn('Reverse geocode error:', err);
        } finally {
          setIsGeocoding(false);
        }
      }, 350);
    });

    // Click anywhere on map to pan and set pickup
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

  // Sync address label with pickup prop
  useEffect(() => {
    if (pickup) {
      setCurrentAddress(pickup.formatted);
      if (mapInstanceRef.current) {
        const center = mapInstanceRef.current.getCenter();
        const dist = Math.hypot(center.lat - pickup.lat, center.lng - pickup.lon);
        // Only fly to if significantly different from center (avoid feedback loop when dragging)
        if (dist > 0.003) {
          isProgrammaticMoveRef.current = true;
          mapInstanceRef.current.flyTo([pickup.lat, pickup.lon], Math.max(15, mapInstanceRef.current.getZoom()), {
            duration: 0.9,
          });
        }
      }
    }
  }, [pickup]);

  // Render Drop-off marker & Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Dropoff Marker
    if (dropoff) {
      if (!dropoffMarkerRef.current) {
        const dropoffIcon = L.divIcon({
          className: 'uber-dropoff-pin',
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
              <div style="padding: 3px 8px; background: #ef4444; color: #fff; font-size: 10px; font-weight: bold; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0,0,0,0.7); white-space: nowrap; margin-bottom: 2px;">
                Drop-off
              </div>
              <div style="width: 18px; height: 18px; background: #ef4444; border: 3px solid #ffffff; border-radius: 4px; transform: rotate(45deg); box-shadow: 0 0 10px rgba(239,68,68,0.8);"></div>
            </div>
          `,
          iconSize: [60, 40],
          iconAnchor: [30, 38],
        });

        dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lon], {
          icon: dropoffIcon,
          zIndexOffset: 500,
        }).addTo(map);
      } else {
        dropoffMarkerRef.current.setLatLng([dropoff.lat, dropoff.lon]);
      }
      dropoffMarkerRef.current.bindPopup(`<strong>Drop-off:</strong> ${dropoff.formatted}`);
    } else {
      if (dropoffMarkerRef.current) {
        map.removeLayer(dropoffMarkerRef.current);
        dropoffMarkerRef.current = null;
      }
    }

    // Route Polyline
    if (routeData && routeData.coordinates.length > 0) {
      if (routeGlowRef.current) map.removeLayer(routeGlowRef.current);
      if (routePolylineRef.current) map.removeLayer(routePolylineRef.current);

      // Glow border
      routeGlowRef.current = L.polyline(routeData.coordinates, {
        color: '#000000',
        weight: 8,
        opacity: 0.9,
      }).addTo(map);

      // Emerald navigation line
      routePolylineRef.current = L.polyline(routeData.coordinates, {
        color: '#10b981',
        weight: 5,
        opacity: 0.95,
        lineJoin: 'round',
      }).addTo(map);

      // Fit bounds to route
      isProgrammaticMoveRef.current = true;
      map.fitBounds(routePolylineRef.current.getBounds(), {
        padding: [60, 60],
        maxZoom: 16,
      });
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
  }, [dropoff, routeData]);

  // Zoom controls
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  return (
    <div id="interactive-pickup-map-container" className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950">
      {/* Leaflet Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[420px]" />

      {/* FIXED UBER-STYLE CENTER ARROW & PICKUP PIN */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[1000] flex flex-col items-center transition-transform duration-200 ${
          isMapMoving ? '-translate-y-[calc(100%+14px)] scale-110' : '-translate-y-full scale-100'
        }`}
      >
        {/* Tooltip badge over pin */}
        <div className="bg-zinc-950/95 text-white border border-amber-500/60 shadow-2xl px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap mb-1">
          {isGeocoding ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-zinc-300">Detecting address...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-amber-400">Pickup Spot</span>
            </>
          )}
        </div>

        {/* Uber Arrow Pin Icon */}
        <div className="relative flex flex-col items-center">
          <div className="w-9 h-9 rounded-full bg-amber-400 border-2 border-black flex items-center justify-center shadow-2xl text-black">
            <Navigation className="w-5 h-5 text-black fill-black rotate-45" />
          </div>
          {/* Downward Needle Point */}
          <div className="w-1.5 h-3 bg-amber-400 rounded-b-full shadow-md" />
        </div>

        {/* Dynamic Shadow underneath pin */}
        <div
          className={`w-4 h-1.5 bg-black/60 rounded-full blur-[1.5px] transition-all duration-200 ${
            isMapMoving ? 'scale-50 opacity-40 translate-y-3' : 'scale-100 opacity-90 translate-y-0.5'
          }`}
        />
      </div>

      {/* TOP STATUS BAR: Detected Address */}
      <div className="absolute top-4 left-4 right-16 z-[999] pointer-events-auto">
        <div className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800/90 rounded-xl px-3.5 py-2.5 shadow-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                Pointed Pickup Location (Bangladesh)
              </div>
              <div className="text-xs font-semibold text-white truncate">
                {currentAddress || 'Move map to point out your pickup spot'}
              </div>
            </div>
          </div>
          {isGeocoding && <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />}
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
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
          ) : (
            <LocateFixed className="w-5 h-5 text-amber-400" />
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
        <div className="bg-zinc-950/80 backdrop-blur-sm border border-zinc-800/80 rounded-lg px-2.5 py-1 text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Move map or click to adjust pickup arrow</span>
        </div>
      </div>
    </div>
  );
};
