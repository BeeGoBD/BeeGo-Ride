import React, { useState } from 'react';
import {
  User,
  Bike,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  BatteryCharging,
  LogIn,
  UserPlus,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { UserRole } from '../types';
import { BeeGoVoltxLogo } from './BeeGoVoltxLogo';

interface RoleSelectDashboardProps {
  onSelectRole: (role: UserRole) => void;
  onOpenPassengerAuth?: (mode: 'signup' | 'login') => void;
  onOpenDriverAuth?: (mode: 'register' | 'login') => void;
  onOpenAdminGate?: () => void;
}

export const RoleSelectDashboard: React.FC<RoleSelectDashboardProps> = ({
  onSelectRole,
  onOpenPassengerAuth,
  onOpenDriverAuth,
  onOpenAdminGate,
}) => {
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    const next = logoClicks + 1;
    if (next >= 10) {
      setLogoClicks(0);
      if (onOpenAdminGate) {
        onOpenAdminGate();
      }
    } else {
      setLogoClicks(next);
    }
  };

  return (
    <div className="w-full h-full bg-[#FDFDFD] text-[#1A1A1A] flex flex-col justify-between p-5 sm:p-6 select-none max-w-[430px] mx-auto shadow-2xl relative overflow-y-auto no-scrollbar">
      {/* Background Decorative Ambient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#FFF3C4]/60 via-[#FFF9E6]/30 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-10 left-0 w-48 h-48 bg-gradient-to-tr from-amber-100/40 via-yellow-50/20 to-transparent rounded-full blur-2xl pointer-events-none -z-0" />

      {/* 1. TOP HEADER WITH BRAND & LIVE BADGE */}
      <div className="w-full flex items-center justify-between pt-1 relative z-10">
        <div
          onClick={handleLogoClick}
          className="cursor-pointer active:scale-95 transition-transform group flex items-center gap-1"
          title="BeeGo Voltx (Tap 10 times for Security Gate)"
        >
          <BeeGoVoltxLogo size="md" />
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 border border-zinc-200/80 shadow-2xs backdrop-blur-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-zinc-600">
            Dhaka EV Network
          </span>
        </div>
      </div>

      {/* 2. HERO WELCOME SECTION */}
      <div className="my-auto py-5 flex flex-col gap-5 relative z-10">
        <div className="text-center px-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF9E6] border border-[#F5C518]/40 text-[#B38000] text-[10px] font-mono font-black uppercase tracking-wider mb-2.5 shadow-2xs">
            <Zap className="w-3 h-3 fill-[#F5C518] text-[#B38000]" />
            <span>100% Electric Mobility Bangladesh</span>
          </div>

          <h1 className="text-2xl sm:text-[26px] font-black text-zinc-950 tracking-tight leading-tight">
            How would you like to continue?
          </h1>

          <p className="text-xs text-zinc-500 mt-1.5 max-w-[320px] mx-auto leading-relaxed">
            Experience smart battery-swapped EV rides or start earning daily as a verified Captain.
          </p>
        </div>

        {/* Feature Highlights Pills */}
        <div className="grid grid-cols-3 gap-2 px-1">
          <div className="p-2 rounded-2xl bg-zinc-50/90 border border-zinc-200/70 text-center flex flex-col items-center gap-0.5">
            <span className="text-xs font-black text-zinc-900">৳25/km</span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Flat Fare</span>
          </div>
          <div className="p-2 rounded-2xl bg-zinc-50/90 border border-zinc-200/70 text-center flex flex-col items-center gap-0.5">
            <span className="text-xs font-black text-amber-600 flex items-center gap-0.5">
              <Zap className="w-3 h-3 fill-amber-500" /> 30s
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Swap Hub</span>
          </div>
          <div className="p-2 rounded-2xl bg-zinc-50/90 border border-zinc-200/70 text-center flex flex-col items-center gap-0.5">
            <span className="text-xs font-black text-emerald-600 flex items-center gap-0.5">
              <ShieldCheck className="w-3 h-3" /> Safe
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Verified</span>
          </div>
        </div>

        {/* 3. TWO LARGE ROLE CARDS */}
        <div className="flex flex-col gap-3.5">
          {/* CARD 1: PASSENGER CARD */}
          <div
            id="role-select-passenger-card"
            className="group w-full p-4.5 rounded-3xl bg-white border-2 border-zinc-200/80 hover:border-[#F5C518] shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-200 text-left flex flex-col gap-3.5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-[#FFF9E6] to-transparent rounded-bl-full -z-0 pointer-events-none group-hover:scale-110 transition-transform" />

            <div className="relative z-10 flex items-start justify-between">
              <div className="w-13 h-13 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-center text-[#B38000] shadow-2xs">
                <User className="w-6 h-6 stroke-[2.4]" />
              </div>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80">
                Passenger
              </span>
            </div>

            <div className="relative z-10">
              <div className="text-base font-black text-zinc-950 flex items-center gap-1.5">
                <span>Continue as Passenger</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed font-medium">
                Book instant electric rides, track live drivers, and enjoy guaranteed zero-surge pricing.
              </p>
            </div>

            {/* Passenger Action Split: Sign In or Register */}
            <div className="relative z-10 pt-2.5 border-t border-zinc-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onOpenPassengerAuth) {
                    onOpenPassengerAuth('login');
                  } else {
                    onSelectRole('passenger');
                  }
                }}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-xs font-black text-zinc-800 text-center transition-all cursor-pointer border border-zinc-200/70 flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-zinc-600" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenPassengerAuth) {
                    onOpenPassengerAuth('signup');
                  } else {
                    onSelectRole('passenger');
                  }
                }}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-95 text-xs font-black text-black text-center transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
                <ArrowRight className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* CARD 2: DRIVER / CAPTAIN CARD (STEALTH GRAPHITE HIGH-CONTRAST) */}
          <div
            id="role-select-rider-card"
            className="group w-full p-4.5 rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white border-2 border-zinc-800 hover:border-[#F5C518] shadow-md hover:shadow-xl hover:shadow-black/20 transition-all duration-200 text-left flex flex-col gap-3.5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-[#F5C518]/10 rounded-bl-full -z-0 pointer-events-none group-hover:scale-110 transition-transform" />

            <div className="relative z-10 flex items-start justify-between">
              <div className="w-13 h-13 rounded-2xl bg-[#F5C518] text-black flex items-center justify-center shadow-md shadow-amber-500/20">
                <Bike className="w-6 h-6 stroke-[2.4]" />
              </div>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-[#F5C518] border border-[#F5C518]/30">
                Earn ৳1,500+/day
              </span>
            </div>

            <div className="relative z-10">
              <div className="text-base font-black text-white flex items-center gap-1.5">
                <span>Continue as Captain (Driver)</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed font-medium">
                Accept trips, earn flexible income, and swap batteries in 30 seconds at any Voltx station.
              </p>
            </div>

            {/* Driver Action Split: Login or Register */}
            <div className="relative z-10 pt-2.5 border-t border-zinc-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onOpenDriverAuth) {
                    onOpenDriverAuth('login');
                  } else {
                    onSelectRole('rider');
                  }
                }}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 text-xs font-black text-white text-center transition-all cursor-pointer border border-zinc-700/80 flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                <span>Captain Login</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenDriverAuth) {
                    onOpenDriverAuth('register');
                  } else {
                    onSelectRole('rider');
                  }
                }}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-95 text-xs font-black text-black text-center transition-all cursor-pointer shadow-md shadow-amber-500/15 flex items-center justify-center gap-1.5"
              >
                <span>Register & Drive</span>
                <ArrowRight className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FOOTER SAFETY & BRAND BADGE */}
      <div className="w-full flex flex-col items-center gap-1.5 pt-2 pb-1 text-center relative z-10">
        <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted with Descope Cloud Auth • Dhaka, BD</span>
        </div>
        <p className="text-[10px] text-zinc-400 font-mono">
          BeeGo Voltx • Smart EV Ecosystem
        </p>
      </div>
    </div>
  );
};
