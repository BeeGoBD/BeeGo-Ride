import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  LocateFixed,
  ZoomIn,
  ZoomOut,
  MapPin,
  Loader2,
  Navigation,
  Compass,
  CheckCircle2,
  Target,
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
  routeData,
  isLocating,
  onLocateUser,
  userLiveGps,
}) => {
  const activeKey = apiKey.trim() || DEFAULT_GEOAPIFY_KEY;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Markers
  const liveGpsMarkerRef = useRef<L.Marker | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routeGlowRef = useRef<L.Polyline | null>(null);

  const [isClickGeocoding, setIsClickGeocoding] = useState(false);
  const [clickedAddress, setClickedAddress] = useState<string | null>(null);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on user live GPS or pickup, default Dhaka
    const initialLat = userLiveGps?.lat || pickup?.lat || 23.7925;
    const initialLon = userLiveGps?.lon || pickup?.lon || 90.4078;
    const initialZoom = userLiveGps || pickup ? 15 : 13;

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

    // Click on map to adjust pickup location if desired
    map.on('click', async (e: L.LeafletMouseEvent) => {
      if (!isLocationInBangladesh({ lat: e.latlng.lat, lon: e.latlng.lng })) {
        return;
      }

      setIsClickGeocoding(true);
      try {
        const point = await reverseGeocode(e.latlng.lat, e.latlng.lng, activeKey);
        setClickedAddress(point.formatted);
        onPickupChange(point);
      } catch (err) {
        console.warn('Click reverse geocode failed:', err);
      } finally {
        setIsClickGeocoding(false);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [activeKey]);

  // 2. Render Passenger's Live GPS Beacon
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLiveGps) {
      const gpsIcon = L.divIcon({
        className: 'user-live-gps-beacon',
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background: rgba(16, 185, 129, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 16px; height: 16px; border-radius: 9999px; background: #10b981; border: 3px solid #ffffff; box-shadow: 0 0 16px rgba(16, 185, 129, 0.95);"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (!liveGpsMarkerRef.current) {
        liveGpsMarkerRef.current = L.marker([userLiveGps.lat, userLiveGps.lon], {
          icon: gpsIcon,
          zIndexOffset: 1000,
        }).addTo(map);
        liveGpsMarkerRef.current.bindPopup('<strong>You are here (Live Location)</strong>');
      } else {
        liveGpsMarkerRef.current.setLatLng([userLiveGps.lat, userLiveGps.lon]);
      }

      // If no dropoff is set and pickup was just set, center on user
      if (!dropoff && pickup) {
        map.panTo([userLiveGps.lat, userLiveGps.lon], { animate: true });
      }
    } else {
      if (liveGpsMarkerRef.current) {
        map.removeLayer(liveGpsMarkerRef.current);
        liveGpsMarkerRef.current = null;
      }
    }
  }, [userLiveGps, dropoff, pickup]);

  // 3. Render Pickup Marker (Green Pin)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pickup) {
      const pickupIcon = L.divIcon({
        className: 'pickup-marker-icon',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: grab;">
            <div style="padding: 3px 8px; background: #10b981; color: #000; font-size: 11px; font-weight: 800; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0,0,0,0.8); white-space: nowrap; margin-bottom: 3px; border: 1px solid #ffffff;">
              📍 Pickup Spot
            </div>
            <div style="width: 18px; height: 18px; background: #10b981; border: 3px solid #ffffff; border-radius: 9999px; box-shadow: 0 0 12px rgba(16,185,129,0.9);"></div>
          </div>
        `,
        iconSize: [90, 42],
        iconAnchor: [45, 38],
      });

      if (!pickupMarkerRef.current) {
        const marker = L.marker([pickup.lat, pickup.lon], {
          icon: pickupIcon,
          draggable: true,
          zIndexOffset: 850,
        }).addTo(map);

        marker.bindPopup(`<strong>Pickup Location:</strong><br/>${pickup.formatted}`);

        // Drag end to reposition pickup
        marker.on('dragend', async () => {
          const newPos = marker.getLatLng();
          if (isLocationInBangladesh({ lat: newPos.lat, lon: newPos.lng })) {
            try {
              const pt = await reverseGeocode(newPos.lat, newPos.lng, activeKey);
              onPickupChange(pt);
            } catch (e) {
              console.warn(e);
            }
          }
        });

        pickupMarkerRef.current = marker;
      } else {
        pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lon]);
        pickupMarkerRef.current.setPopupContent(`<strong>Pickup Location:</strong><br/>${pickup.formatted}`);
      }
    } else {
      if (pickupMarkerRef.current) {
        map.removeLayer(pickupMarkerRef.current);
        pickupMarkerRef.current = null;
      }
    }
  }, [pickup, activeKey, onPickupChange]);

  // 4. Render Drop-off Marker (Red Pin - ONLY when dropoff is chosen!)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (dropoff) {
      const dropoffIcon = L.divIcon({
        className: 'dropoff-marker-icon',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="padding: 3px 8px; background: #ef4444; color: #fff; font-size: 11px; font-weight: 800; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0,0,0,0.8); white-space: nowrap; margin-bottom: 3px; border: 1px solid #ffffff;">
              🏁 Destination
            </div>
            <div style="width: 18px; height: 18px; background: #ef4444; border: 3px solid #ffffff; border-radius: 9999px; box-shadow: 0 0 12px rgba(239,68,68,0.9);"></div>
          </div>
        `,
        iconSize: [90, 42],
        iconAnchor: [45, 38],
      });

      if (!dropoffMarkerRef.current) {
        const marker = L.marker([dropoff.lat, dropoff.lon], {
          icon: dropoffIcon,
          zIndexOffset: 850,
        }).addTo(map);

        marker.bindPopup(`<strong>Drop-off Location:</strong><br/>${dropoff.formatted}`);
        dropoffMarkerRef.current = marker;
      } else {
        dropoffMarkerRef.current.setLatLng([dropoff.lat, dropoff.lon]);
        dropoffMarkerRef.current.setPopupContent(`<strong>Drop-off Location:</strong><br/>${dropoff.formatted}`);
      }
    } else {
      if (dropoffMarkerRef.current) {
        map.removeLayer(dropoffMarkerRef.current);
        dropoffMarkerRef.current = null;
      }
    }
  }, [dropoff]);

  // 5. Render Route Polyline & Auto Fit Bounds
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeData && routeData.coordinates.length > 0) {
      if (routeGlowRef.current) map.removeLayer(routeGlowRef.current);
      if (routePolylineRef.current) map.removeLayer(routePolylineRef.current);

      // Black glow
      routeGlowRef.current = L.polyline(routeData.coordinates, {
        color: '#000000',
        weight: 8,
        opacity: 0.9,
      }).addTo(map);

      // Emerald route line
      routePolylineRef.current = L.polyline(routeData.coordinates, {
        color: '#10b981',
        weight: 5,
        opacity: 0.95,
        lineJoin: 'round',
      }).addTo(map);

      // Fit bounds to show entire journey
      try {
        const bounds = L.latLngBounds(routeData.coordinates);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } catch (err) {
        console.warn('fitBounds error:', err);
      }
    } else {
      if (routeGlowRef.current) {
        map.removeLayer(routeGlowRef.current);
        routeGlowRef.current = null;
      }
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }

      // If no route and user has pickup or GPS, center on pickup
      if (pickup && !dropoff) {
        map.setView([pickup.lat, pickup.lon], Math.max(map.getZoom(), 15));
      }
    }
  }, [routeData, pickup, dropoff]);

  // Re-center on live GPS
  const handleRecenterGps = () => {
    onLocateUser();
    if (userLiveGps && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLiveGps.lat, userLiveGps.lon], 16, {
        duration: 0.8,
      });
    }
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  return (
    <div
      id="interactive-location-map"
      className="relative w-full h-full min-h-[460px] rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950"
    >
      {/* Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[460px]" />

      {/* TOP STATUS BAR: Live Location & Map Guidance */}
      <div className="absolute top-4 left-4 right-16 z-[999] pointer-events-auto">
        <div className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800/90 rounded-xl px-3.5 py-2.5 shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '10s' }} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Map View • Bangladesh
              </div>
              <div className="text-xs font-semibold text-white truncate">
                {pickup ? (
                  <span>Pickup: {pickup.addressLine1 || pickup.formatted}</span>
                ) : (
                  <span>Detecting your live location...</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick instructions or geocoding status */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0 text-[11px] text-zinc-400">
            {isClickGeocoding ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Setting pickup spot...
              </span>
            ) : (
              <span className="text-zinc-500">Click map to adjust pickup</span>
            )}
          </div>
        </div>
      </div>

      {/* FLOATING MAP CONTROLS (Right Side) */}
      <div className="absolute right-4 bottom-6 z-[999] flex flex-col gap-2 pointer-events-auto">
        {/* Recenter Live Location Button */}
        <button
          type="button"
          onClick={handleRecenterGps}
          disabled={isLocating}
          className="w-10 h-10 rounded-xl bg-zinc-900/95 hover:bg-emerald-600 active:bg-emerald-700 text-white border border-zinc-700 hover:border-emerald-400 shadow-xl flex items-center justify-center transition-all cursor-pointer group"
          title="Recenter on my live location"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          ) : (
            <LocateFixed className="w-5 h-5 text-emerald-400 group-hover:text-white transition-colors" />
          )}
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-xl bg-zinc-900/95 hover:bg-zinc-800 active:bg-zinc-700 text-white border border-zinc-700 shadow-xl flex items-center justify-center transition-all cursor-pointer"
          title="Zoom in"
        >
          <ZoomIn className="w-5 h-5 text-zinc-300" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-xl bg-zinc-900/95 hover:bg-zinc-800 active:bg-zinc-700 text-white border border-zinc-700 shadow-xl flex items-center justify-center transition-all cursor-pointer"
          title="Zoom out"
        >
          <ZoomOut className="w-5 h-5 text-zinc-300" />
        </button>
      </div>

      {/* BOTTOM INFO CHIP */}
      <div className="absolute bottom-4 left-4 z-[999] pointer-events-none">
        <div className="bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] text-zinc-300 font-medium">
            {dropoff ? 'Route calculated • Ready to request' : 'Type destination below to calculate fare'}
          </span>
        </div>
      </div>
    </div>
  );
};
