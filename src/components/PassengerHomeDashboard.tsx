import React, { useState, useEffect, useRef } from 'react';
import {
  Bike,
  Car,
  Zap,
  Clock,
  Eye,
  Users,
  Package,
  Grid,
  MapPin,
  ChevronRight,
  ArrowRight,
  Share2,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Search,
  BatteryCharging,
  Compass,
  Gift,
} from 'lucide-react';
import { RATE_PER_KM_TAKA } from '../services/rideSync';

interface PassengerHomeDashboardProps {
  onTakeRide: (suggestedDropoff?: string) => void;
  onOpenPowerStations: () => void;
  onOpenOffers: () => void;
  userLiveAddress?: string | null;
}

export const PassengerHomeDashboard: React.FC<PassengerHomeDashboardProps> = ({
  onTakeRide,
  onOpenPowerStations,
  onOpenOffers,
  userLiveAddress,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('bike');

  // Pull-to-refresh state
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);

  // Spotlight carousel index & touch swipe
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [spotlightTouchX, setSpotlightTouchX] = useState<number | null>(null);
  const [isSpotlightPaused, setIsSpotlightPaused] = useState(false);

  const spotlightCards = [
    {
      id: 0,
      title: 'Voltx Swap 50% Off First Month',
      subtitle: 'Unlimited fast battery swaps at 12+ city hubs',
      tag: 'NEW LAUNCH',
      bgGradient: 'from-[#FFF9E6] via-amber-50 to-white',
      accentColor: '#E6A800',
      action: onOpenPowerStations,
      actionText: 'Find Stations',
    },
    {
      id: 1,
      title: 'Flat ৳70/km — Zero Surge Guarantee',
      subtitle: 'Never pay peak or rain surge in Dhaka',
      tag: 'HONEST FARE',
      bgGradient: 'from-amber-50/70 via-yellow-50/50 to-white',
      accentColor: '#1A1A1A',
      action: () => onTakeRide(),
      actionText: 'Book Now',
    },
    {
      id: 2,
      title: 'Ride & Earn Voltx BeePoints',
      subtitle: 'Earn 10 points per km to redeem free rides',
      tag: 'REWARDS',
      bgGradient: 'from-[#FFF9E6] to-amber-100/60',
      accentColor: '#E6A800',
      action: onOpenOffers,
      actionText: 'View Offers',
    },
  ];

  // Auto cycle spotlight every 4.5 seconds unless paused
  useEffect(() => {
    if (isSpotlightPaused) return;
    const timer = setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % spotlightCards.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [spotlightCards.length, isSpotlightPaused]);

  // Pull-to-refresh touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0 && diff < 120) {
      setPullY(diff * 0.5);
    }
  };

  const handleTouchEnd = () => {
    if (pullY > 40) {
      setIsRefreshing(true);
      setPullY(50);
      setTimeout(() => {
        setIsRefreshing(false);
        setPullY(0);
      }, 750);
    } else {
      setPullY(0);
    }
    touchStartY.current = null;
  };

  const handleCopyReferral = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('VOLTX2026');
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // 8 Service Icons per Pathao requirement
  const services = [
    {
      id: 'bike',
      name: 'Bike',
      label: 'Bee Moto',
      badge: '৳70/km',
      icon: Bike,
      onClick: () => {
        setSelectedService('bike');
        onTakeRide();
      },
    },
    {
      id: 'car',
      name: 'Car',
      label: 'Comfort AC',
      badge: 'Popular',
      icon: Car,
      onClick: () => {
        setSelectedService('car');
        onTakeRide();
      },
    },
    {
      id: 'power_station',
      name: 'Power Station',
      label: 'Battery Swap',
      badge: 'Live',
      icon: Zap,
      onClick: () => {
        setSelectedService('power_station');
        onOpenPowerStations();
      },
    },
    {
      id: 'hour_station',
      name: 'Hour Station',
      label: 'Hourly Rental',
      icon: Clock,
      onClick: () => {
        setSelectedService('hour_station');
        onOpenPowerStations();
      },
    },
    {
      id: 'view_hour',
      name: 'View Hour',
      label: 'Hourly Rates',
      icon: Eye,
      onClick: () => {
        setSelectedService('view_hour');
        onOpenOffers();
      },
    },
    {
      id: 'team',
      name: 'Team',
      label: 'Corporate',
      icon: Users,
      onClick: () => {
        setSelectedService('team');
        onTakeRide();
      },
    },
    {
      id: 'parcel',
      name: 'Parcel',
      label: 'Courier',
      icon: Package,
      onClick: () => {
        setSelectedService('parcel');
        onTakeRide('Dhaka GPO / Parcel Drop');
      },
    },
    {
      id: 'all',
      name: 'All',
      label: 'Services',
      icon: Grid,
      onClick: () => {
        setSelectedService('all');
        onTakeRide();
      },
    },
  ];

  return (
    <div
      id="passenger-home-dashboard"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full flex-1 flex flex-col justify-start px-4 py-3.5 overflow-y-auto no-scrollbar gap-4.5 select-none relative pb-28 bg-[#F8F9FA] overscroll-y-contain"
    >
      {/* Pull to refresh spinner indicator */}
      {(pullY > 0 || isRefreshing) && (
        <div
          style={{ height: `${pullY}px` }}
          className="w-full flex items-center justify-center overflow-hidden transition-all duration-150"
        >
          <div className="w-9 h-9 rounded-full bg-white shadow-lg shadow-amber-500/10 border border-zinc-200/80 flex items-center justify-center text-[#E6A800]">
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${pullY * 3}deg)` }}
            />
          </div>
        </div>
      )}

      {/* 1. HORIZONTAL SCROLLABLE SERVICE ICONS (Pathao Super-App style) */}
      <div className="flex flex-col gap-2 pt-0.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Services
          </h2>
          <span className="text-[10px] font-extrabold text-[#E6A800] bg-[#FFF9E6] px-2 py-0.5 rounded-full border border-[#F5C518]/30">
            Flat ৳70 / km
          </span>
        </div>

        {/* Scrollable Container with soft edge fading */}
        <div className="flex items-start gap-3.5 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 scroll-smooth">
          {services.map((service) => {
            const Icon = service.icon;
            const isSelected = selectedService === service.id;
            return (
              <button
                key={service.id}
                type="button"
                onClick={service.onClick}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer active:scale-90 transition-transform duration-150"
                style={{ width: '68px' }}
              >
                {/* Icon Squircle Box */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 relative ${
                    isSelected
                      ? 'bg-[#F5C518] text-black shadow-md shadow-amber-400/40 ring-2 ring-[#E6A800] scale-105'
                      : 'bg-white border border-zinc-200/80 text-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-[#F5C518] hover:bg-[#FFFDF5] hover:shadow-md'
                  }`}
                >
                  <Icon className="w-6 h-6 stroke-[2.2] group-hover:scale-110 transition-transform duration-150" />

                  {/* Micro badge */}
                  {service.badge && (
                    <span className="absolute -top-1.5 -right-1 bg-[#1A1A1A] text-[#F5C518] text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-xs tracking-tight">
                      {service.badge}
                    </span>
                  )}
                </div>

                {/* Service Label */}
                <span className="text-[11px] font-bold text-[#1A1A1A] text-center leading-tight tracking-tight">
                  {service.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. WHERE TO QUICK RIDE LAUNCHER (Super-App Fast Booking) */}
      <button
        type="button"
        onClick={() => onTakeRide()}
        className="w-full p-3.5 rounded-2xl bg-white border border-zinc-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-[#F5C518] hover:shadow-md transition-all duration-200 flex items-center justify-between gap-3 text-left cursor-pointer active:scale-[0.98] group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#F5C518] flex items-center justify-center text-black shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Search className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#E6A800] block">
              Instant Ride Dispatch
            </span>
            <span className="text-sm font-black text-[#1A1A1A] block truncate">
              {userLiveAddress ? `From ${userLiveAddress.split(',')[0]} — Where to?` : 'Where are you going today?'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-xl bg-[#FFF9E6] border border-[#F5C518]/40 text-[#E6A800] font-black text-xs group-hover:bg-[#F5C518] group-hover:text-black transition-colors">
          <span>৳70/km</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      </button>

      {/* 3. QUICK ACTION CARDS ROW (Explore, Book Ride, Redeem Now, Swap Battery) */}
      <div className="grid grid-cols-4 gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => onTakeRide()}
          className="p-3 rounded-2xl bg-white border border-zinc-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#F5C518] hover:shadow-md transition-all duration-200 flex flex-col items-center gap-1.5 text-center cursor-pointer active:scale-95 group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FFF9E6] group-hover:bg-[#F5C518] flex items-center justify-center text-[#E6A800] group-hover:text-black transition-colors">
            <Compass className="w-5 h-5 stroke-[2]" />
          </div>
          <span className="text-[11px] font-bold text-[#1A1A1A]">Explore</span>
        </button>

        <button
          type="button"
          onClick={() => onTakeRide()}
          className="p-3 rounded-2xl bg-white border border-zinc-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#F5C518] hover:shadow-md transition-all duration-200 flex flex-col items-center gap-1.5 text-center cursor-pointer active:scale-95 group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#F5C518] group-hover:bg-[#E6A800] flex items-center justify-center text-black transition-colors shadow-xs">
            <Bike className="w-5 h-5 stroke-[2]" />
          </div>
          <span className="text-[11px] font-bold text-[#1A1A1A]">Book Ride</span>
        </button>

        <button
          type="button"
          onClick={onOpenOffers}
          className="p-3 rounded-2xl bg-white border border-zinc-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#F5C518] hover:shadow-md transition-all duration-200 flex flex-col items-center gap-1.5 text-center cursor-pointer active:scale-95 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 group-hover:bg-[#F5C518] flex items-center justify-center text-amber-700 group-hover:text-black transition-colors">
            <Gift className="w-5 h-5 stroke-[2]" />
          </div>
          <span className="text-[11px] font-bold text-[#1A1A1A]">Redeem</span>
        </button>

        <button
          type="button"
          onClick={onOpenPowerStations}
          className="p-3 rounded-2xl bg-white border border-zinc-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#F5C518] hover:shadow-md transition-all duration-200 flex flex-col items-center gap-1.5 text-center cursor-pointer active:scale-95 group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FFF9E6] group-hover:bg-[#F5C518] flex items-center justify-center text-[#E6A800] group-hover:text-black transition-colors">
            <BatteryCharging className="w-5 h-5 stroke-[2]" />
          </div>
          <span className="text-[11px] font-bold text-[#1A1A1A]">Swap Battery</span>
        </button>
      </div>

      {/* 3. BEEGO SPOTLIGHT (Auto-playing / Swipeable Promotional Carousel) */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-md bg-[#F5C518] flex items-center justify-center text-black">
              <Sparkles className="w-2.5 h-2.5 stroke-[2.5]" />
            </div>
            <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-600">
              BeeGo Spotlight
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {spotlightCards.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSpotlightIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === spotlightIndex ? 'w-5 bg-[#F5C518]' : 'w-1.5 bg-zinc-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Carousel Card with Touch Swipe Support */}
        {(() => {
          const card = spotlightCards[spotlightIndex];
          return (
            <div
              onTouchStart={(e) => {
                setSpotlightTouchX(e.touches[0].clientX);
                setIsSpotlightPaused(true);
              }}
              onTouchEnd={(e) => {
                if (spotlightTouchX !== null) {
                  const diff = e.changedTouches[0].clientX - spotlightTouchX;
                  if (diff > 40) {
                    // Swipe right -> previous
                    setSpotlightIndex((prev) => (prev - 1 + spotlightCards.length) % spotlightCards.length);
                  } else if (diff < -40) {
                    // Swipe left -> next
                    setSpotlightIndex((prev) => (prev + 1) % spotlightCards.length);
                  }
                }
                setSpotlightTouchX(null);
                setIsSpotlightPaused(false);
              }}
              onMouseEnter={() => setIsSpotlightPaused(true)}
              onMouseLeave={() => setIsSpotlightPaused(false)}
              className={`p-4 rounded-3xl bg-gradient-to-r ${card.bgGradient} border border-amber-200/70 shadow-[0_4px_16px_rgba(245,197,24,0.08)] flex flex-col justify-between gap-3 transition-all duration-300 relative overflow-hidden`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] font-mono font-black uppercase tracking-wider text-[#E6A800] bg-white/95 px-2 py-0.5 rounded-md border border-amber-300/40 shadow-xs">
                    {card.tag}
                  </span>
                  <h3 className="text-sm font-black text-[#1A1A1A] mt-1.5 tracking-tight">
                    {card.title}
                  </h3>
                  <p className="text-xs text-zinc-600 mt-0.5 font-medium">
                    {card.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-bold text-zinc-500">
                  Dhaka • 64 Districts
                </span>
                <button
                  type="button"
                  onClick={card.action}
                  className="px-3.5 py-1.5 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs transition-all shadow-sm cursor-pointer active:scale-95 flex items-center gap-1.5 group"
                >
                  <span>{card.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 4. VOLTX ECO IMPACT & POWER STATIONS METER */}
      <div
        onClick={onOpenPowerStations}
        className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#F5C518] transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 fill-emerald-500 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                100% Zero Emission
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">• 12 Stations</span>
            </div>
            <span className="text-xs font-black text-[#1A1A1A] block truncate mt-0.5">
              Eco-Friendly Electric Mobility in Dhaka
            </span>
          </div>
        </div>

        <div className="w-6 h-6 rounded-full bg-zinc-100 group-hover:bg-[#F5C518] flex items-center justify-center text-zinc-500 group-hover:text-black transition-colors shrink-0">
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      </div>

      {/* 5. INVITE FRIENDS CARD */}
      <div className="p-4 rounded-3xl bg-white border border-zinc-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/30 flex items-center justify-center text-[#E6A800]">
              <Share2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs font-black text-[#1A1A1A]">
                Invite friends & get discounts
              </h3>
              <p className="text-[11px] text-zinc-500 font-medium">
                Share code & earn ৳100 off your next trip
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-black text-[#E6A800] bg-[#FFF9E6] px-2.5 py-1 rounded-xl border border-[#F5C518]/40 shadow-xs">
              VOLTX2026
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">Referral Code</span>
          </div>

          <button
            type="button"
            onClick={handleCopyReferral}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs transition-all shadow-sm cursor-pointer active:scale-95"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Share Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5. POPULAR QUICK DESTINATIONS IN DHAKA */}
      <div className="flex flex-col gap-2">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-zinc-400 px-1">
          Frequent Destinations
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Gulshan 2 Circle', area: 'Gulshan, Dhaka' },
            { name: 'Banani 11 Shopping', area: 'Banani, Dhaka' },
            { name: 'Dhanmondi 27 Hub', area: 'Dhanmondi, Dhaka' },
            { name: 'Airport Terminal 1', area: 'Uttara, Dhaka' },
          ].map((dest, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onTakeRide(dest.name)}
              className="p-3 rounded-2xl bg-white border border-zinc-200/70 hover:border-[#F5C518] hover:shadow-md text-left transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] cursor-pointer active:scale-95 group"
            >
              <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#E6A800] group-hover:scale-110 transition-transform" />
                <span className="text-[9px] uppercase font-mono font-bold text-zinc-400">
                  Popular
                </span>
              </div>
              <span className="text-xs font-black text-[#1A1A1A] block truncate">
                {dest.name}
              </span>
              <span className="text-[10px] text-zinc-500 font-medium block truncate">
                {dest.area}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 6. FOOTER PER PROMPT SPECIFICATION */}
      <div className="pt-6 pb-4 text-center flex flex-col items-center gap-2">
        {/* Subtle city skyline & electric bike illustration */}
        <div className="w-full flex justify-center opacity-60 hover:opacity-100 transition-opacity">
          <svg
            className="w-48 h-10 text-zinc-300 stroke-current fill-none"
            viewBox="0 0 200 40"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Skyline Buildings */}
            <path
              d="M10 38 L10 24 L22 24 L22 16 L34 16 L34 38 M40 38 L40 10 L52 10 L52 20 L62 20 L62 38 M70 38 L70 28 L82 28 L82 38 M90 38 L90 8 L102 8 L102 22 L112 22 L112 38 M120 38 L120 26 L132 26 L132 38 M140 38 L140 14 L152 14 L152 38 M160 38 L160 22 L172 22 L172 38 M180 38 L180 30 L192 30 L192 38"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-300"
            />
            {/* Ground line */}
            <line x1="0" y1="38" x2="200" y2="38" strokeWidth="1.5" className="text-zinc-200" />
            {/* Sun / Voltx Energy glow */}
            <circle cx="102" cy="6" r="3" fill="#F5C518" stroke="#E6A800" strokeWidth="1" />
          </svg>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-600">
          <span>Crafted with love from</span>
          <span className="text-[#1A1A1A] font-black">BeeGo Voltx</span>
        </div>
        <p className="text-[10px] text-zinc-400 font-medium">
          Electric Mobility & Power Stations across Bangladesh
        </p>
      </div>
    </div>
  );
};
