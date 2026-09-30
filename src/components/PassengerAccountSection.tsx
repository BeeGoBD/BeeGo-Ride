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
  Award,
  Leaf,
  Clock,
} from 'lucide-react';
import { PassengerProfile, logoutPassenger } from '../services/passengerAuth';
import { clearStoredDescopeUser } from '../services/descopeService';
import { useDescope } from '@descope/react-sdk';

interface PassengerAccountSectionProps {
  passengerId: string;
  passengerProfile?: PassengerProfile | null;
  onSwitchToRider: () => void;
  onClose?: () => void;
  onSignOut: () => void;
  onOpenOffers?: () => void;
  onOpenAuth?: () => void;
}

export const PassengerAccountSection: React.FC<PassengerAccountSectionProps> = ({
  passengerId,
  passengerProfile,
  onSwitchToRider,
  onClose,
  onSignOut,
  onOpenOffers,
  onOpenAuth,
}) => {
  const sdk = useDescope();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [activeNotice, setActiveNotice] = useState<string | null>(null);

  const isGuest = !passengerProfile || !passengerProfile.email;
  const displayName = passengerProfile?.name || 'BeeGo Guest Passenger';
  const displayEmail = passengerProfile?.email || 'Tap to sign in with Descope';

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
    <div className="w-full flex-1 flex flex-col p-4 select-none pb-28 bg-[#F8F9FA] text-[#1A1A1A] overflow-y-auto no-scrollbar gap-3.5">
      {/* Top Bar with Title & Close button */}
      <div className="flex items-center justify-between pt-1 pb-2 border-b border-zinc-200/80">
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
        <div className="p-3 rounded-2xl bg-zinc-900 text-white text-xs flex items-center justify-between shadow-lg animate-in fade-in">
          <span>{activeNotice} settings loaded</span>
          <Check className="w-3.5 h-3.5 text-[#F5C518]" />
        </div>
      )}

      {/* 1. LUXURY PROFILE HEADER CARD */}
      <div className="p-4 rounded-3xl bg-white border border-zinc-200/90 shadow-xs flex items-center gap-3.5">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-center text-lg font-black text-[#E6A800] shadow-xs shrink-0">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-black text-[#1A1A1A] truncate">{displayName}</h2>
            <span className={`w-2 h-2 rounded-full shrink-0 ${isGuest ? 'bg-amber-400' : 'bg-emerald-500'}`} title="Status" />
          </div>
          <p className="text-xs text-zinc-500 truncate mt-0.5">{displayEmail}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              isGuest
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {isGuest ? 'Guest User' : 'Verified with Descope'}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">• {passengerId}</span>
          </div>
        </div>
      </div>

      {/* Guest Sign-in Banner with Descope */}
      {isGuest && onOpenAuth && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500 via-[#F5C518] to-amber-400 text-black shadow-md flex items-center justify-between border border-amber-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-[#F5C518] flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs font-black text-black">Sign In / Register</h3>
              <p className="text-[11px] text-zinc-800 font-medium mt-0.5">Use Email OTP, SMS or Google</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAuth}
            className="px-3.5 py-1.5 rounded-xl bg-black hover:bg-zinc-800 text-[#F5C518] font-black text-xs transition-all shadow-sm cursor-pointer active:scale-95 shrink-0"
          >
            Sign In
          </button>
        </div>
      )}

      {/* 2. PASSENGER QUICK STATS ROW */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-2xl bg-white border border-zinc-200/80 text-center shadow-2xs">
          <div className="w-7 h-7 rounded-xl bg-[#FFF9E6] text-[#E6A800] flex items-center justify-center mx-auto mb-1">
            <Bike className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-black text-zinc-900 block font-mono">14</span>
          <span className="text-[10px] text-zinc-400 font-medium">Total Rides</span>
        </div>

        <div className="p-3 rounded-2xl bg-white border border-zinc-200/80 text-center shadow-2xs">
          <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-1">
            <Leaf className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-black text-emerald-700 block font-mono">18.4 kg</span>
          <span className="text-[10px] text-zinc-400 font-medium">CO₂ Saved</span>
        </div>

        <div className="p-3 rounded-2xl bg-white border border-zinc-200/80 text-center shadow-2xs">
          <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-1">
            <Award className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-black text-zinc-900 block font-mono">240</span>
          <span className="text-[10px] text-zinc-400 font-medium">BeePoints</span>
        </div>
      </div>

      {/* 3. SWITCH TO RIDER PROMO CARD */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-black text-white shadow-md flex items-center justify-between border border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F5C518] text-black flex items-center justify-center shrink-0 shadow-xs">
            <Bike className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white">Become a Driver / Captain</h3>
            <p className="text-[11px] text-zinc-300 mt-0.5">Earn daily with BeeGo Voltx fleet</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSwitchToRider}
          className="px-3.5 py-1.5 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs transition-all shadow-sm cursor-pointer active:scale-95 shrink-0"
        >
          Switch
        </button>
      </div>

      {/* 4. SETTINGS & ACCOUNT SECTIONS LIST */}
      <div className="space-y-1 bg-white rounded-3xl p-2 border border-zinc-200/90 shadow-xs divide-y divide-zinc-100">
        {/* Profile */}
        <button
          type="button"
          onClick={() => handleItemClick('Profile Details')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <User className="w-4 h-4 text-zinc-400" />
            <span>Profile Details</span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Payment Methods */}
        <button
          type="button"
          onClick={() => handleItemClick('Payment Methods')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <CreditCard className="w-4 h-4 text-zinc-400" />
            <span>Payment Methods (Cash, bKash)</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
            Cash Active
          </span>
        </button>

        {/* Safety & Emergency */}
        <button
          type="button"
          onClick={() => handleItemClick('Safety Center')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Safety & Emergency SOS</span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Offers & Rewards */}
        {onOpenOffers && (
          <button
            type="button"
            onClick={onOpenOffers}
            className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
              <Tag className="w-4 h-4 text-[#E6A800]" />
              <span>Offers & Promo Codes</span>
            </div>
            <span className="text-[10px] font-bold text-[#E6A800] bg-[#FFF9E6] px-2 py-0.5 rounded-md">
              4 Available
            </span>
          </button>
        )}

        {/* App Version */}
        <div className="w-full px-3.5 py-3 flex items-center justify-between text-left">
          <div className="flex items-center gap-3 text-xs font-bold text-zinc-500">
            <Sparkles className="w-4 h-4 text-zinc-400" />
            <span>BeeGo Voltx Version</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-zinc-400">
            v2.4 Production
          </span>
        </div>

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

      {/* Footer text */}
      <div className="pt-4 pb-2 text-center text-[10px] text-zinc-400 font-medium">
        Crafted with love for BeeGo Voltx • Dhaka, Bangladesh
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
              You will be signed out from this device. You can log back in anytime with your registered account.
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
                  try {
                    await sdk.logout();
                  } catch (e) {}
                  clearStoredDescopeUser();
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
