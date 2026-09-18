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
  Award,
  AlertCircle,
  Compass,
  ArrowRight,
  Plane,
  Building2,
  Radio,
  Copy,
  Check,
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
    navigator.clipboard?.writeText('BIGOFIRST');
    setCopiedPromo(true);
    setTimeout(() => setCopiedPromo(false), 2000);
  };

  return (
    <div id="passenger-home-dashboard" className="w-full max-w-2xl mx-auto px-4 py-5 flex flex-col gap-6">
      {/* 1. UPGRADED HERO SECTION: "TAKE YOUR RIDE" */}
      <div className="relative rounded-3xl bg-zinc-950 border border-zinc-800/80 p-5 sm:p-6 shadow-2xl overflow-hidden transition-all duration-300">
        {/* Subtle atmospheric ambient glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Status Row: Live Dispatch & Metro Indicator */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="font-semibold tracking-wide">Live Dispatch</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300">৳{RATE_PER_KM_TAKA} / km</span>
          </div>

          <span className="text-xs font-mono text-zinc-400 tracking-wider uppercase">
            Dhaka Metro
          </span>
        </div>

        {/* Title & Short Description */}
        <div className="mb-5">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Take Your Ride
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-normal">
            Quick motorbikes and comfortable AC cars with automatic GPS pickup across Bangladesh.
          </p>
        </div>

        {/* "Where to?" Search Bar */}
        <button
          id="take-your-ride-hero-btn"
          type="button"
          onClick={() => onTakeRide()}
          className="w-full p-3 sm:p-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-700/80 hover:border-emerald-500/80 flex items-center justify-between text-left transition-all duration-200 shadow-xl cursor-pointer active:scale-[0.99] group/bar"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-md group-hover/bar:bg-emerald-400 transition-colors shrink-0">
              <Search className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-white group-hover/bar:text-emerald-400 transition-colors">
                Where to?
              </div>
              <div className="text-xs text-zinc-400 truncate">
                Search Bangladesh destination or district...
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 text-xs font-bold text-black group-hover/bar:bg-emerald-400 transition-all shrink-0 shadow-md shadow-emerald-500/20">
            <span>Book Now</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/bar:translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* Live Pickup Indicator */}
        {userLiveAddress && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-400 px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-zinc-500 font-mono">Pickup:</span>
            <span className="text-zinc-300 truncate font-medium">{userLiveAddress}</span>
          </div>
        )}
      </div>

      {/* 2. SERVICES TILES (Executive Grid) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
            Ride Services
          </h3>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Instant Dispatch
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Bigo Moto */}
          <button
            type="button"
            onClick={() => onTakeRide()}
            className="p-3.5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-emerald-500/60 text-left transition-all cursor-pointer group shadow-lg flex flex-col justify-between active:scale-95"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Bike className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-900/60">
                1-3m
              </span>
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                Bigo Moto
              </div>
              <div className="text-xs text-zinc-400 mt-0.5 font-mono">৳70/km</div>
            </div>
          </button>

          {/* Bigo Sedan */}
          <button
            type="button"
            onClick={() => onTakeRide()}
            className="p-3.5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-blue-500/60 text-left transition-all cursor-pointer group shadow-lg flex flex-col justify-between active:scale-95"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Car className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-900/60">
                3-5m
              </span>
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                Bigo Sedan
              </div>
              <div className="text-xs text-zinc-400 mt-0.5 font-mono">AC • ৳85/km</div>
            </div>
          </button>

          {/* Bigo Select */}
          <button
            type="button"
            onClick={() => onTakeRide()}
            className="p-3.5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900/90 border border-amber-500/40 hover:border-amber-400/80 text-left transition-all cursor-pointer group shadow-lg flex flex-col justify-between active:scale-95 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-300 border border-amber-400/25 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-800/60">
                VIP
              </span>
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-amber-200 transition-colors">
                Bigo Select
              </div>
              <div className="text-xs text-zinc-400 mt-0.5 font-mono">Executive • ৳95</div>
            </div>
          </button>

          {/* Bigo Parcel */}
          <button
            type="button"
            onClick={() => onTakeRide()}
            className="p-3.5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700 text-left transition-all cursor-pointer group shadow-lg flex flex-col justify-between active:scale-95"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-800/80 text-zinc-300 border border-zinc-700/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                Express
              </span>
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-zinc-200 transition-colors">
                Bigo Parcel
              </div>
              <div className="text-xs text-zinc-400 mt-0.5 font-mono">Door Delivery</div>
            </div>
          </button>

          {/* Inter-District */}
          <button
            type="button"
            onClick={() => onTakeRide()}
            className="p-3.5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900/90 border border-purple-500/30 hover:border-purple-500/70 text-left transition-all cursor-pointer group shadow-lg flex flex-col justify-between active:scale-95 col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/25 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-900/60">
                Inter-City
              </span>
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                All 64 Zilas
              </div>
              <div className="text-xs text-zinc-400 mt-0.5 font-mono">Highway Transit</div>
            </div>
          </button>
        </div>
      </div>

      {/* 3. POPULAR DESTINATIONS (1-Tap Fast Routing) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
              Popular Destinations
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">Tap to route</span>
        </div>

        <div className="rounded-2xl bg-zinc-950 border border-zinc-800/80 overflow-hidden divide-y divide-zinc-900/90 shadow-xl">
          {/* Destination 1: Gulshan 2 */}
          <button
            type="button"
            onClick={() => onTakeRide('Gulshan 2 Circle, Road 90, Dhaka')}
            className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/70 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                  Gulshan 2 Circle
                </div>
                <div className="text-xs text-zinc-400 truncate">Road 90, Diplomatic Zone, Dhaka</div>
              </div>
            </div>
            <div className="text-right shrink-0 pl-3">
              <div className="text-xs font-mono font-bold text-white">৳490 est.</div>
              <div className="text-[11px] font-mono text-emerald-400">~7 km</div>
            </div>
          </button>

          {/* Destination 2: Airport */}
          <button
            type="button"
            onClick={() => onTakeRide('Hazrat Shahjalal Int’l Airport Terminal 1, Dhaka')}
            className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/70 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                  Airport (HSIA Terminal 1)
                </div>
                <div className="text-xs text-zinc-400 truncate">Airport Road, Kurmitola, Dhaka</div>
              </div>
            </div>
            <div className="text-right shrink-0 pl-3">
              <div className="text-xs font-mono font-bold text-white">৳595 est.</div>
              <div className="text-[11px] font-mono text-emerald-400">~8.5 km</div>
            </div>
          </button>

          {/* Destination 3: Dhanmondi */}
          <button
            type="button"
            onClick={() => onTakeRide('Dhanmondi 27, Satmasjid Road, Dhaka')}
            className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/70 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                  Dhanmondi 27 (Satmasjid)
                </div>
                <div className="text-xs text-zinc-400 truncate">Near Rapa Plaza, Dhaka</div>
              </div>
            </div>
            <div className="text-right shrink-0 pl-3">
              <div className="text-xs font-mono font-bold text-white">৳420 est.</div>
              <div className="text-[11px] font-mono text-emerald-400">~6 km</div>
            </div>
          </button>
        </div>
      </div>

      {/* 4. PROMOTION CODE CARD */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800/80 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Promo: BIGOFIRST</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-400 text-black">
                20% OFF
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Apply code on checkout for 20% discount on your first 3 trips.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyPromo}
          className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-mono font-semibold text-zinc-200 hover:text-white flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 self-end sm:self-center"
        >
          {copiedPromo ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      {/* 5. CITY TRAFFIC RADAR & NETWORK PULSE */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800/80 p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
              City Traffic Radar
            </h4>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Live Pulse
          </span>
        </div>

        {/* 3 Corridor status chips */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between">
            <span className="text-[11px] font-mono text-zinc-400">Airport Rd</span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-white">Smooth Flow</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between">
            <span className="text-[11px] font-mono text-zinc-400">Mohakhali</span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-xs font-semibold text-white">Moderate</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between">
            <span className="text-[11px] font-mono text-zinc-400">Farmgate</span>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-white">Clear</span>
            </div>
          </div>
        </div>

        {/* Network metrics footer */}
        <div className="mt-3.5 pt-3 border-t border-zinc-900 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>1,420 Captains online across Dhaka</span>
          </span>
          <span className="text-emerald-400 font-semibold">99.4% Dispatch Rate</span>
        </div>
      </div>
    </div>
  );
};
