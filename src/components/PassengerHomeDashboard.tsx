import React, { useState } from 'react';
import {
  Bike,
  Car,
  Search,
  MapPin,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Clock,
  Navigation,
  Tag,
  Zap,
  Package,
  ArrowRight,
  Plane,
  Building2,
  Train,
  Copy,
  Check,
  Lock,
} from 'lucide-react';
import { RATE_PER_KM_TAKA } from '../services/rideSync';

interface PassengerHomeDashboardProps {
  onTakeRide: (suggestedDropoff?: string) => void;
  userLiveAddress?: string | null;
}

export const PassengerHomeDashboard: React.FC<PassengerHomeDashboardProps> = ({
  onTakeRide,
  userLiveAddress,
}) => {
  const [copiedPromo, setCopiedPromo] = useState(false);

  const handleCopyPromo = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText('BEEGOFIRST');
    setCopiedPromo(true);
    setTimeout(() => setCopiedPromo(false), 2000);
  };

  return (
    <div
      id="passenger-home-dashboard"
      className="w-full flex-1 flex flex-col justify-start px-3.5 py-3 overflow-y-auto no-scrollbar gap-3 select-none"
    >
      {/* 1. TOP ANDROID STATUS STRIP (Zero Scroll) */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-mono font-bold text-zinc-400">
              Live Location
            </div>
            <div className="text-xs font-bold text-white truncate max-w-[180px] sm:max-w-xs">
              {userLiveAddress || 'Dhaka Metro • Bangladesh'}
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-[11px] font-mono text-amber-300 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-bold">৳{RATE_PER_KM_TAKA}/km</span>
        </div>
      </div>

      {/* 2. HERO "WHERE TO?" ONE-TAP BOOKING CARD (Zero Scroll) */}
      <div className="relative rounded-2xl bg-zinc-950 border border-zinc-800/90 p-3.5 shadow-xl overflow-hidden">
        {/* Ambient subtle bee glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
            <span>Take Your Ride</span>
            <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/30">
              MOTO
            </span>
          </span>
          <span className="text-[10px] font-mono text-zinc-400">Instant GPS Dispatch</span>
        </div>

        {/* Big Android Search Bar Button */}
        <button
          id="take-your-ride-hero-btn"
          type="button"
          onClick={() => onTakeRide()}
          className="w-full p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 active:bg-zinc-800 border border-zinc-700/80 hover:border-amber-400/80 flex items-center justify-between text-left transition-all shadow-md cursor-pointer active:scale-[0.98] group/bar"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-black flex items-center justify-center font-bold shadow-sm shrink-0 group-hover/bar:bg-amber-300 transition-colors">
              <Search className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white group-hover/bar:text-amber-400 transition-colors">
                Where to?
              </div>
              <div className="text-[11px] text-zinc-400 truncate">
                Search Dhaka or Bangladesh district...
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 text-[11px] font-black text-black group-hover/bar:bg-amber-300 transition-all shrink-0 shadow-sm shadow-amber-400/20">
            <span>Book</span>
            <ArrowRight className="w-3 h-3 stroke-[2.5]" />
          </div>
        </button>
      </div>

      {/* 3. QUICK DESTINATION BUTTONS (Zero Scroll - Instant 1-tap route launch) */}
      <div>
        <div className="text-[10px] uppercase font-mono font-bold text-zinc-400 px-1 mb-1.5 flex items-center justify-between">
          <span>Quick Hotspots</span>
          <span className="text-[10px] text-amber-400 font-semibold">1-Tap Book</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => onTakeRide('Hazrat Shahjalal International Airport, Dhaka')}
            className="p-2 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/90 hover:border-amber-500/60 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 group"
            title="Airport"
          >
            <Plane className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-zinc-200 truncate w-full text-center">
              Airport
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTakeRide('Gulshan 2 Circle, Dhaka')}
            className="p-2 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/90 hover:border-amber-500/60 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 group"
            title="Gulshan"
          >
            <Building2 className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-zinc-200 truncate w-full text-center">
              Gulshan
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTakeRide('Kamalapur Railway Station, Dhaka')}
            className="p-2 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/90 hover:border-amber-500/60 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 group"
            title="Kamalapur"
          >
            <Train className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-zinc-200 truncate w-full text-center">
              Kamalapur
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTakeRide('Dhanmondi 27, Dhaka')}
            className="p-2 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/90 hover:border-amber-500/60 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 group"
            title="Dhanmondi"
          >
            <Navigation className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-zinc-200 truncate w-full text-center">
              Dhanmondi
            </span>
          </button>
        </div>
      </div>

      {/* 4. FLEET SELECTION GRID (Zero Scroll - All 4 options in sight!) */}
      <div>
        <div className="flex items-center justify-between px-1 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Bike className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Fleet Options
            </span>
          </div>
          <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Moto Active</span>
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {/* Beego Moto - ACTIVE */}
          <button
            id="passenger-tile-beego-moto"
            type="button"
            onClick={() => onTakeRide()}
            className="p-2 rounded-xl bg-amber-950/30 border-2 border-amber-400 text-left transition-all cursor-pointer group shadow-md shadow-amber-950/40 flex flex-col justify-between active:scale-95 ring-1 ring-amber-400/40"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="w-6 h-6 rounded-lg bg-amber-400 text-black flex items-center justify-center font-bold">
                <Bike className="w-3.5 h-3.5" />
              </div>
              <span className="text-[8px] font-mono font-black text-black bg-amber-400 px-1 py-0.2 rounded">
                LIVE
              </span>
            </div>
            <div>
              <div className="text-[11px] font-black text-white group-hover:text-amber-300">
                Moto
              </div>
              <div className="text-[9px] text-amber-400 font-mono font-bold">৳70/km</div>
            </div>
          </button>

          {/* Sedan - FROZEN */}
          <div
            id="passenger-tile-beego-sedan"
            className="p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 opacity-55 text-left cursor-not-allowed flex flex-col justify-between select-none"
            title="Sedan is frozen"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-500 flex items-center justify-center">
                <Car className="w-3.5 h-3.5" />
              </div>
              <span className="text-[8px] font-mono font-bold text-zinc-400 bg-zinc-800 px-1 py-0.2 rounded">
                OFF
              </span>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-zinc-400">Sedan</div>
              <div className="text-[9px] text-zinc-400 font-mono">Frozen</div>
            </div>
          </div>

          {/* Select - FROZEN */}
          <div
            id="passenger-tile-beego-select"
            className="p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 opacity-55 text-left cursor-not-allowed flex flex-col justify-between select-none"
            title="Select is frozen"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-[8px] font-mono font-bold text-zinc-400 bg-zinc-800 px-1 py-0.2 rounded">
                OFF
              </span>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-zinc-400">Select</div>
              <div className="text-[9px] text-zinc-400 font-mono">Frozen</div>
            </div>
          </div>

          {/* Parcel - FROZEN */}
          <div
            id="passenger-tile-beego-parcel"
            className="p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 opacity-55 text-left cursor-not-allowed flex flex-col justify-between select-none"
            title="Parcel is frozen"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-500 flex items-center justify-center">
                <Package className="w-3.5 h-3.5" />
              </div>
              <span className="text-[8px] font-mono font-bold text-zinc-400 bg-zinc-800 px-1 py-0.2 rounded">
                OFF
              </span>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-zinc-400">Parcel</div>
              <div className="text-[9px] text-zinc-400 font-mono">Frozen</div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. COMPACT PROMO & LIVE NETWORK RADAR STRIP (Zero Scroll) */}
      <div className="grid grid-cols-2 gap-2">
        {/* Promo Code Pill with Copy button */}
        <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/90 flex items-center justify-between gap-1 shadow-sm">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <Tag className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[10px] font-bold text-white truncate">BEEGOFIRST</span>
            </div>
            <div className="text-[9px] text-zinc-400 font-mono">20% OFF 3 Rides</div>
          </div>
          <button
            type="button"
            onClick={handleCopyPromo}
            className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[9px] font-mono font-bold text-amber-400 border border-zinc-700/80 shrink-0 cursor-pointer active:scale-95 transition-all"
          >
            {copiedPromo ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Live Network Pulse */}
        <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/90 flex items-center justify-between gap-1 shadow-sm">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-[10px] font-bold text-white truncate">1,420 Captains</span>
            </div>
            <div className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>99.4% Dispatch</span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-zinc-400">Dhaka</span>
        </div>
      </div>

      {/* 6. OPTIONAL EXPANDED INFO (Visible when user scrolls, but ZERO scroll needed for buttons!) */}
      <div className="pt-2 border-t border-zinc-900 flex flex-col gap-2.5">
        <div className="text-[10px] font-mono uppercase font-bold text-zinc-400 px-1 flex items-center justify-between">
          <span>Traffic Flow & Corridors</span>
          <span className="text-[9px] text-zinc-400">Live Telemetry</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-900 text-center">
            <div className="text-[10px] font-mono text-zinc-400">Airport Rd</div>
            <div className="text-[11px] font-bold text-emerald-400 mt-0.5">Smooth</div>
          </div>
          <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-900 text-center">
            <div className="text-[10px] font-mono text-zinc-400">Mohakhali</div>
            <div className="text-[11px] font-bold text-amber-400 mt-0.5">Moderate</div>
          </div>
          <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-900 text-center">
            <div className="text-[10px] font-mono text-zinc-400">Farmgate</div>
            <div className="text-[11px] font-bold text-emerald-400 mt-0.5">Clear</div>
          </div>
        </div>

        {/* Safety Badge */}
        <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-900 flex items-center justify-between text-[10px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Emergency Police Hotline 999 Ready</span>
          </span>
          <span className="font-mono text-amber-400">24/7 Fleet</span>
        </div>
      </div>
    </div>
  );
};
