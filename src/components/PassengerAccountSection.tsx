import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  CreditCard,
  Wallet,
  MapPin,
  Tag,
  Share2,
  Globe,
  Lock,
  PhoneCall,
  HelpCircle,
  FileText,
  Sparkles,
  Bike,
  LogOut,
  ChevronRight,
  X,
  Briefcase,
  AlertTriangle,
  Info,
  Check,
  Building,
} from 'lucide-react';
import { PassengerProfile, logoutPassenger } from '../services/passengerAuth';

interface PassengerAccountSectionProps {
  passengerId: string;
  passengerProfile?: PassengerProfile | null;
  onSwitchToRider: () => void;
  onClose?: () => void;
  onSignOut: () => void;
  onOpenOffers?: () => void;
}

export const PassengerAccountSection: React.FC<PassengerAccountSectionProps> = ({
  passengerId,
  passengerProfile,
  onSwitchToRider,
  onClose,
  onSignOut,
  onOpenOffers,
}) => {
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [activeNotice, setActiveNotice] = useState<string | null>(null);

  const displayName = passengerProfile?.name || 'BeeGo Passenger';
  const displayEmail = passengerProfile?.email || 'guest@beegovoltx.com';

  const initials =
    displayName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'BP';

  const handleItemClick = (title: string, action?: () => void) => {
    if (action) {
      action();
      return;
    }
    setActiveNotice(title);
    setTimeout(() => setActiveNotice(null), 2500);
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#F8F9FA] text-[#1A1A1A] flex flex-col p-5 select-none max-w-[430px] mx-auto pb-28">
      {/* Top Bar with Close button */}
      <div className="flex items-center justify-between pb-3 pt-1 border-b border-zinc-200 shrink-0">
        <h1 className="text-base font-black text-[#1A1A1A]">My Account</h1>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-zinc-100 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer border border-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Notice Toast */}
      {activeNotice && (
        <div className="mt-3 p-3 rounded-2xl bg-zinc-900 text-white text-xs flex items-center justify-between shadow-lg animate-in fade-in">
          <span>{activeNotice} settings loaded</span>
          <Check className="w-3.5 h-3.5 text-[#F5C518]" />
        </div>
      )}

      {/* 1. PROFILE HEADER CARD */}
      <div className="mt-4 p-4 rounded-3xl bg-white border border-zinc-200/90 shadow-sm flex items-center gap-3.5">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-center text-lg font-black text-[#E6A800] shadow-sm shrink-0">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-black text-[#1A1A1A] truncate">{displayName}</h2>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Active" />
          </div>
          <p className="text-xs text-zinc-500 truncate mt-0.5">{displayEmail}</p>
          <span className="inline-block mt-1 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.2 rounded-full border border-emerald-200">
            Verified Passenger
          </span>
        </div>
      </div>

      {/* 2. SWITCH TO RIDER PROMO CARD */}
      <div className="mt-3 p-4 rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F5C518] text-black flex items-center justify-center shrink-0">
            <Bike className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white">Become a Rider / Driver</h3>
            <p className="text-[10px] text-zinc-300">Earn daily with BeeGo Voltx fleet</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSwitchToRider}
          className="px-3 py-1.5 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs transition-all shadow-sm cursor-pointer active:scale-95 shrink-0"
        >
          Switch
        </button>
      </div>

      {/* 3. PATHAO-MIRRORED ACCOUNT SECTIONS LIST */}
      <div className="mt-4 flex flex-col gap-1 bg-white rounded-3xl p-2 border border-zinc-200/90 shadow-sm divide-y divide-zinc-100">
        {/* Profile */}
        <button
          type="button"
          onClick={() => handleItemClick('Profile Details')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <User className="w-4 h-4 text-zinc-400" />
            <span>Profile</span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Authentication */}
        <button
          type="button"
          onClick={() => handleItemClick('Authentication Security')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authentication</span>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
            Gmail OTP Active
          </span>
        </button>

        {/* Business Profile */}
        <button
          type="button"
          onClick={() => handleItemClick('Business Profile')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <Briefcase className="w-4 h-4 text-zinc-400" />
            <span>Business Profile</span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Digital Payment (Coming Soon per prompt) */}
        <div className="w-full px-3.5 py-3 flex items-center justify-between text-left opacity-75">
          <div className="flex items-center gap-3 text-xs font-bold text-zinc-600">
            <CreditCard className="w-4 h-4 text-zinc-400" />
            <span>Digital Payment</span>
          </div>
          <span className="text-[9px] font-mono font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-md">
            Coming Soon
          </span>
        </div>

        {/* Payout Method (Coming Soon per prompt) */}
        <div className="w-full px-3.5 py-3 flex items-center justify-between text-left opacity-75">
          <div className="flex items-center gap-3 text-xs font-bold text-zinc-600">
            <Wallet className="w-4 h-4 text-zinc-400" />
            <span>Payout Method</span>
          </div>
          <span className="text-[9px] font-mono font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-md">
            Coming Soon
          </span>
        </div>

        {/* Saved Address */}
        <button
          type="button"
          onClick={() => handleItemClick('Saved Addresses')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <MapPin className="w-4 h-4 text-zinc-400" />
            <span>Saved Address</span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Promo */}
        <button
          type="button"
          onClick={() => {
            if (onOpenOffers) {
              onOpenOffers();
              if (onClose) onClose();
            } else {
              handleItemClick('Promotions');
            }
          }}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <Tag className="w-4 h-4 text-[#E6A800]" />
            <span>Promo</span>
          </div>
          <span className="text-[10px] text-[#E6A800] font-bold">4 Available</span>
        </button>

        {/* Referral */}
        <button
          type="button"
          onClick={() => handleItemClick('Referral Program')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <Share2 className="w-4 h-4 text-zinc-400" />
            <span>Referral</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono font-bold">VOLTX2026</span>
        </button>

        {/* Language */}
        <div className="w-full px-3.5 py-3 flex items-center justify-between text-left">
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <Globe className="w-4 h-4 text-zinc-400" />
            <span>Language</span>
          </div>
          <span className="text-xs font-semibold text-zinc-500">English</span>
        </div>

        {/* Permissions */}
        <button
          type="button"
          onClick={() => handleItemClick('App Permissions')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <Lock className="w-4 h-4 text-zinc-400" />
            <span>Permissions</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Location Granted</span>
        </button>

        {/* Safety */}
        <button
          type="button"
          onClick={() => handleItemClick('Safety Center')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
            <span>Safety</span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Emergency Support */}
        <button
          type="button"
          onClick={() => handleItemClick('Emergency Support (999)')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-rose-600">
            <PhoneCall className="w-4 h-4 text-rose-500" />
            <span>Emergency Support</span>
          </div>
          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
            24/7 Hotline
          </span>
        </button>

        {/* Help & Support */}
        <button
          type="button"
          onClick={() => handleItemClick('Help Center')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <HelpCircle className="w-4 h-4 text-zinc-400" />
            <span>Help & Support</span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Request */}
        <button
          type="button"
          onClick={() => handleItemClick('Support Requests')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <FileText className="w-4 h-4 text-zinc-400" />
            <span>Request</span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Policies */}
        <button
          type="button"
          onClick={() => handleItemClick('Terms & Privacy Policies')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <Info className="w-4 h-4 text-zinc-400" />
            <span>Policies</span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* New in BeeGo Voltx */}
        <button
          type="button"
          onClick={() => handleItemClick('What is New v2.4')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <Sparkles className="w-4 h-4 text-[#E6A800]" />
            <span>New in BeeGo Voltx</span>
          </div>
          <span className="text-[10px] font-bold text-[#E6A800] bg-[#FFF9E6] px-2 py-0.5 rounded-md">
            v2.4 Release
          </span>
        </button>

        {/* Logout (soft red) */}
        <button
          type="button"
          onClick={() => setShowSignOutConfirm(true)}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-rose-50 rounded-2xl transition-colors cursor-pointer text-left text-rose-600"
        >
          <div className="flex items-center gap-3 text-xs font-bold">
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Logout</span>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-400" />
        </button>
      </div>

      {/* Subtle Social Media Icons & Footer per prompt */}
      <div className="pt-6 pb-2 flex flex-col items-center gap-3">
        <div className="flex items-center gap-4 text-zinc-400">
          <span className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-[#E6A800] transition-colors cursor-pointer text-xs font-black shadow-xs">
            f
          </span>
          <span className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-[#E6A800] transition-colors cursor-pointer text-xs font-black shadow-xs">
            in
          </span>
          <span className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-[#E6A800] transition-colors cursor-pointer text-xs font-black shadow-xs">
            𝕏
          </span>
          <span className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-[#E6A800] transition-colors cursor-pointer text-xs font-black shadow-xs">
            yt
          </span>
        </div>
        <div className="text-center text-[11px] text-zinc-400 font-medium">
          Crafted with love from BeeGo Voltx • Dhaka, Bangladesh
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
          <div className="w-full max-w-[340px] bg-white rounded-3xl p-5 shadow-2xl border border-zinc-200 flex flex-col gap-3.5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-[#1A1A1A]">Log Out of BeeGo Voltx?</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              You will be signed out from this device. You can log back in anytime with your Gmail address.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logoutPassenger();
                  setShowSignOutConfirm(false);
                  onSignOut();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm shadow-rose-600/20"
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
