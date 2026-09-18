import React from 'react';
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
  return (
    <div id="passenger-home-dashboard" className="w-full max-w-2xl mx-auto px-4 py-5 flex flex-col gap-6">
      {/* 1. HERO CARD AT THE TOP: "TAKE YOUR RIDE" */}
      <div className="relative rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 p-5 sm:p-6 shadow-2xl overflow-hidden group">
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/25 transition-all duration-500" />

        {/* Live status badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-900/60 text-xs font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Dispatch • ৳{RATE_PER_KM_TAKA} Taka / km</span>
          </div>

          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Dhaka Metro
          </span>
        </div>

        {/* Headline & Tap action */}
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          Take Your Ride
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mb-4 max-w-md leading-relaxed">
          Book a quick motorbike or comfortable AC car. Automatic live GPS pickup across Bangladesh.
        </p>

        {/* "Where to?" interactive search trigger bar */}
        <button
          id="take-your-ride-hero-btn"
          type="button"
          onClick={() => onTakeRide()}
          className="w-full p-4 rounded-2xl bg-black border border-zinc-700/80 hover:border-emerald-500/80 flex items-center justify-between text-left transition-all duration-200 shadow-xl cursor-pointer active:scale-[0.99] group/bar"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold shadow-md group-hover/bar:scale-105 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover/bar:text-emerald-400 transition-colors">
                Where to?
              </div>
              <div className="text-xs text-zinc-400 truncate max-w-[200px] sm:max-w-[320px]">
                {userLiveAddress ? `From: ${userLiveAddress}` : 'Search Bangladesh destination or district...'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 text-xs font-bold text-white border border-zinc-800 group-hover/bar:bg-white group-hover/bar:text-black transition-colors shrink-0">
            <span>Book Now</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      {/* 2. SERVICES TILES (Uber-style service selector) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            Ride Services
          </h3>
          <span className="text-xs text-emerald-400 font-semibold">Instant Dispatch</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Bigo Moto */}
          <button
            type="button"
            onClick={() => onTakeRide()}
            className="p-4 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/80 hover:border-emerald-500/50 text-left transition-all cursor-pointer group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Bike className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white">Bigo Moto</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Fastest • ৳70/km</div>
            <div className="text-[10px] text-emerald-400 font-bold mt-2">1-3 min away</div>
          </button>

          {/* Bigo Car */}
          <button
            type="button"
            onClick={() => onTakeRide()}
            className="p-4 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/80 hover:border-blue-500/50 text-left transition-all cursor-pointer group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Car className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white">Bigo Sedan</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">AC • 4 Seats</div>
            <div className="text-[10px] text-blue-400 font-bold mt-2">3-5 min away</div>
          </button>

          {/* Bigo Parcel */}
          <button
            type="button"
            onClick={() => onTakeRide()}
            className="p-4 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/80 hover:border-amber-500/50 text-left transition-all cursor-pointer group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white">Bigo Parcel</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Door Delivery</div>
            <div className="text-[10px] text-amber-400 font-bold mt-2">Express</div>
          </button>

          {/* Bigo Inter-District */}
          <button
            type="button"
            onClick={() => onTakeRide()}
            className="p-4 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/80 hover:border-purple-500/50 text-left transition-all cursor-pointer group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white">All 64 Zilas</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Highway Transit</div>
            <div className="text-[10px] text-purple-400 font-bold mt-2">Fixed Rate</div>
          </button>
        </div>
      </div>

      {/* 3. SAVED / FREQUENT DESTINATIONS (1-Tap Shortcut) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Popular Destinations</span>
          </h3>
          <span className="text-xs text-zinc-500">Tap to route</span>
        </div>

        <div className="rounded-2xl bg-zinc-950 border border-zinc-800/80 overflow-hidden divide-y divide-zinc-900 shadow-lg">
          {/* Destination 1 */}
          <button
            type="button"
            onClick={() => onTakeRide('Gulshan 2 Circle, Road 90, Dhaka')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-zinc-900/70 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 transition-colors">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white">Gulshan 2 Circle</div>
                <div className="text-[11px] text-zinc-400">Road 90, Diplomatic Zone, Dhaka</div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-emerald-400">~7 km</span>
              <span className="text-[10px] text-zinc-500 block">৳490 est.</span>
            </div>
          </button>

          {/* Destination 2 */}
          <button
            type="button"
            onClick={() => onTakeRide('Hazrat Shahjalal Int’l Airport Terminal 1, Dhaka')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-zinc-900/70 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 transition-colors">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white">Airport (HSIA Terminal 1)</div>
                <div className="text-[11px] text-zinc-400">Airport Road, Kurmitola, Dhaka</div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-emerald-400">~8.5 km</span>
              <span className="text-[10px] text-zinc-500 block">৳595 est.</span>
            </div>
          </button>

          {/* Destination 3 */}
          <button
            type="button"
            onClick={() => onTakeRide('Dhanmondi 27, Satmasjid Road, Dhaka')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-zinc-900/70 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 transition-colors">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white">Dhanmondi 27 (Satmasjid)</div>
                <div className="text-[11px] text-zinc-400">Near Rapa Plaza, Dhaka</div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-emerald-400">~6 km</span>
              <span className="text-[10px] text-zinc-500 block">৳420 est.</span>
            </div>
          </button>
        </div>
      </div>

      {/* 4. PROMOTION & DISCOUNT BANNERS */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/60 to-zinc-950 border border-emerald-900/60 p-4 sm:p-5 flex items-center justify-between shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-md">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-white">Promo: BIGOFIRST</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500 text-black">
                20% OFF
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-1">
              Apply code on checkout for 20% discount on your first 3 motorbike or car trips.
            </p>
          </div>
        </div>
      </div>

      {/* 5. REAL-TIME DHAKA MOBILITY RADAR */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800/80 p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              City Traffic Radar
            </h4>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">Live Pulse</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-center">
            <div className="text-[10px] text-zinc-400">Airport Rd</div>
            <div className="text-emerald-400 font-bold mt-0.5">Smooth Flow</div>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-center">
            <div className="text-[10px] text-zinc-400">Mohakhali</div>
            <div className="text-amber-400 font-bold mt-0.5">Moderate</div>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-center">
            <div className="text-[10px] text-zinc-400">Farmgate</div>
            <div className="text-emerald-400 font-bold mt-0.5">Clear</div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            1,420 Captains online across Dhaka
          </span>
          <span className="text-emerald-400 font-semibold">99.4% Dispatch Rate</span>
        </div>
      </div>
    </div>
  );
};
