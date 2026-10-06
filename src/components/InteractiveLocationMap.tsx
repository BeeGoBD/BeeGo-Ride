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
  Check,
  Crosshair,
} from 'lucide-react';
import { LocationPoint, RouteData } from '../types';
import { reverseGeocode, DEFAULT_GEOAPIFY_KEY } from '../services/geoapify';
import { isLocationInBangladesh } from '../data/bangladeshDistricts';
import { getDefaultSpot } from '../services/geolocation';

export type PinMode = 'pickup' | 'dropoff';

interface InteractiveLocationMapProps {
  apiKey: string;
  pickup: LocationPoint | null;
  onPickupChange: (point: LocationPoint) => void;
  dropoff: LocationPoint | null;
  onDropoffChange: (point: LocationPoint) => void;
  pinMode?: PinMode;
  onPinModeChange?: (mode: PinMode) => void;
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
  pinMode: externalPinMode,
  onPinModeChange,
  routeData,
  isLocating,
  onLocateUser,
  userLiveGps,
}) => {
  const activeKey = apiKey.trim() || DEFAULT_GEOAPIFY_KEY;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Local pin mode if not controlled externally
  const [internalPinMode, setInternalPinMode] = useState<PinMode>('dropoff');
  const currentPinMode = externalPinMode || internalPinMode;

  const setPinMode = (mode: PinMode) => {
    if (onPinModeChange) {
      onPinModeChange(mode);
    } else {
      setInternalPinMode(mode);
    }
  };

  // Keep references to active state for map event listeners
  const pickupRef = useRef(pickup);
  pickupRef.current = pickup;
  const dropoffRef = useRef(dropoff);
  dropoffRef.current = dropoff;
  const currentPinModeRef = useRef(currentPinMode);
  currentPinModeRef.current = currentPinMode;

  // Markers & Layers
  const liveGpsMarkerRef = useRef<L.Marker | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routeGlowRef = useRef<L.Polyline | null>(null);
  const walkingGuideRef = useRef<L.Polyline | null>(null);

  const [isClickGeocoding, setIsClickGeocoding] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const defaultSpot = getDefaultSpot();
    const initialLat = userLiveGps?.lat || pickup?.lat || defaultSpot.lat;
    const initialLon = userLiveGps?.lon || pickup?.lon || defaultSpot.lon;
    const initialZoom = userLiveGps || pickup ? 15 : 13;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
      dragging: true,
      preferCanvas: true,
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const tileUrl = activeKey
      ? `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(
          activeKey
        )}`
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Click on map to set pickup or destination depending on mode or current state
    map.on('click', async (e: L.LeafletMouseEvent) => {
      if (!isLocationInBangladesh({ lat: e.latlng.lat, lon: e.latlng.lng })) {
        return;
      }

      // Determine target: if pickup is already set and dropoff is not, default to dropoff
      const targetMode: PinMode =
        currentPinModeRef.current === 'pickup'
          ? 'pickup'
          : !pickupRef.current
          ? 'pickup'
          : 'dropoff';

      setIsClickGeocoding(true);
      setStatusNotification(
        targetMode === 'pickup' ? 'Updating pickup spot...' : 'Setting destination...'
      );

      try {
        const point = await reverseGeocode(e.latlng.lat, e.latlng.lng, activeKey);
        if (targetMode === 'pickup') {
          onPickupChange(point);
          setStatusNotification(`Pickup set: ${point.addressLine1 || point.name || 'Location selected'}`);
        } else {
          onDropoffChange(point);
          setStatusNotification(`Destination set: ${point.addressLine1 || point.name || 'Location selected'}`);
        }
      } catch (err) {
        console.warn('Map tap geocode notice:', err);
        setStatusNotification(null);
      } finally {
        setIsClickGeocoding(false);
        setTimeout(() => setStatusNotification(null), 3000);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [activeKey]);

  // 2. Render Passenger's Live GPS Beacon with High-End Radar Pulse
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLiveGps) {
      const gpsIcon = L.divIcon({
        className: 'user-live-gps-beacon',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background: rgba(16, 185, 129, 0.28); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 26px; height: 26px; border-radius: 9999px; background: rgba(16, 185, 129, 0.15); border: 1.5px solid rgba(16, 185, 129, 0.5);"></div>
            <div style="position: relative; z-index: 2; width: 15px; height: 15px; border-radius: 9999px; background: #10b981; border: 3px solid #ffffff; box-shadow: 0 0 16px rgba(16, 185, 129, 0.95);"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (!liveGpsMarkerRef.current) {
        liveGpsMarkerRef.current = L.marker([userLiveGps.lat, userLiveGps.lon], {
          icon: gpsIcon,
          zIndexOffset: 1000,
        }).addTo(map);
        if (!pickup) {
          map.flyTo([userLiveGps.lat, userLiveGps.lon], 15, { duration: 1 });
        }
      } else {
        liveGpsMarkerRef.current.setLatLng([userLiveGps.lat, userLiveGps.lon]);
      }

      // Render Uber-style dotted walking guide to pickup spot if user is walking to pickup
      if (pickup && (Math.abs(userLiveGps.lat - pickup.lat) > 0.0001 || Math.abs(userLiveGps.lon - pickup.lon) > 0.0001)) {
        const walkingCoords: [number, number][] = [
          [userLiveGps.lat, userLiveGps.lon],
          [pickup.lat, pickup.lon],
        ];

        if (!walkingGuideRef.current) {
          walkingGuideRef.current = L.polyline(walkingCoords, {
            color: '#10B981',
            weight: 3.5,
            dashArray: '3, 8',
            opacity: 0.85,
            lineCap: 'round',
          }).addTo(map);
        } else {
          walkingGuideRef.current.setLatLngs(walkingCoords);
        }
      } else {
        if (walkingGuideRef.current) {
          map.removeLayer(walkingGuideRef.current);
          walkingGuideRef.current = null;
        }
      }
    } else {
      if (liveGpsMarkerRef.current) {
        map.removeLayer(liveGpsMarkerRef.current);
        liveGpsMarkerRef.current = null;
      }
      if (walkingGuideRef.current) {
        map.removeLayer(walkingGuideRef.current);
        walkingGuideRef.current = null;
      }
    }
  }, [userLiveGps, pickup]);

  // 3. Render Luxury Pickup Marker (Emerald Pin with Micro Badge)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pickup) {
      const pickupIcon = L.divIcon({
        className: 'pickup-marker-icon',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: grab; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.18));">
            <!-- Pill Header -->
            <div style="background: #10b981; padding: 4px 10px; border-radius: 9999px; border: 2px solid #ffffff; box-shadow: 0 4px 12px rgba(16,185,129,0.35); display: flex; align-items: center; gap: 5px; white-space: nowrap; margin-bottom: 2px;">
              <span style="width: 6px; height: 6px; border-radius: 9999px; background: #ffffff; display: inline-block;"></span>
              <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase;">Pickup</span>
            </div>
            <!-- Pin Body -->
            <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 100%; height: 100%; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: 2.5px solid #ffffff; box-shadow: 0 4px 16px rgba(16,185,129,0.4);"></div>
              <div style="position: relative; z-index: 2; width: 10px; height: 10px; border-radius: 9999px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
            </div>
            <!-- Ground Anchor Shadow -->
            <div style="width: 14px; height: 4px; border-radius: 50%; background: rgba(0,0,0,0.25); filter: blur(1.5px); margin-top: 1px;"></div>
          </div>
        `,
        iconSize: [84, 52],
        iconAnchor: [42, 50],
      });

      if (!pickupMarkerRef.current) {
        const marker = L.marker([pickup.lat, pickup.lon], {
          icon: pickupIcon,
          draggable: true,
          zIndexOffset: 850,
        }).addTo(map);

        marker.bindPopup(`<strong>Pickup Location:</strong><br/>${pickup.formatted}`);

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

  // 4. Render Luxury Drop-off Marker (Midnight Black & Golden Diamond Pin)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (dropoff) {
      const dropoffIcon = L.divIcon({
        className: 'dropoff-marker-icon',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: grab; filter: drop-shadow(0 8px 18px rgba(0,0,0,0.25));">
            <!-- Pill Header -->
            <div style="background: #1A1A1A; padding: 4px 10px; border-radius: 9999px; border: 2px solid #F5C518; box-shadow: 0 4px 14px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 5px; white-space: nowrap; margin-bottom: 2px;">
              <span style="width: 6px; height: 6px; border-radius: 9999px; background: #F5C518; display: inline-block;"></span>
              <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase;">Destination</span>
            </div>
            <!-- Pin Body -->
            <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 100%; height: 100%; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: linear-gradient(135deg, #27272a 0%, #09090b 100%); border: 2.5px solid #F5C518; box-shadow: 0 4px 16px rgba(0,0,0,0.4);"></div>
              <div style="position: relative; z-index: 2; width: 10px; height: 10px; border-radius: 9999px; background: #F5C518; box-shadow: 0 1px 4px rgba(245,197,24,0.5);"></div>
            </div>
            <!-- Ground Anchor Shadow -->
            <div style="width: 14px; height: 4px; border-radius: 50%; background: rgba(0,0,0,0.3); filter: blur(1.5px); margin-top: 1px;"></div>
          </div>
        `,
        iconSize: [96, 52],
        iconAnchor: [48, 50],
      });

      if (!dropoffMarkerRef.current) {
        const marker = L.marker([dropoff.lat, dropoff.lon], {
          icon: dropoffIcon,
          draggable: true,
          zIndexOffset: 900,
        }).addTo(map);

        marker.bindPopup(`<strong>Drop-off Location:</strong><br/>${dropoff.formatted}`);

        marker.on('dragend', async () => {
          const newPos = marker.getLatLng();
          if (isLocationInBangladesh({ lat: newPos.lat, lon: newPos.lng })) {
            try {
              const pt = await reverseGeocode(newPos.lat, newPos.lng, activeKey);
              onDropoffChange(pt);
            } catch (e) {
              console.warn(e);
            }
          }
        });

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
  }, [dropoff, activeKey, onDropoffChange]);

  // 5. Render High-End Route Polyline & Dynamic Bounds Fitting
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeData && routeData.coordinates.length > 0) {
      if (routeGlowRef.current) map.removeLayer(routeGlowRef.current);
      if (routePolylineRef.current) map.removeLayer(routePolylineRef.current);

      // Deep dark casing
      routeGlowRef.current = L.polyline(routeData.coordinates, {
        color: '#09090b',
        weight: 8,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // BeeGo Voltx signature radiant golden inner track
      routePolylineRef.current = L.polyline(routeData.coordinates, {
        color: '#F5C518',
        weight: 5,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      try {
        const bounds = L.latLngBounds(routeData.coordinates);
        map.fitBounds(bounds, {
          paddingTopLeft: [70, 30],
          paddingBottomRight: [30, 260],
          maxZoom: 16,
          animate: true,
        });
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

      if (pickup && !dropoff) {
        map.flyTo([pickup.lat, pickup.lon], Math.max(map.getZoom(), 16), {
          duration: 0.8,
        });
      }
    }
  }, [routeData, pickup, dropoff]);

  // Handler: Fit entire journey route into view smoothly
  const handleFitJourneyRoute = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeData && routeData.coordinates.length > 0) {
      try {
        const bounds = L.latLngBounds(routeData.coordinates);
        map.fitBounds(bounds, {
          paddingTopLeft: [70, 30],
          paddingBottomRight: [30, 260],
          maxZoom: 16,
          animate: true,
        });
      } catch (e) {
        console.warn(e);
      }
    } else if (pickup && dropoff) {
      const bounds = L.latLngBounds([
        [pickup.lat, pickup.lon],
        [dropoff.lat, dropoff.lon],
      ]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    } else if (pickup) {
      map.flyTo([pickup.lat, pickup.lon], 16, { duration: 0.8 });
    } else if (userLiveGps) {
      map.flyTo([userLiveGps.lat, userLiveGps.lon], 16, { duration: 0.8 });
    }
  };

  // Handler: Re-center on live GPS with smooth flyTo animation
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
      className="relative w-full h-full min-h-[460px] overflow-hidden bg-zinc-100"
    >
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[460px] relative z-0 touch-pan-x touch-pan-y" />

      {/* FLOATING NOTIFICATION TOAST (Map Tap Geocoding Feedback) */}
      {(isClickGeocoding || statusNotification) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[995] pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-2 rounded-full bg-zinc-900/90 text-white backdrop-blur-md border border-zinc-700/80 shadow-xl flex items-center gap-2 text-xs font-bold">
            {isClickGeocoding ? (
              <Loader2 className="w-3.5 h-3.5 text-[#F5C518] animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{statusNotification}</span>
          </div>
        </div>
      )}

      {/* LUXURY FLOATING MAP CONTROL DOCK (Right Side - Million Dollar Precision) */}
      <div className="absolute right-3.5 top-28 sm:top-24 z-[990] flex flex-col gap-2.5 pointer-events-auto">
        {/* 1. Journey Route Overview (Active when route exists) */}
        {routeData && (
          <button
            type="button"
            onClick={handleFitJourneyRoute}
            className="w-11 h-11 rounded-2xl bg-white hover:bg-[#FFF9E6] active:bg-[#F5C518] text-[#1A1A1A] border border-amber-300 shadow-[0_8px_24px_rgba(245,197,24,0.22)] flex items-center justify-center transition-all cursor-pointer group active:scale-95"
            title="Overview entire route"
          >
            <Navigation className="w-5 h-5 text-[#E6A800] group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* 2. Recenter on User GPS with Live Indicator */}
        <button
          type="button"
          onClick={handleRecenterGps}
          disabled={isLocating}
          className={`w-11 h-11 rounded-2xl bg-white/95 backdrop-blur-md hover:bg-zinc-50 border border-zinc-200/90 shadow-[0_8px_24px_rgba(0,0,0,0.08)] flex items-center justify-center transition-all cursor-pointer group active:scale-95 ${
            userLiveGps ? 'text-emerald-600' : 'text-zinc-600'
          }`}
          title="Recenter on my live location"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 text-[#E6A800] animate-spin" />
          ) : (
            <LocateFixed className="w-5 h-5 group-hover:scale-110 transition-transform" />
          )}
        </button>

        {/* 3. Pick Point Mode Selector (Pickup vs Destination) */}
        <button
          type="button"
          onClick={() => setPinMode(currentPinMode === 'pickup' ? 'dropoff' : 'pickup')}
          className={`w-11 h-11 rounded-2xl bg-white/95 backdrop-blur-md border shadow-[0_8px_24px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center transition-all cursor-pointer group active:scale-95 ${
            currentPinMode === 'pickup'
              ? 'border-emerald-300 hover:bg-emerald-50/50'
              : 'border-zinc-300 hover:bg-zinc-50'
          }`}
          title={`Click on map sets: ${currentPinMode === 'pickup' ? 'Pickup' : 'Destination'} (Tap to switch)`}
        >
          <MapPin
            className={`w-4 h-4 ${
              currentPinMode === 'pickup' ? 'text-emerald-600' : 'text-zinc-900'
            } group-hover:scale-110 transition-transform`}
          />
          <span
            className={`text-[8px] font-black uppercase tracking-tighter leading-none mt-0.5 ${
              currentPinMode === 'pickup' ? 'text-emerald-700' : 'text-zinc-700'
            }`}
          >
            {currentPinMode === 'pickup' ? 'Pick' : 'Drop'}
          </span>
        </button>

        {/* 4. Unified Apple-Style Zoom Capsule */}
        <div className="flex flex-col bg-white/95 backdrop-blur-md rounded-2xl border border-zinc-200/90 shadow-[0_8px_24px_rgba(0,0,0,0.08)] overflow-hidden divide-y divide-zinc-200/80">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-11 h-10 hover:bg-zinc-100/80 active:bg-zinc-200 flex items-center justify-center text-zinc-700 hover:text-black transition-colors cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-11 h-10 hover:bg-zinc-100/80 active:bg-zinc-200 flex items-center justify-center text-zinc-700 hover:text-black transition-colors cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
