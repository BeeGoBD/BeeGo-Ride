import React, { useState } from 'react';
import {
  User,
  Bike,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
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
    <div className="w-full h-full bg-[#F8F9FA] text-[#1A1A1A] flex flex-col justify-between p-6 select-none max-w-[430px] mx-auto shadow-2xl relative overflow-y-auto no-scrollbar">
      {/* Top Bar with Brand (Tapping 10 times opens Secret Admin Gate) */}
      <div className="w-full flex items-center justify-between pt-2">
        <div
          onClick={handleLogoClick}
          className="cursor-pointer active:scale-95 transition-transform"
          title="BeeGo Voltx"
        >
          <BeeGoVoltxLogo size="md" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="my-auto py-6 flex flex-col gap-6">
        <div className="text-center px-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#E6A800] bg-[#FFF9E6] px-3 py-1 rounded-full border border-[#F5C518]/30 inline-block mb-3">
            Welcome to BeeGo Voltx
          </span>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">
            How would you like to continue?
          </h1>
          <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
            Choose between Passenger and Driver to register or log in. Verified account required to enter.
          </p>
        </div>

        {/* Two Large Role Cards */}
        <div className="flex flex-col gap-4">
          {/* Card 1: Continue as Passenger */}
          <button
            type="button"
            id="role-select-passenger-card"
            onClick={() => onSelectRole('passenger')}
            className="group w-full p-5 rounded-3xl bg-white border-2 border-zinc-200/80 hover:border-[#F5C518] hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-200 text-left flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFF9E6] rounded-bl-full -z-0 transition-transform group-hover:scale-110" />

            <div className="relative z-10 flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/30 flex items-center justify-center text-[#E6A800] shadow-sm">
                <User className="w-7 h-7 stroke-[2.2]" />
              </div>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                Commute & Swap
              </span>
            </div>

            <div className="relative z-10">
              <div className="text-lg font-black text-[#1A1A1A] group-hover:text-[#E6A800] transition-colors flex items-center gap-1.5">
                <span>Continue as Passenger</span>
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Request instant rides, locate power stations, swap batteries, and enjoy flat ৳25/km fares.
              </p>
            </div>

            <div className="relative z-10 pt-2 border-t border-zinc-100 flex items-center justify-between text-xs font-bold text-[#E6A800]">
              <span>Ride or Swap Power</span>
              <div className="w-7 h-7 rounded-full bg-[#F5C518] flex items-center justify-center text-black">
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
          </button>

          {/* Card 2: Continue as Driver with Login and Register options */}
          <div
            id="role-select-rider-card"
            className="w-full p-5 rounded-3xl bg-white border-2 border-zinc-200/80 hover:border-[#F5C518] shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-200 text-left flex flex-col justify-between gap-4 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-100 rounded-bl-full -z-0" />

            <div className="relative z-10 flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-[#F5C518] shadow-md shadow-zinc-900/10">
                <Bike className="w-7 h-7 stroke-[2.2]" />
              </div>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FFF9E6] text-[#E6A800] border border-[#F5C518]/30">
                Earn & Drive
              </span>
            </div>

            <div className="relative z-10">
              <div className="text-lg font-black text-[#1A1A1A] flex items-center gap-1.5">
                <span>Continue as Driver</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Accept incoming passenger requests, earn flexible daily income, and access battery swap hubs across Dhaka.
              </p>
            </div>

            {/* Two Clear Options: Login and Register as Driver */}
            <div className="relative z-10 pt-3 border-t border-zinc-100 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onOpenDriverAuth) {
                    onOpenDriverAuth('login');
                  } else {
                    onSelectRole('rider');
                  }
                }}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-xs font-black text-[#1A1A1A] text-center transition-all cursor-pointer border border-zinc-200/80"
              >
                Driver Login
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
                className="flex-1 py-2.5 px-3 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-95 text-xs font-black text-black text-center transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Register as Driver</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info & Auth Quick Link */}
      <div className="w-full flex flex-col items-center gap-2 pt-2 pb-2 text-center">
        <div className="flex items-center gap-1 text-[11px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verified safety & transparent ৳25/km flat rate across all districts</span>
        </div>
        <p className="text-[10px] text-zinc-400">
          Crafted with love from BeeGo Voltx
        </p>
      </div>
    </div>
  );
};
