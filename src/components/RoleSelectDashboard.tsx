import React from 'react';
import { User, Bike, ArrowRight, ShieldCheck, Zap, RotateCcw } from 'lucide-react';
import { UserRole } from '../types';
import { RATE_PER_KM_TAKA } from '../services/rideSync';

interface RoleSelectDashboardProps {
  onSelectRole: (role: UserRole) => void;
  onReplayIntro?: () => void;
}

export const RoleSelectDashboard: React.FC<RoleSelectDashboardProps> = ({
  onSelectRole,
  onReplayIntro,
}) => {
  return (
    <div
      id="role-select-dashboard"
      className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-10"
    >
      <div className="w-full max-w-xl mx-auto">
        {/* Top Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-3xl font-black tracking-tighter text-white">Bigo</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Real-time Dispatch • ৳{RATE_PER_KM_TAKA} Taka / km</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Select Dashboard
          </h1>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Choose how you want to experience Bigo. Sessions are instant with automatic guest credentials.
          </p>
        </div>

        {/* The Two Main Buttons */}
        <div className="grid grid-cols-1 gap-4">
          {/* Button 1: Continue as Guest Passenger */}
          <button
            id="continue-as-passenger-button"
            type="button"
            onClick={() => onSelectRole('passenger')}
            className="group w-full text-left p-6 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-200 shadow-2xl flex items-center justify-between cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-start gap-4">
              <div className="w-13 h-13 rounded-2xl bg-white text-black flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-lg">
                <User className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Continue as Guest Passenger
                  </h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-900/60">
                    Book Rides
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Open the passenger dashboard, search destinations, book rides at ৳70/km, and view trip history.
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 ml-3 group-hover:bg-white group-hover:text-black transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Button 2: Continue as Guest Rider */}
          <button
            id="continue-as-rider-button"
            type="button"
            onClick={() => onSelectRole('rider')}
            className="group w-full text-left p-6 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-200 shadow-2xl flex items-center justify-between cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-start gap-4">
              <div className="w-13 h-13 rounded-2xl bg-emerald-500 text-black flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-lg">
                <Bike className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Continue as Guest Rider
                  </h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    Captain Mode
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Receive live incoming ride requests, track passenger pickup, navigate routes, and complete fares.
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 ml-3 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* Feature info & Replay Intro Footer */}
        <div className="mt-8 pt-6 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Instant sync across browser tabs</span>
          </div>

          {onReplayIntro && (
            <button
              type="button"
              onClick={onReplayIntro}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay Intro & Slides</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
