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
  Home,
  Briefcase,
  Plane,
  Coffee,
  HeartPulse,
  Navigation,
  Leaf,
  Timer,
} from 'lucide-react';
import { RATE_PER_KM_TAKA } from '../services/rideSync';

interface PassengerHomeDashboardProps {
  onTakeRide: (suggestedDropoff?: string) => void;
  onOpenPowerStations: () => void;
  onOpenHourlyRent?: () => void;
  onOpenOffers: () => void;
  userLiveAddress?: string | null;
  passengerName?: string | null;
}

export const PassengerHomeDashboard: React.FC<PassengerHomeDashboardProps> = ({
  onTakeRide,
  onOpenPowerStations,
  onOpenHourlyRent,
  onOpenOffers,
  userLiveAddress,
  passengerName,
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

  // Time of day greeting: Morning (5-11), Afternoon (12-16), Evening (17-20), Night (21-4)
  const [greeting, setGreeting] = useState<string>('Good day');
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Good morning');
    else if (hour >= 12 && hour < 17) setGreeting('Good afternoon');
    else if (hour >= 17 && hour < 21) setGreeting('Good evening');
    else setGreeting('Good night');
  }, []);

  const spotlightCards = [
    {
      id: 0,
      title: 'Flat ৳25/km — Zero Surge Guarantee',
      subtitle: 'Never pay peak or rain surge pricing anywhere in Bangladesh',
      tag: 'HONEST FARE',
      badgeBg: 'bg-[#F5C518] text-black',
      bgGradient: 'from-zinc-900 via-zinc-800 to-zinc-950',
      textColor: 'text-white',
      subTextColor: 'text-zinc-300',
      action: () => onTakeRide(),
      actionText: 'Book Ride',
    },
    {
      id: 1,
      title: 'Voltx Swap 50% Off First Month',
      subtitle: 'Unlimited fast battery swaps at 12+ city hubs',
      tag: 'NEW LAUNCH',
      badgeBg: 'bg-emerald-500 text-white',
      bgGradient: 'from-[#1A1A1A] via-zinc-900 to-emerald-950',
      textColor: 'text-white',
      subTextColor: 'text-zinc-300',
      action: onOpenPowerStations,
      actionText: 'Find Stations',
    },
    {
      id: 2,
      title: 'Ride & Earn Voltx BeePoints',
      subtitle: 'Earn 10 points per kilometer to redeem free electric rides',
      tag: 'REWARDS',
      badgeBg: 'bg-amber-400 text-black',
      bgGradient: 'from-amber-950 via-zinc-900 to-black',
      textColor: 'text-white',
      subTextColor: 'text-zinc-300',
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

  // District Detection from pickup/user address
  const detectedDistrict = React.useMemo(() => {
    const raw = (userLiveAddress || '').toLowerCase();
    if (raw.includes('chittagong') || raw.includes('chattogram')) return 'chittagong';
    if (raw.includes('rajshahi')) return 'rajshahi';
    if (raw.includes('sylhet')) return 'sylhet';
    if (raw.includes('khulna')) return 'khulna';
    if (raw.includes('barisal') || raw.includes('barishal')) return 'barisal';
    return 'dhaka';
  }, [userLiveAddress]);

  // Primary 4 Featured Services
  const primaryServices = [
    {
      id: 'bike',
      name: 'Bee Moto',
      desc: 'Fastest in traffic',
      badge: '৳25/km',
      icon: Bike,
      accentBg: 'bg-[#FFF9E6]',
      accentColor: 'text-[#E6A800]',
      highlight: true,
      disabled: false,
      onClick: () => {
        setSelectedService('bike');
        onTakeRide();
      },
    },
    {
      id: 'car',
      name: 'Bee Comfort',
      desc: 'AC & 4 seats',
      badge: 'Coming Soon',
      icon: Car,
      accentBg: 'bg-zinc-100',
      accentColor: 'text-zinc-500',
      highlight: false,
      disabled: true,
      onClick: () => {}, // Frozen
    },
    {
      id: 'power_station',
      name: 'Power Hub',
      desc: '90s Battery swap',
      badge: 'Coming Soon',
      icon: Zap,
      accentBg: 'bg-zinc-100',
      accentColor: 'text-zinc-500',
      highlight: false,
      disabled: true,
      onClick: () => {}, // Frozen
    },
    {
      id: 'hour_station',
      name: 'Hourly Rent',
      desc: 'Flexible EV rental',
      badge: 'Coming Soon',
      icon: Clock,
      accentBg: 'bg-amber-50',
      accentColor: 'text-amber-700',
      highlight: false,
      disabled: false,
      onClick: () => {
        setSelectedService('hour_station');
        if (onOpenHourlyRent) {
          onOpenHourlyRent();
        }
      },
    },
  ];

  // Secondary Services row
  const secondaryServices = [
    {
      id: 'parcel',
      name: 'Parcel Express',
      icon: Package,
      onClick: () => {
        setSelectedService('parcel');
        onTakeRide(detectedDistrict === 'chittagong' ? 'Chattogram GPO' : 'Dhaka GPO / Parcel Center');
      },
    },
    {
      id: 'team',
      name: 'Corporate Team',
      icon: Users,
      onClick: () => {
        setSelectedService('team');
        onTakeRide();
      },
    },
    {
      id: 'view_hour',
      name: 'Fare Rates',
      icon: Eye,
      onClick: () => {
        setSelectedService('view_hour');
        onOpenOffers();
      },
    },
    {
      id: 'all',
      name: 'All Services',
      icon: Grid,
      onClick: () => {
        setSelectedService('all');
        onTakeRide();
      },
    },
  ];

  // Quick 1-tap Destination Shortcuts adapted by District
  const destinationShortcuts = React.useMemo(() => {
    if (detectedDistrict === 'chittagong') {
      return [
        { label: 'GEC', icon: Home, query: 'GEC Circle, Chittagong' },
        { label: 'Agrabad', icon: Briefcase, query: 'Agrabad Commercial Area, Chittagong' },
        { label: 'Airport', icon: Plane, query: 'Shah Amanat International Airport, Chattogram' },
        { label: 'Beach', icon: Compass, query: 'Patenga Sea Beach, Chattogram' },
        { label: 'Station', icon: Coffee, query: 'Chattogram Railway Station' },
      ];
    }
    if (detectedDistrict === 'rajshahi') {
      return [
        { label: 'Zero Point', icon: Home, query: 'Shaheb Bazar Zero Point, Rajshahi' },
        { label: 'RU Campus', icon: Briefcase, query: 'Rajshahi University Campus' },
        { label: 'Padma Park', icon: Compass, query: 'Padma Garden, Rajshahi' },
        { label: 'Medical', icon: HeartPulse, query: 'Rajshahi Medical College Hospital' },
      ];
    }
    if (detectedDistrict === 'sylhet') {
      return [
        { label: 'Zindabazar', icon: Home, query: 'Zindabazar Point, Sylhet' },
        { label: 'Dargah', icon: Briefcase, query: 'Hazrat Shah Jalal Dargah, Sylhet' },
        { label: 'Amberkhana', icon: Compass, query: 'Amberkhana Point, Sylhet' },
        { label: 'Airport', icon: Plane, query: 'Osmani International Airport, Sylhet' },
      ];
    }
    return [
      { label: 'Home', icon: Home, query: 'Banani DOHS, Dhaka' },
      { label: 'Work', icon: Briefcase, query: 'Gulshan 1 Circle, Dhaka' },
      { label: 'Airport', icon: Plane, query: 'Hazrat Shahjalal Airport Terminal 1, Uttara' },
      { label: 'Medical', icon: HeartPulse, query: 'United Hospital, Gulshan 2' },
      { label: 'Coffee', icon: Coffee, query: 'Dhanmondi 27 Satmasjid Road' },
    ];
  }, [detectedDistrict]);

  // District-Aware Popular Hotspots (Without Any Prices Displayed)
  const popularDestinations = React.useMemo(() => {
    if (detectedDistrict === 'chittagong') {
      return [
        { name: 'GEC Circle', area: 'Central Commercial Hub' },
        { name: 'Agrabad Commercial Area', area: 'Financial & Shipping District' },
        { name: 'Patenga Sea Beach', area: 'Coastal Promenade' },
        { name: 'Nasirabad CDA Avenue', area: 'Shopping & Dining' },
        { name: 'New Market Chattogram', area: 'Station Road Retail' },
        { name: 'Chattogram Railway Station', area: 'Intercity Transit Hub' },
      ];
    }
    if (detectedDistrict === 'rajshahi') {
      return [
        { name: 'Shaheb Bazar Zero Point', area: 'City Center Hub' },
        { name: 'Rajshahi University', area: 'Main Academic Campus' },
        { name: 'Padma Garden Walkway', area: 'Riverfront Recreation' },
        { name: 'Bornali More', area: 'Commercial Junction' },
      ];
    }
    if (detectedDistrict === 'sylhet') {
      return [
        { name: 'Zindabazar Point', area: 'Central Commercial Area' },
        { name: 'Hazrat Shah Jalal Dargah', area: 'Spiritual Center & Gate' },
        { name: 'Amberkhana Point', area: 'Northern City Junction' },
        { name: 'Osmani International Airport', area: 'Airport Road' },
      ];
    }
    return [
      { name: 'Gulshan 2 Circle', area: 'North Commercial Hub' },
      { name: 'Banani 11 Shopping', area: 'Road 11 Lifestyle Hub' },
      { name: 'Dhanmondi 27 Hub', area: 'Satmasjid Road' },
      { name: 'Airport Terminal 1', area: 'Uttara, Dhaka' },
      { name: 'Motijheel Commercial Area', area: 'Financial District' },
      { name: 'Bashundhara R/A Gate', area: 'Residential & University Hub' },
    ];
  }, [detectedDistrict]);

  return (
    <div
      id="passenger-home-dashboard"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full flex-1 flex flex-col justify-start px-4 py-3 gap-4 select-none relative pb-8 bg-[#F8F9FA]"
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

      {/* 1. TOP GREETING */}
      <div className="flex items-center justify-between pt-1 px-0.5">
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A] tracking-tight">
            {greeting} 👋
          </h1>
          <p className="text-[11px] text-zinc-500 font-medium flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {passengerName ? `${passengerName} • Fast Electric Ride Dispatch` : 'Fast Electric Ride Dispatch'}
            </span>
          </p>
        </div>
      </div>

      {/* 2. UBER / PATHAO SIGNATURE "WHERE TO?" HERO SEARCH BAR */}
      <div className="space-y-2">
        <div
          onClick={() => onTakeRide()}
          className="w-full p-4 rounded-3xl bg-white border-2 border-zinc-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-[#F5C518] hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#F5C518] text-black flex items-center justify-center shadow-md shadow-amber-400/30 group-hover:scale-105 transition-transform shrink-0">
              <Search className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-black text-[#1A1A1A] tracking-tight group-hover:text-[#E6A800] transition-colors">
                Where to?
              </div>
              <p className="text-xs text-zinc-400 truncate font-medium">
                {userLiveAddress ? `Pickup at ${userLiveAddress.split(',')[0]}` : 'Search destination or hotspot'}
              </p>
            </div>
          </div>

          {/* Time Picker / Now Indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-100 group-hover:bg-[#FFF9E6] border border-zinc-200 group-hover:border-[#F5C518]/50 text-xs font-bold text-zinc-700 group-hover:text-[#E6A800] transition-colors">
              <Timer className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Now</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-900 group-hover:bg-[#F5C518] text-white group-hover:text-black flex items-center justify-center transition-colors">
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Quick Destination Shortcut Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {destinationShortcuts.map((sc, i) => {
            const Icon = sc.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onTakeRide(sc.query)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#FFF9E6] border border-zinc-200 hover:border-[#F5C518] shadow-2xs text-xs font-bold text-zinc-700 hover:text-[#1A1A1A] transition-all shrink-0 cursor-pointer active:scale-95"
              >
                <Icon className="w-3.5 h-3.5 text-[#E6A800]" />
                <span>{sc.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. SUGGESTIONS: 4 PRIMARY SERVICES GRID (Uber / Pathao Style) */}
      <div className="space-y-2 pt-0.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500">
            Suggestions
          </h2>
          <span className="text-[10px] font-mono font-bold text-[#E6A800] bg-[#FFF9E6] px-2 py-0.5 rounded-full border border-[#F5C518]/30">
            Flat ৳25/km
          </span>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {primaryServices.map((service) => {
            const Icon = service.icon;
            const isSelected = selectedService === service.id;
            return (
              <button
                key={service.id}
                type="button"
                onClick={service.disabled ? undefined : service.onClick}
                disabled={service.disabled}
                className={`p-3.5 rounded-3xl border-2 transition-all duration-200 flex flex-col justify-between text-left group relative overflow-hidden ${
                  service.disabled
                    ? 'bg-zinc-50/80 border-zinc-200/70 opacity-60 cursor-not-allowed select-none'
                    : isSelected
                    ? 'bg-white border-[#F5C518] shadow-lg shadow-amber-500/10 cursor-pointer active:scale-[0.98]'
                    : 'bg-white border-zinc-200/80 hover:border-[#F5C518] shadow-xs hover:shadow-md cursor-pointer active:scale-[0.98]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      service.disabled
                        ? 'bg-zinc-200 text-zinc-400'
                        : isSelected
                        ? 'bg-[#F5C518] text-black shadow-md'
                        : `${service.accentBg} ${service.accentColor} group-hover:scale-105`
                    }`}
                  >
                    <Icon className="w-6 h-6 stroke-[2.2]" />
                  </div>

                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border font-mono ${
                      service.disabled
                        ? 'bg-zinc-200 text-zinc-500 border-zinc-300'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    {service.badge}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-sm font-black text-[#1A1A1A] group-hover:text-[#E6A800] transition-colors flex items-center gap-1">
                    <span>{service.name}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5 font-medium leading-tight">
                    {service.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Secondary Services Compact Row */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {secondaryServices.map((sec) => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={sec.onClick}
                className="p-2.5 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-[#F5C518] shadow-2xs flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer active:scale-95 transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-zinc-100 group-hover:bg-[#FFF9E6] text-zinc-700 group-hover:text-[#E6A800] flex items-center justify-center transition-colors">
                  <Icon className="w-4 h-4 stroke-[2]" />
                </div>
                <span className="text-[10px] font-bold text-zinc-700 group-hover:text-[#1A1A1A] truncate w-full">
                  {sec.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>


      {/* 5. SPOTLIGHT PROMOTIONAL CAROUSEL (Uber One / Pathao Rewards Luxury Style) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E6A800]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500">
              BeeGo Spotlight
            </h2>
          </div>

          {/* Carousel Dot Indicators */}
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
                    setSpotlightIndex((prev) => (prev - 1 + spotlightCards.length) % spotlightCards.length);
                  } else if (diff < -40) {
                    setSpotlightIndex((prev) => (prev + 1) % spotlightCards.length);
                  }
                }
                setSpotlightTouchX(null);
                setIsSpotlightPaused(false);
              }}
              onMouseEnter={() => setIsSpotlightPaused(true)}
              onMouseLeave={() => setIsSpotlightPaused(false)}
              className={`p-4 rounded-3xl bg-gradient-to-r ${card.bgGradient} border border-zinc-800 shadow-xl flex flex-col justify-between gap-3.5 transition-all duration-300 relative overflow-hidden select-none`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs ${card.badgeBg}`}>
                    {card.tag}
                  </span>
                  <h3 className={`text-sm font-black mt-2 tracking-tight ${card.textColor}`}>
                    {card.title}
                  </h3>
                  <p className={`text-xs mt-0.5 font-medium leading-relaxed ${card.subTextColor}`}>
                    {card.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dhaka • 64 Districts</span>
                </div>
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

      {/* 6. POPULAR & RECENT DESTINATIONS LIST */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500">
            Popular Destinations
          </h2>
          <span className="text-[10px] text-zinc-400 font-medium">One-tap dispatch</span>
        </div>

        <div className="space-y-2">
          {popularDestinations.map((dest, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onTakeRide(dest.name)}
              className="w-full p-3 rounded-2xl bg-white border border-zinc-200/80 hover:border-[#F5C518] hover:shadow-md text-left transition-all duration-200 shadow-2xs cursor-pointer active:scale-[0.99] flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 group-hover:bg-[#FFF9E6] text-zinc-700 group-hover:text-[#E6A800] flex items-center justify-center shrink-0 transition-colors">
                  <MapPin className="w-4 h-4 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-[#1A1A1A] block truncate group-hover:text-[#E6A800] transition-colors">
                    {dest.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium block truncate">
                    {dest.area}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 text-right">
                <div className="w-7 h-7 rounded-full bg-zinc-100 group-hover:bg-[#F5C518] text-zinc-600 group-hover:text-black flex items-center justify-center transition-colors">
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 7. VOLTX ECO IMPACT CARD */}
      <div
        onClick={onOpenPowerStations}
        className="p-3.5 rounded-3xl bg-white border border-emerald-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Leaf className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                100% Green Mobility
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">• 12 Hubs</span>
            </div>
            <span className="text-xs font-black text-[#1A1A1A] block truncate mt-0.5">
              Zero-Emission Electric Commute in Dhaka
            </span>
          </div>
        </div>

        <div className="w-7 h-7 rounded-full bg-zinc-100 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center text-zinc-500 transition-colors shrink-0">
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </div>
      </div>

      {/* 8. INVITE FRIENDS CARD */}
      <div className="p-4 rounded-3xl bg-white border border-zinc-200/90 shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/30 flex items-center justify-center text-[#E6A800] shrink-0">
            <Gift className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-xs font-black text-[#1A1A1A]">
              Invite friends & get ৳100 discount
            </h3>
            <p className="text-[11px] text-zinc-500 font-medium">
              Share code with fellow commuters for free ride credit
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
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

      {/* 9. FOOTER BRANDING */}
      <div className="pt-4 pb-2 text-center flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-600">
          <span>Crafted with love for</span>
          <span className="text-[#1A1A1A] font-black">BeeGo Voltx</span>
        </div>
        <p className="text-[10px] text-zinc-400 font-medium">
          Electric Ride-Hailing & Battery Swap Hubs across Bangladesh
        </p>
      </div>
    </div>
  );
};
