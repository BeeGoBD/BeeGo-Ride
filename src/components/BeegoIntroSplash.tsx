import React, { useEffect, useState } from 'react';
import { MapPin, ArrowRight, Loader2 } from 'lucide-react';

interface BeegoIntroSplashProps {
  onComplete: () => void;
}

export const BeegoIntroSplash: React.FC<BeegoIntroSplashProps> = ({ onComplete }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  // Directly requests real native device location with full user activation
  const requestDeviceLocation = () => {
    setIsRequestingLocation(true);
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          (window as any).__BEEGO_LIVE_GPS__ = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: Date.now(),
          };
          finishSplash();
        },
        (err) => {
          console.warn('[Splash] Geolocation response:', err.message);
          finishSplash();
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } else {
      finishSplash();
    }
  };

  const finishSplash = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 200);
  };

  useEffect(() => {
    // Initial request attempt on launch
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          (window as any).__BEEGO_LIVE_GPS__ = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: Date.now(),
          };
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    // Auto-advance after 3.5 seconds if user doesn't tap
    const timer = setTimeout(() => {
      finishSplash();
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      id="beego-intro-splash"
      onClick={requestDeviceLocation}
      className={`fixed inset-0 z-50 bg-white flex flex-col items-center justify-between p-6 select-none cursor-pointer transition-opacity duration-300 max-w-[430px] mx-auto ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        {/* B Image Emblem */}
        <div className="w-22 h-22 rounded-3xl bg-[#F5C518] flex items-center justify-center shadow-lg shadow-amber-400/25">
          <span className="text-5xl font-black text-black font-sans leading-none tracking-tight select-none">
            B
          </span>
        </div>

        {/* BeeGo Text */}
        <h1 className="text-3xl font-black tracking-tight text-[#1A1A1A] mt-4 select-none">
          BeeGo
        </h1>
        <p className="text-xs font-semibold text-zinc-500 mt-1">
          Electric Mobility & Rapid Dispatch
        </p>
      </div>

      {/* Prominent Action to Trigger Real WebView / Browser Permission on Tap */}
      <div className="w-full pb-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            requestDeviceLocation();
          }}
          disabled={isRequestingLocation}
          className="w-full py-4 px-5 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-xs transition-all shadow-xl shadow-amber-500/25 cursor-pointer flex items-center justify-center gap-2"
        >
          {isRequestingLocation ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>Allowing Real GPS Access...</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 text-black fill-black" />
              <span>Allow Location & Continue</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </>
          )}
        </button>
        <p className="text-[10px] text-zinc-400 text-center mt-2.5">
          Tap to grant device GPS permission for instant pickup dispatch
        </p>
      </div>
    </div>
  );
};
