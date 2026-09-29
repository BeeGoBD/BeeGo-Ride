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
  Gift,
  ShieldCheck,
  Flame,
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
  highlight?: boolean;
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
    highlight: true,
  },
  {
    id: 'off-2',
    code: 'SWAPFREE',
    title: 'First Battery Swap Free',
    discount: 'FREE SWAP',
    description: 'Get your initial electric battery exchange free at any of our 12+ city swap hubs.',
    category: 'battery',
    validUntil: 'Valid for new riders',
    minRide: 'All Voltx Stations',
    highlight: false,
  },
  {
    id: 'off-3',
    code: 'NOSURGE70',
    title: 'Guaranteed ৳70/km Flat Rate',
    discount: 'ZERO SURGE',
    description: 'Never pay peak or rain surge. Fixed ৳70 flat fare per kilometer every day.',
    category: 'all',
    validUntil: 'Always active',
    minRide: 'All trips in Dhaka',
    highlight: false,
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
    highlight: false,
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
  const [activeCategory, setActiveCategory] = useState<'all' | 'ride' | 'battery'>('all');

  const handleCopy = (id: string, code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedId(id);
      if (onApplyPromo) onApplyPromo(code);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredOffers = PROMO_OFFERS.filter(
    (o) => activeCategory === 'all' || o.category === activeCategory || o.category === 'all'
  );

  return (
    <div className="w-full flex-1 flex flex-col p-4 select-none pb-28 bg-[#F8F9FA] text-[#1A1A1A] overflow-y-auto no-scrollbar gap-3.5">
      {/* 1. Header with Title & Active Count */}
      <div className="flex items-center justify-between pt-1 pb-2 border-b border-zinc-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#F5C518] text-black flex items-center justify-center shadow-xs">
            <Tag className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#1A1A1A]">Offers & Discounts</h1>
            <p className="text-[11px] text-zinc-500 font-medium">Save on rides and battery swaps</p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold bg-[#FFF9E6] text-[#E6A800] border border-[#F5C518]/40 px-2.5 py-1 rounded-full shadow-2xs">
          {PROMO_OFFERS.length} Active
        </span>
      </div>

      {/* 2. Category Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-zinc-200/60 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-white text-black shadow-xs'
              : 'text-zinc-600 hover:text-black'
          }`}
        >
          All Offers
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('ride')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCategory === 'ride'
              ? 'bg-white text-black shadow-xs'
              : 'text-zinc-600 hover:text-black'
          }`}
        >
          Moto Rides
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('battery')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCategory === 'battery'
              ? 'bg-white text-black shadow-xs'
              : 'text-zinc-600 hover:text-black'
          }`}
        >
          Power Swaps
        </button>
      </div>

      {/* 3. Hero Promo Card (Electric Week Special) */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-black text-white border border-zinc-700 shadow-xl flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-28 h-28 bg-[#F5C518]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className="text-[9px] font-mono font-black uppercase tracking-wider text-black bg-[#F5C518] px-2 py-0.5 rounded-md shadow-xs">
              ⚡ Mega Promo
            </span>
            <h2 className="text-base font-black text-white mt-2 tracking-tight">
              Electric Week Special: 50% Off
            </h2>
            <p className="text-xs text-zinc-300 mt-0.5 font-medium leading-relaxed">
              Use code <strong className="text-[#F5C518]">VOLTXSTART</strong> for 50% discount on your first 3 rides across Dhaka.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium">
            <Clock className="w-3.5 h-3.5 text-[#F5C518]" />
            <span>Limited time • Flat ৳70/km base</span>
          </div>

          {onBookRide && (
            <button
              type="button"
              onClick={onBookRide}
              className="px-3.5 py-1.5 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs transition-all shadow-sm cursor-pointer active:scale-95 flex items-center gap-1"
            >
              <span>Book Ride</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Filtered Coupon Cards List */}
      <div className="space-y-3">
        {filteredOffers.map((offer) => (
          <div
            key={offer.id}
            className={`p-4 rounded-3xl bg-white border-2 shadow-xs transition-all duration-200 flex flex-col gap-3 relative overflow-hidden group hover:border-[#F5C518] hover:shadow-md ${
              offer.highlight ? 'border-[#F5C518]' : 'border-zinc-200/80'
            }`}
          >
            {/* Voucher Top Row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-[#FFF9E6] text-[#E6A800] border border-[#F5C518]/30 font-mono shadow-2xs">
                  {offer.discount}
                </span>
                <span className="text-[11px] font-bold text-zinc-500">
                  {offer.validUntil}
                </span>
              </div>

              {offer.category === 'battery' ? (
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 fill-emerald-500" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-xl bg-[#FFF9E6] text-[#E6A800] flex items-center justify-center">
                  <Bike className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Offer Body */}
            <div>
              <h3 className="text-sm font-black text-[#1A1A1A] group-hover:text-[#E6A800] transition-colors">
                {offer.title}
              </h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed font-medium">
                {offer.description}
              </p>
            </div>

            {/* Promo Code Box & Action */}
            <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-zinc-900 bg-[#F8F9FA] px-3 py-1.5 rounded-xl border border-dashed border-zinc-300">
                  {offer.code}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">{offer.minRide}</span>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(offer.id, offer.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer active:scale-95 ${
                  copiedId === offer.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-[#F5C518] hover:bg-[#E6A800] text-black shadow-xs'
                }`}
              >
                {copiedId === offer.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Applied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>Apply & Copy</span>
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
