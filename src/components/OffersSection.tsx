import React, { useState } from 'react';
import {
  Tag,
  Copy,
  Check,
  Zap,
  Bike,
  Sparkles,
  ArrowRight,
  Clock,
  Percent,
} from 'lucide-react';

interface PromoOffer {
  id: string;
  code: string;
  title: string;
  discount: string;
  description: string;
  category: 'ride' | 'battery' | 'all';
  validUntil: string;
  minRide: string;
}

const PROMO_OFFERS: PromoOffer[] = [
  {
    id: 'off-1',
    code: 'VOLTXSTART',
    title: '50% Off First 3 Electric Moto Rides',
    discount: '50% OFF',
    description: 'Enjoy 50% discount up to ৳60 on your first 3 electric bike rides across Dhaka.',
    category: 'ride',
    validUntil: 'Valid until 31 Oct 2026',
    minRide: 'Min fare: ৳70',
  },
  {
    id: 'off-2',
    code: 'SWAPFREE',
    title: 'First Battery Swap Free',
    discount: 'FREE SWAP',
    description: 'Get 1 full battery swap free at any BeeGo Voltx Hub in Gulshan, Banani, or Dhanmondi.',
    category: 'battery',
    validUntil: 'Valid until 15 Nov 2026',
    minRide: 'Standard swap: ৳60',
  },
  {
    id: 'off-3',
    code: 'FLAT70',
    title: 'Flat ৳70/km Guarantee',
    discount: 'ZERO SURGE',
    description: 'Never pay peak or rain surge. Fixed ৳70 flat fare per kilometer every day.',
    category: 'all',
    validUntil: 'Always active',
    minRide: 'All trips across Dhaka',
  },
  {
    id: 'off-4',
    code: 'VOLTXFRIEND',
    title: 'Refer a Friend & Get ৳100 Voucher',
    discount: '৳100 BONUS',
    description: 'Share your referral code. When they complete their first ride, both get ৳100 credit.',
    category: 'all',
    validUntil: 'Ongoing promotion',
    minRide: 'On first completed ride',
  },
];

interface OffersSectionProps {
  onApplyPromo?: (code: string) => void;
  onBookRide?: () => void;
}

export const OffersSection: React.FC<OffersSectionProps> = ({
  onApplyPromo,
  onBookRide,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedId(id);
      if (onApplyPromo) onApplyPromo(code);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#F8F9FA] text-[#1A1A1A] flex flex-col p-5 select-none max-w-[430px] mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 pt-1 border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#F5C518] flex items-center justify-center text-black">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#1A1A1A]">Offers & Discounts</h1>
            <p className="text-[11px] text-zinc-500">Save on rides and battery swaps</p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold bg-[#FFF9E6] text-[#E6A800] border border-[#F5C518]/40 px-2 py-0.5 rounded-full">
          4 Active
        </span>
      </div>

      {/* Featured Banner */}
      <div className="mt-4 p-4 rounded-3xl bg-gradient-to-r from-[#FFF9E6] via-amber-50 to-white border border-[#F5C518]/40 shadow-sm flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono font-black text-[#E6A800] uppercase tracking-wider">
            Special Promo
          </span>
          <h2 className="text-sm font-black text-[#1A1A1A]">Electric Week Discount</h2>
          <p className="text-[11px] text-zinc-500">Use VOLTXSTART for 50% off</p>
        </div>
        {onBookRide && (
          <button
            type="button"
            onClick={onBookRide}
            className="px-3.5 py-2 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs transition-all shadow-sm cursor-pointer active:scale-95"
          >
            Ride Now
          </button>
        )}
      </div>

      {/* Offer Cards List */}
      <div className="mt-4 flex flex-col gap-3">
        {PROMO_OFFERS.map((offer) => (
          <div
            key={offer.id}
            className="p-4 rounded-3xl bg-white border border-zinc-200/80 shadow-sm hover:border-[#F5C518] transition-all flex flex-col gap-2.5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-[#FFF9E6] text-[#E6A800] border border-[#F5C518]/30">
                  {offer.discount}
                </span>
                <span className="text-[10px] font-medium text-zinc-400">
                  {offer.validUntil}
                </span>
              </div>

              {offer.category === 'battery' ? (
                <div className="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center text-[#E6A800]">
                  <Zap className="w-3 h-3 fill-[#F5C518]" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700">
                  <Bike className="w-3 h-3" />
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-black text-[#1A1A1A]">{offer.title}</h3>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                {offer.description}
              </p>
            </div>

            {/* Promo Code Box & Copy button */}
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-zinc-800 bg-[#F8F9FA] px-2.5 py-1 rounded-lg border border-dashed border-zinc-300">
                  {offer.code}
                </span>
                <span className="text-[10px] text-zinc-400">{offer.minRide}</span>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(offer.id, offer.code)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-[#F5C518] text-zinc-700 hover:text-black font-bold text-xs transition-colors cursor-pointer"
              >
                {copiedId === offer.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 text-[11px]">Applied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
