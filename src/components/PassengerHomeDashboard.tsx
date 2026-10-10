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
import { getPreferredCity, setPreferredCity, requestLiveCoordinates } from '../services/geolocation';

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
      bgGradient: 'from-zinc-950 via-zinc-900 to-black',
      bgImage: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
      textColor: 'text-white',
      subTextColor: 'text-zinc-200',
      action: () => onTakeRide(),
      actionText: 'Book Ride',
    },
    {
      id: 1,
      title: 'Voltx Swap 50% Off First Month',
      subtitle: 'Unlimited fast battery swaps at 12+ city hubs',
      tag: 'NEW LAUNCH',
      badgeBg: 'bg-emerald-500 text-white',
      bgGradient: 'from-[#0a1811] via-zinc-950 to-emerald-950',
      bgImage: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80',
      textColor: 'text-white',
      subTextColor: 'text-zinc-200',
      action: onOpenPowerStations,
      actionText: 'Find Stations',
    },
    {
      id: 2,
      title: 'Ride & Earn Voltx BeePoints',
      subtitle: 'Earn 10 points per kilometer to redeem free electric rides',
      tag: 'REWARDS',
      badgeBg: 'bg-amber-400 text-black',
      bgGradient: 'from-amber-950 via-zinc-950 to-black',
      bgImage: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
      textColor: 'text-white',
      subTextColor: 'text-zinc-200',
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

  // 4 Core Clean Services (Uber / Pathao style)
  const primaryServices = [
    {
      id: 'bike',
      name: 'Bee Moto',
      desc: 'Flat ৳25/km',
      icon: Bike,
      accentBg: 'bg-[#FFF9E6]',
      accentColor: 'text-[#B38000]',
      onClick: () => {
        setSelectedService('bike');
        onTakeRide();
      },
    },
    {
      id: 'power_station',
      name: 'Power Hub',
      desc: '12+ Swap Bays',
      icon: Zap,
      accentBg: 'bg-emerald-50',
      accentColor: 'text-emerald-600',
      onClick: () => {
        setSelectedService('power_station');
        onOpenPowerStations();
      },
    },
    {
      id: 'hour_station',
      name: 'Hourly Rent',
      desc: 'Flexible EV',
      icon: Clock,
      accentBg: 'bg-amber-50',
      accentColor: 'text-amber-700',
      onClick: () => {
        setSelectedService('hour_station');
        if (onOpenHourlyRent) {
          onOpenHourlyRent();
        }
      },
    },
    {
      id: 'offers',
      name: 'Rewards',
      desc: 'Zero Surge',
      icon: Sparkles,
      accentBg: 'bg-zinc-100',
      accentColor: 'text-zinc-800',
      onClick: () => {
        setSelectedService('offers');
        onOpenOffers();
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
      className="w-full flex-1 flex flex-col justify-start px-4 py-3 gap-3.5 select-none relative pb-10 bg-[#FAFAFA] text-[#1A1A1A]"
    >
      {/* Pull to refresh spinner */}
      {(pullY > 0 || isRefreshing) && (
        <div
          style={{ height: `${pullY}px` }}
          className="w-full flex items-center justify-center overflow-hidden transition-all duration-150"
        >
          <div className="w-8 h-8 rounded-full bg-white shadow-md border border-zinc-200/80 flex items-center justify-center text-[#E6A800]">
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${pullY * 3}deg)` }}
            />
          </div>
        </div>
      )}

      {/* 1. TOP GREETING & CITY HUB SELECTOR */}
      <div className="flex items-center justify-between pt-0.5 px-0.5">
        <div>
          <h1 className="text-lg font-black text-zinc-950 tracking-tight">
            {greeting} 👋
          </h1>
          <p className="text-[11px] text-zinc-500 font-medium flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{passengerName ? `${passengerName} • 100% Electric EV` : 'Fast Electric EV Dispatch'}</span>
          </p>
        </div>

        {/* Minimal City Selector */}
        <div className="flex items-center bg-zinc-100 p-0.5 rounded-xl border border-zinc-200/80 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => {
              setPreferredCity('chattogram');
              window.location.reload();
            }}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
              getPreferredCity() === 'chattogram'
                ? 'bg-[#F5C518] text-black shadow-2xs font-black'
                : 'text-zinc-500 hover:text-black'
            }`}
          >
            CTG
          </button>
          <button
            type="button"
            onClick={() => {
              setPreferredCity('dhaka');
              window.location.reload();
            }}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
              getPreferredCity() === 'dhaka'
                ? 'bg-[#F5C518] text-black shadow-2xs font-black'
                : 'text-zinc-500 hover:text-black'
            }`}
          >
            DHK
          </button>
        </div>
      </div>

      {/* 2. WHERE TO? HERO SEARCH BAR */}
      <div className="space-y-2">
        <div
          onClick={() => onTakeRide()}
          className="w-full p-3.5 rounded-3xl bg-white border border-zinc-200/90 shadow-sm hover:border-[#F5C518] hover:shadow-md transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#F5C518] text-black flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <Search className="w-4.5 h-4.5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-zinc-950 tracking-tight group-hover:text-[#E6A800] transition-colors">
                Where to?
              </div>
              <p className="text-[11px] text-zinc-400 truncate font-medium mt-0.5">
                {userLiveAddress ? `Pickup at ${userLiveAddress.split(',')[0]}` : 'Search destination or hotspot'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 group-hover:bg-[#FFF9E6] text-[11px] font-bold text-zinc-700 group-hover:text-[#E6A800] transition-colors">
              <Timer className="w-3 h-3 stroke-[2.2]" />
              <span>Now</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-zinc-900 group-hover:bg-[#F5C518] text-white group-hover:text-black flex items-center justify-center transition-colors">
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Clean Destination Shortcut Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {destinationShortcuts.map((sc, i) => {
            const Icon = sc.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onTakeRide(sc.query)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#FFF9E6] border border-zinc-200/80 hover:border-[#F5C518] shadow-2xs text-[11px] font-semibold text-zinc-700 hover:text-black transition-all shrink-0 cursor-pointer active:scale-95"
              >
                <Icon className="w-3 h-3 text-[#E6A800]" />
                <span>{sc.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. STREAMLINED 4-SERVICES ROW (Uber/Grab Style) */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Services
          </h2>
          <span className="text-[10px] font-mono font-bold text-[#B38000] bg-[#FFF9E6] px-2 py-0.5 rounded-full border border-[#F5C518]/30">
            Flat ৳25/km
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {primaryServices.map((service) => {
            const Icon = service.icon;
            return (
              <button
                key={service.id}
                type="button"
                onClick={service.onClick}
                className="p-2.5 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200/80 hover:border-[#F5C518] shadow-2xs flex flex-col items-center justify-between text-center gap-1.5 transition-all cursor-pointer active:scale-95 group"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${service.accentBg} ${service.accentColor}`}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="w-full">
                  <span className="text-[11px] font-black text-zinc-950 block truncate">
                    {service.name}
                  </span>
                  <span className="text-[9px] font-medium text-zinc-400 block truncate">
                    {service.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. BEEGO SPOTLIGHT CAROUSEL */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#E6A800]" />
            <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
              BeeGo Spotlight
            </h2>
          </div>

          {/* Dots */}
          <div className="flex items-center gap-1">
            {spotlightCards.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSpotlightIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === spotlightIndex ? 'w-4 bg-[#F5C518]' : 'w-1.5 bg-zinc-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Carousel Card */}
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
              className="p-3.5 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-md flex flex-col justify-between gap-3 transition-all duration-300 relative overflow-hidden select-none"
            >
              {/* Background Image with Layered Gradient Overlay */}
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <img
                  src={card.bgImage}
                  alt=""
                  className="w-full h-full object-cover object-center scale-105 opacity-35 filter brightness-90 contrast-125 transition-transform duration-700 ease-out"
                />
                <div className={`absolute inset-0 bg-gradient-to-r ${card.bgGradient} opacity-80 mix-blend-multiply`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20 opacity-90" />
              </div>

              <div className="flex items-start justify-between relative z-10">
                <div>
                  <span className={`text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs ${card.badgeBg}`}>
                    {card.tag}
                  </span>
                  <h3 className={`text-sm font-black mt-1.5 tracking-tight ${card.textColor}`}>
                    {card.title}
                  </h3>
                  <p className={`text-[11px] mt-0.5 font-medium leading-relaxed ${card.subTextColor}`}>
                    {card.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/10 relative z-10">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zero-Surge • 64 Districts</span>
                </div>
                <button
                  type="button"
                  onClick={card.action}
                  className="px-3 py-1.5 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1 group"
                >
                  <span>{card.actionText}</span>
                  <ArrowRight className="w-3 h-3 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 5. POPULAR DESTINATIONS (Curated Top 3 Clean List) */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Quick Destinations
          </h2>
          <span className="text-[10px] text-zinc-400 font-medium">1-tap dispatch</span>
        </div>

        <div className="space-y-1.5">
          {popularDestinations.slice(0, 3).map((dest, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onTakeRide(dest.name)}
              className="w-full p-2.5 rounded-2xl bg-white border border-zinc-200/80 hover:border-[#F5C518] hover:shadow-sm text-left transition-all duration-150 shadow-2xs cursor-pointer active:scale-[0.99] flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 group-hover:bg-[#FFF9E6] text-zinc-600 group-hover:text-[#E6A800] flex items-center justify-center shrink-0 transition-colors">
                  <MapPin className="w-3.5 h-3.5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-zinc-950 block truncate group-hover:text-[#E6A800] transition-colors">
                    {dest.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium block truncate">
                    {dest.area}
                  </span>
                </div>
              </div>

              <div className="w-6 h-6 rounded-full bg-zinc-100 group-hover:bg-[#F5C518] text-zinc-500 group-hover:text-black flex items-center justify-center transition-colors shrink-0">
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 6. CLEAN REFERRAL & PERKS CARD */}
      <div className="p-3.5 rounded-3xl bg-white border border-zinc-200/90 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#FFF9E6] border border-[#F5C518]/30 flex items-center justify-center text-[#E6A800] shrink-0">
            <Gift className="w-4.5 h-4.5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-black text-zinc-950 truncate">
              Invite friends, get ৳100 discount
            </h3>
            <p className="text-[10px] text-zinc-400 font-medium truncate">
              Code: <strong className="font-mono text-zinc-800">VOLTX2026</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyReferral}
          className="px-3 py-1.5 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-[11px] transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0 flex items-center gap-1"
        >
          {copiedCode ? (
            <>
              <Check className="w-3 h-3 stroke-[2.8]" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 stroke-[2]" />
              <span>Share</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
