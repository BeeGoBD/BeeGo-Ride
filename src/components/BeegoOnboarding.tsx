import React, { useState, useRef } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  MapPin,
  BatteryCharging,
  Bike,
  Car,
  Zap,
  Banknote,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { BeeGoVoltxLogo } from './BeeGoVoltxLogo';

interface BeegoOnboardingProps {
  onFinish: () => void;
}

interface SlideData {
  id: number;
  badge: string;
  headline: string;
  subtext: string;
  illustration: React.ReactNode;
}

export const BeegoOnboarding: React.FC<BeegoOnboardingProps> = ({ onFinish }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Swipe gesture tracking
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diffX) > 40) {
      if (diffX < 0 && currentSlide < slides.length - 1) {
        // Swiped Left -> Next
        setCurrentSlide((prev) => prev + 1);
      } else if (diffX > 0 && currentSlide > 0) {
        // Swiped Right -> Prev
        setCurrentSlide((prev) => prev - 1);
      }
    }
    touchStartX.current = null;
  };

  // 3 Mock Slides based on the BeeGo Voltx Website
  const slides: SlideData[] = [
    // SLIDE 1: INSTANT ELECTRIC RIDES (Ride Booking & ৳70/km Flat Rate)
    {
      id: 0,
      badge: 'Eco-Friendly Rides • Flat ৳70/km',
      headline: 'Instant Electric Rides',
      subtext: 'Book fast, zero-surge electric rides across Dhaka and Chittagong with guaranteed flat ৳70/km pricing.',
      illustration: (
        <div className="relative w-full h-72 flex items-center justify-center">
          {/* Subtle background glow */}
          <div className="absolute w-60 h-60 rounded-full bg-[#FFF9E6] -z-0" />
          <div className="absolute w-44 h-44 rounded-full bg-[#F5C518]/20 -z-0 animate-pulse" />

          {/* Mock Website Ride Booking Card */}
          <div className="relative z-10 w-72 bg-white rounded-3xl p-4 shadow-2xl border border-zinc-200/90 flex flex-col gap-3">
            {/* Mock Route Selector */}
            <div className="bg-zinc-50 rounded-2xl p-2.5 border border-zinc-100 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" />
                <div className="min-w-0 flex-1 truncate font-bold text-zinc-900">
                  Gulshan 2 Circle, Dhaka
                </div>
                <span className="text-[10px] font-mono text-[#B38000] font-black shrink-0">Pickup</span>
              </div>
              <div className="ml-1 w-0.5 h-2.5 bg-zinc-200" />
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 shrink-0" />
                <div className="min-w-0 flex-1 truncate font-bold text-zinc-900">
                  Dhanmondi 27, Dhaka
                </div>
                <span className="text-[10px] font-mono text-zinc-400 font-bold shrink-0">Drop-off</span>
              </div>
            </div>

            {/* Vehicle Options Mockup */}
            <div className="grid grid-cols-2 gap-2">
              {/* Option 1: Moto (Active) */}
              <div className="p-2.5 rounded-2xl bg-[#FFF9E6] border-2 border-[#F5C518] shadow-xs flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-xl bg-[#F5C518] flex items-center justify-center text-black shadow-xs">
                    <Bike className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="text-[9px] font-mono font-black text-[#B38000] uppercase bg-white/80 px-1.5 py-0.5 rounded-md">
                    2 min
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-black text-zinc-900">Voltx Moto</div>
                  <div className="text-[10px] font-bold text-[#B38000]">৳70 / km flat</div>
                </div>
              </div>

              {/* Option 2: Comfort Sedan */}
              <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-xl bg-zinc-200 flex items-center justify-center text-zinc-700">
                    <Car className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-zinc-500 bg-white px-1.5 py-0.5 rounded-md">
                    4 min
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold text-zinc-800">Voltx Sedan</div>
                  <div className="text-[10px] text-zinc-500">AC Comfort</div>
                </div>
              </div>
            </div>

            {/* Verified Driver Pill */}
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5 text-zinc-600 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Captain • 4.9 ★</span>
              </div>
              <span className="font-mono font-black text-zinc-900">৳210 Total</span>
            </div>
          </div>
        </div>
      ),
    },

    // SLIDE 2: 30-SECOND BATTERY SWAP (Voltx Power Station Network)
    {
      id: 1,
      badge: 'Voltx Power Network • 12+ City Hubs',
      headline: '30-Second Battery Swap',
      subtext: 'Never wait hours to charge. Swap your battery in 30 seconds at any of our 12+ city Voltx power stations.',
      illustration: (
        <div className="relative w-full h-72 flex items-center justify-center">
          <div className="absolute w-60 h-60 rounded-full bg-[#FFF9E6] -z-0" />
          <div className="absolute w-44 h-44 rounded-full bg-emerald-500/10 -z-0" />

          {/* Mock Voltx Power Station Hub Card */}
          <div className="relative z-10 w-72 bg-white rounded-3xl p-4 shadow-2xl border border-zinc-200/90 flex flex-col gap-3">
            {/* Station Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F5C518] flex items-center justify-center text-black shadow-xs">
                  <Zap className="w-4 h-4 fill-black text-black" />
                </div>
                <div>
                  <div className="text-xs font-black text-zinc-950">Voltx Hub #4 • Mohakhali</div>
                  <div className="text-[10px] text-zinc-400 font-medium">Fast Exchange Dock</div>
                </div>
              </div>
              <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Online
              </span>
            </div>

            {/* 6 Battery Cells Mockup */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((cell) => {
                const isFull = cell <= 5;
                return (
                  <div
                    key={cell}
                    className={`h-13 rounded-2xl border p-1.5 flex flex-col items-center justify-center gap-1 transition-all ${
                      isFull
                        ? 'bg-[#FFF9E6] border-[#F5C518] text-[#B38000] shadow-2xs'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                    }`}
                  >
                    <BatteryCharging className={`w-4 h-4 ${isFull ? 'text-[#E6A800]' : 'text-zinc-400'}`} />
                    <span className="text-[9px] font-mono font-black">
                      {isFull ? '100%' : '85%'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Live Swap Metrics */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100 text-center">
                <span className="text-[9px] text-zinc-400 font-semibold block uppercase tracking-wider">Swap Time</span>
                <span className="text-xs font-black text-zinc-900 font-mono">~30 seconds</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-200/60 text-center">
                <span className="text-[9px] text-amber-800 font-semibold block uppercase tracking-wider">Range per Pack</span>
                <span className="text-xs font-black text-[#B38000] font-mono">65 km</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // SLIDE 3: ZERO-SURGE & CASH ON ARRIVAL (Transparent Pricing Guarantee)
    {
      id: 2,
      badge: 'Zero-Surge Guarantee • Cash on Arrival',
      headline: 'Zero-Surge & Cash Payment',
      subtext: 'Pay cash on arrival with total peace of mind. Guaranteed flat transparent pricing with zero surge fees, ever.',
      illustration: (
        <div className="relative w-full h-72 flex items-center justify-center">
          <div className="absolute w-60 h-60 rounded-full bg-[#FFF9E6] -z-0" />
          <div className="absolute w-44 h-44 rounded-full bg-[#F5C518]/15 -z-0" />

          {/* Mock Website Transparent Pricing Card */}
          <div className="relative z-10 w-72 bg-white rounded-3xl p-4 shadow-2xl border border-zinc-200/90 flex flex-col gap-3">
            {/* Primary Payment Card */}
            <div className="p-3 rounded-2xl bg-white border-2 border-[#F5C518] shadow-md flex items-center justify-between relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-center text-[#B38000]">
                  <Banknote className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-xs font-black text-zinc-950 flex items-center gap-1.5">
                    <span>Cash on Arrival</span>
                    <span className="text-[9px] bg-[#F5C518] text-black font-black px-1.5 py-0.2 rounded-md uppercase">
                      Active
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-medium">Pay directly in Taka to Captain</div>
                </div>
              </div>
            </div>

            {/* Zero Surge Fare Breakdown Mockup */}
            <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100 flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center justify-between text-zinc-600">
                <span>Base Fare</span>
                <span className="font-mono font-bold text-zinc-900">৳50</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600">
                <span>Standard Distance (per km)</span>
                <span className="font-mono font-bold text-zinc-900">৳70 flat</span>
              </div>
              <div className="flex items-center justify-between font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Peak / Rain Surge Fee
                </span>
                <span className="font-mono font-black">৳0 (Guaranteed)</span>
              </div>
            </div>

            {/* Safety Assurance */}
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>SOS & 24/7 Helpline • BeeGo Voltx Bangladesh</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const isLast = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];

  return (
    <div
      id="beego-voltx-onboarding"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full h-full min-h-[100dvh] bg-white text-[#1A1A1A] flex flex-col justify-between p-5 sm:p-6 select-none max-w-[430px] mx-auto shadow-2xl relative font-sans"
    >
      {/* Top Header: Logo + Skip */}
      <div className="w-full flex items-center justify-between pt-1">
        <BeeGoVoltxLogo size="md" />

        {!isLast ? (
          <button
            type="button"
            onClick={onFinish}
            className="text-xs font-bold text-zinc-400 hover:text-zinc-800 transition-colors px-2.5 py-1 rounded-xl cursor-pointer hover:bg-zinc-100 active:scale-95"
          >
            Skip
          </button>
        ) : (
          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider px-2 py-0.5">
            Step 3 of 3
          </span>
        )}
      </div>

      {/* Middle Illustration & Content Area */}
      <div className="my-auto py-2 flex flex-col items-center">
        {/* Animated Illustration */}
        <div className="w-full transition-all duration-300 ease-out">
          {slide.illustration}
        </div>

        {/* Badge, Headline & Subtext */}
        <div className="w-full text-center px-4 mt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF9E6] border border-[#F5C518]/40 text-[#B38000] text-[10px] font-mono font-black uppercase tracking-wider mb-2">
            <span>{slide.badge}</span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-[#1A1A1A] mb-2">
            {slide.headline}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed font-medium max-w-[320px] mx-auto">
            {slide.subtext}
          </p>
        </div>
      </div>

      {/* Bottom Navigation: Progress Dots & Action Buttons */}
      <div className="w-full flex flex-col gap-3.5 pb-2">
        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentSlide
                  ? 'w-7 bg-[#F5C518] shadow-xs'
                  : 'w-2 bg-zinc-200 hover:bg-zinc-300'
              }`}
            />
          ))}
        </div>

        {/* Buttons Row */}
        <div className="flex items-center gap-2.5">
          {currentSlide > 0 && (
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => prev - 1)}
              className="w-13 h-13 rounded-2xl border border-zinc-200/90 bg-white hover:bg-zinc-50 active:scale-95 flex items-center justify-center text-zinc-700 transition-all cursor-pointer shrink-0 shadow-2xs"
              title="Previous"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {isLast ? (
            <button
              type="button"
              id="onboarding-get-started-button"
              onClick={onFinish}
              className="flex-1 h-13 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 stroke-[2.8]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => prev + 1)}
              className="flex-1 h-13 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4 stroke-[2.8]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default BeegoOnboarding;
