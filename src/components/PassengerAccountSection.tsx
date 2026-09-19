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
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { PassengerProfile, logoutPassenger } from '../services/passengerAuth';
import { APPWRITE_PROJECT_NAME } from '../lib/appwrite';

interface PassengerAccountSectionProps {
  passengerId: string;
  passengerProfile?: PassengerProfile | null;
  onSwitchToRider: () => void;
  onReplayIntro?: () => void;
  onSignOut: () => void;
}

export const PassengerAccountSection: React.FC<PassengerAccountSectionProps> = ({
  passengerId,
  passengerProfile,
  onSwitchToRider,
  onReplayIntro,
  onSignOut,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const displayName = passengerProfile?.name || 'Guest Passenger';
  const displayEmail = passengerProfile?.email || 'guest.session@beego.internal';
  const isGmailVerified = passengerProfile?.email?.endsWith('@gmail.com');

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'GP';

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(passengerProfile?.id || passengerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExecuteSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logoutPassenger();
    } catch (e) {
      console.warn('Sign out error:', e);
    } finally {
      setIsSigningOut(false);
      setShowSignOutConfirm(false);
      onSignOut();
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
          {passengerProfile ? 'Passenger Account' : 'Guest Account'}
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          {passengerProfile
            ? `Authenticated via Appwrite • ${APPWRITE_PROJECT_NAME}`
            : 'Temporary guest session active in Dhaka, Bangladesh'}
        </p>
      </div>

      {/* Passenger Profile Card */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-400 text-black font-black text-xl flex items-center justify-center shadow-md shrink-0">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-white truncate">
                {displayName}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                {passengerProfile ? 'Passenger' : 'Guest'}
              </span>
            </div>

            {/* Email Address */}
            <div className="flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="text-xs text-zinc-300 font-mono truncate">
                {displayEmail}
              </span>
              {isGmailVerified && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                  Gmail OTP
                </span>
              )}
            </div>

            {/* Account ID with copy button */}
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] text-zinc-500 font-mono truncate max-w-[170px] sm:max-w-[220px]">
                ID: {passengerProfile?.id || passengerId}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
                title="Copy ID"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-amber-400" />
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
            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-amber-400/20"
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
            <Wallet className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">Beego Wallet & Payments</h4>
          </div>
          <span className="text-xs font-black text-amber-400">৳150 Credits</span>
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
            <span className="text-amber-400 font-bold">Cash</span>
            <span className="text-[10px] text-zinc-500">Default</span>
          </div>
        </div>
      </div>

      {/* Settings & App Preferences */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800/80 overflow-hidden shadow-lg divide-y divide-zinc-900">
        {onReplayIntro && (
          <button
            type="button"
            onClick={onReplayIntro}
            className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-400">
                <RotateCcw className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white">Replay Introduction</div>
                <div className="text-[11px] text-zinc-500">View splash screen and feature highlights</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>
        )}

        {/* 24/7 Safety SOS Hotline */}
        <a
          href="tel:999"
          className="p-4 flex items-center justify-between hover:bg-red-950/20 transition-colors text-left cursor-pointer block"
        >
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
        </a>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={() => setShowSignOutConfirm(true)}
          className="w-full p-4 flex items-center justify-between hover:bg-red-950/20 transition-colors text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-950/30 border border-red-900/40 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-red-400">Exit Session</div>
              <div className="text-[11px] text-zinc-500">Return to role selector</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-red-400 transition-colors" />
        </button>
      </div>

      {/* SIGN OUT CONFIRMATION MODAL */}
      {showSignOutConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowSignOutConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1.5">Sign out of Beego?</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              You will be signed out of your current passenger session and returned to the main role selection screen.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSigningOut}
                onClick={handleExecuteSignOut}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center text-[11px] text-zinc-600 mt-2">
        Beego Rides v2.4 • Built for Bangladesh • ৳70/km Flat Rate
      </div>
    </div>
  );
};
