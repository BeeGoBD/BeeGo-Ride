import React, { useState } from 'react';
import {
  User,
  Copy,
  Check,
  Star,
  Shield,
  CreditCard,
  Key,
  RotateCcw,
  LogOut,
  PhoneCall,
  ExternalLink,
  ChevronRight,
  Bike,
  Sparkles,
  Wallet,
} from 'lucide-react';

interface PassengerAccountSectionProps {
  passengerId: string;
  onSwitchToRider: () => void;
  onReplayIntro?: () => void;
  onOpenApiKeyModal?: () => void;
}

export const PassengerAccountSection: React.FC<PassengerAccountSectionProps> = ({
  passengerId,
  onSwitchToRider,
  onReplayIntro,
  onOpenApiKeyModal,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(passengerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      id="passenger-account-section"
      className="w-full max-w-xl mx-auto px-4 py-6 flex flex-col gap-5"
    >
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
          Guest Account
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Temporary guest session active in Dhaka, Bangladesh
        </p>
      </div>

      {/* Guest Passenger Profile Card */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white text-black font-black text-xl flex items-center justify-center shadow-md shrink-0">
            GP
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-white truncate">
                Guest Passenger
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                Active
              </span>
            </div>

            {/* Guest ID with copy button */}
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-zinc-400 font-mono truncate max-w-[170px] sm:max-w-[220px]">
                {passengerId}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Copy Guest ID"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Rating and Badges */}
            <div className="flex items-center gap-3 mt-2 text-xs">
              <div className="flex items-center gap-1 text-amber-400 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>5.0</span>
              </div>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">Dhaka Metro, BD</span>
            </div>
          </div>
        </div>

        {/* Switch to Rider CTA */}
        <div className="mt-5 pt-4 border-t border-zinc-900 flex items-center justify-between">
          <div className="text-xs text-zinc-400">Want to accept rides as Captain?</div>
          <button
            type="button"
            onClick={onSwitchToRider}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Switch to Rider</span>
          </button>
        </div>
      </div>

      {/* Wallet / Payment Section */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800/80 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">Bigo Wallet & Payments</h4>
          </div>
          <span className="text-xs font-black text-emerald-400">৳150 Credits</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center gap-1">
            <span className="text-pink-400 font-bold">bKash</span>
            <span className="text-[10px] text-zinc-500">Connected</span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center gap-1">
            <span className="text-orange-400 font-bold">Nagad</span>
            <span className="text-[10px] text-zinc-500">Ready</span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center gap-1">
            <span className="text-emerald-400 font-bold">Cash</span>
            <span className="text-[10px] text-zinc-500">Default</span>
          </div>
        </div>
      </div>

      {/* Settings & App Preferences */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800/80 overflow-hidden shadow-lg">
        {onOpenApiKeyModal && (
          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/80 transition-colors border-b border-zinc-900 text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-400">
                <Key className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white">Geoapify API Key</div>
                <div className="text-[11px] text-zinc-500">Update your routing & maps key</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>
        )}

        {onReplayIntro && (
          <button
            type="button"
            onClick={onReplayIntro}
            className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/80 transition-colors border-b border-zinc-900 text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-400">
                <RotateCcw className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white">Replay Bigo Intro & Slides</div>
                <div className="text-[11px] text-zinc-500">Watch the shining splash & onboarding</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>
        )}

        {/* 24/7 Safety SOS Hotline */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-950/40 border border-red-900/60 flex items-center justify-center text-red-400">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">Police Emergency 999</div>
              <div className="text-[11px] text-zinc-500">National Emergency Helpline Bangladesh</div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-red-400 px-2 py-1 rounded bg-red-950/60 border border-red-900/60">
            999
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-[11px] text-zinc-600 mt-2">
        Bigo Rides v2.4 • Built for Bangladesh • ৳70/km Flat Rate
      </div>
    </div>
  );
};
