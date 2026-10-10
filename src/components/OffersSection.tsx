import React, { useState } from 'react';
import {
  Tag,
  Copy,
  Check,
  Zap,
  Gift,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Share2,
  Ticket,
  Percent,
} from 'lucide-react';
import { RATE_PER_KM_TAKA } from '../services/rideSync';

interface OffersSectionProps {
  onApplyPromo?: (code: string) => void;
  onBookRide?: () => void;
}

export const OffersSection: React.FC<OffersSectionProps> = ({
  onApplyPromo,
  onBookRide,
}) => {
  const [promoInput, setPromoInput] = useState('');
  const [promoMessage, setPromoMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);

  // User's genuine personal referral code
  const userReferralCode = 'VOLTX-BEE-8842';

  const handleApplyCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = promoInput.trim().toUpperCase();
    if (!clean) {
      setPromoMessage({ text: 'Please enter a valid voucher or promo code.', type: 'error' });
      return;
    }

    if (clean === userReferralCode) {
      setPromoMessage({ text: 'You cannot apply your own referral code.', type: 'error' });
      return;
    }

    // Apply valid code
    setAppliedCode(clean);
    setPromoMessage({
      text: `Promo code "${clean}" has been saved for your next ride.`,
      type: 'success',
    });
    if (onApplyPromo) onApplyPromo(clean);
  };

  const handleCopyReferral = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(userReferralCode);
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2000);
    }
  };

  return (
    <div
      id="passenger-offers-section"
      className="w-full flex-1 flex flex-col p-4 select-none pb-28 bg-[#F8F9FA] text-[#1A1A1A] overflow-y-auto no-scrollbar gap-4"
    >
      {/* 1. Header with Title */}
      <div className="flex items-center justify-between pt-1 pb-2 border-b border-zinc-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#F5C518] text-black flex items-center justify-center shadow-xs">
            <Tag className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#1A1A1A]">Offers & Rewards</h1>
            <p className="text-[11px] text-zinc-500 font-medium">Redeem vouchers and earn referral rewards</p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold bg-[#FFF9E6] text-[#B38000] border border-[#F5C518]/30 px-2.5 py-1 rounded-full">
          Verified Vouchers
        </span>
      </div>

      {/* 2. Promo Code Input Card */}
      <div className="p-4 rounded-3xl bg-white border border-zinc-200/90 shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-[#E6A800]" />
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-700">
            Have a Promo or Referral Code?
          </h2>
        </div>

        <form onSubmit={handleApplyCode} className="flex items-center gap-2">
          <input
            type="text"
            value={promoInput}
            onChange={(e) => {
              setPromoInput(e.target.value.toUpperCase());
              if (promoMessage) setPromoMessage(null);
            }}
            placeholder="ENTER VOUCHER CODE"
            className="flex-1 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-mono font-black uppercase placeholder:normal-case placeholder:font-normal placeholder:text-zinc-400 focus:outline-none focus:border-[#F5C518] focus:bg-white transition-all shadow-2xs text-black"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-95 text-black font-black text-xs transition-all cursor-pointer shadow-xs"
          >
            Apply
          </button>
        </form>

        {promoMessage && (
          <div
            className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in ${
              promoMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {promoMessage.type === 'success' ? (
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            )}
            <span>{promoMessage.text}</span>
          </div>
        )}
      </div>

      {/* 3. Referral Program Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-black text-white border border-zinc-700 shadow-xl flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#F5C518]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className="text-[9px] font-mono font-black uppercase tracking-wider text-black bg-[#F5C518] px-2 py-0.5 rounded-md shadow-xs">
              Invite & Earn
            </span>
            <h2 className="text-base font-black text-white mt-2 tracking-tight">
              Share BeeGo Voltx With Friends
            </h2>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed font-medium">
              Give friends ৳50 off their first electric ride. You get ৳50 in ride credit when they take their first trip.
            </p>
          </div>
        </div>

        {/* User Referral Code Bar */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold">Your Code:</span>
            <span className="font-mono font-black text-xs text-[#F5C518] tracking-wider">
              {userReferralCode}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyReferral}
            className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            {referralCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                <span className="text-emerald-300">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Active Vouchers / Promo Feed (Clean empty-state with real transparent pricing) */}
      <div className="space-y-2">
        <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 px-1">
          Active Vouchers
        </h2>

        {appliedCode ? (
          <div className="p-4 rounded-3xl bg-white border-2 border-[#F5C518] shadow-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF9E6] text-[#E6A800] flex items-center justify-center">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono font-black text-zinc-900 block">
                  {appliedCode}
                </span>
                <span className="text-[11px] text-emerald-600 font-bold">
                  Active voucher applied to next ride
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAppliedCode(null);
                setPromoMessage(null);
              }}
              className="text-xs text-zinc-400 hover:text-rose-600 cursor-pointer font-bold"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-white border border-zinc-200/90 text-center flex flex-col items-center justify-center gap-2 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-1">
              <Ticket className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="text-xs font-black text-zinc-800">No Vouchers Active Right Now</h3>
            <p className="text-[11px] text-zinc-500 max-w-xs leading-relaxed">
              BeeGo Voltx maintains transparent flat ৳{RATE_PER_KM_TAKA}/km rates with guaranteed zero surge pricing. Personalized loyalty rewards unlock as you complete rides.
            </p>
            {onBookRide && (
              <button
                type="button"
                onClick={onBookRide}
                className="mt-2 px-4 py-2 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <span>Book a Ride</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. Zero Surge Price Promise Seal */}
      <div className="p-3.5 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="text-xs font-black text-zinc-900 block">
              Zero-Surge Guarantee
            </span>
            <span className="text-[10px] text-zinc-600 font-medium">
              No rain or peak price spikes anywhere in Dhaka & Chattogram
            </span>
          </div>
        </div>
        <span className="text-xs font-mono font-black text-[#E6A800] bg-white px-2.5 py-1 rounded-xl border border-[#F5C518]/30">
          ৳{RATE_PER_KM_TAKA}/km Flat
        </span>
      </div>
    </div>
  );
};
