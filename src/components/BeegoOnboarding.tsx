import React, { useState, useRef } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Smartphone,
  MapPin,
  BatteryCharging,
  Bike,
  Car,
  Building2,
  Zap,
  Wallet,
  Banknote,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { BeeGoVoltxLogo } from './BeeGoVoltxLogo';

interface BeegoOnboardingProps {
  onFinish: () => void;
}

interface SlideData {
  id: number;
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
      if (diffX < 0 && currentSlide < 3) {
        // Swiped Left -> Next
        setCurrentSlide((prev) => prev + 1);
      } else if (diffX > 0 && currentSlide > 0) {
        // Swiped Right -> Prev
        setCurrentSlide((prev) => prev - 1);
      }
    }
    touchStartX.current = null;
  };

  const slides: SlideData[] = [
    {
      id: 0,
      headline: 'One App for All Services',
      subtext: 'Get a ride, battery swap, power station access and much more at your fingertips.',
      illustration: (
        <div className="relative w-full h-64 flex items-center justify-center">
          {/* Subtle background circles */}
          <div className="absolute w-52 h-52 rounded-full bg-[#FFF9E6] -z-0" />
          <div className="absolute w-40 h-40 rounded-full bg-[#F5C518]/15 -z-0" />

          {/* Hand holding phone illustration */}
          <div className="relative z-10 w-36 h-56 bg-[#1A1A1A] rounded-[28px] p-2 shadow-2xl shadow-amber-500/10 border-4 border-white flex flex-col justify-between">
            {/* Phone Screen Header */}
            <div className="w-12 h-3.5 bg-zinc-800 rounded-full mx-auto mb-1" />
            
            {/* Mini Map on Screen */}
            <div className="flex-1 bg-[#F8F9FA] rounded-xl p-2 relative overflow-hidden flex flex-col justify-between border border-zinc-200">
              <div className="w-full h-full absolute inset-0 opacity-40 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:10px_10px]" />
              
              {/* Route line */}
              <div className="relative z-10 flex items-center justify-between text-[8px] font-bold text-zinc-600 bg-white/90 p-1.5 rounded-lg shadow-sm">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Gulshan 2
                </span>
                <span className="text-[#E6A800]">৳70/km</span>
              </div>

              {/* Pin */}
              <div className="relative z-10 flex items-center justify-center my-auto">
                <div className="w-8 h-8 rounded-full bg-[#F5C518] flex items-center justify-center shadow-md shadow-amber-400/40 animate-bounce">
                  <MapPin className="w-4 h-4 text-black fill-black" />
                </div>
              </div>

              <div className="relative z-10 text-[9px] font-black text-center bg-white/90 py-1 rounded-md text-zinc-900 shadow-sm">
                BeeGo Voltx
              </div>
            </div>

            {/* Home indicator */}
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-1" />
          </div>

          {/* Floating Power Battery Badge */}
          <div className="absolute -top-1 right-8 z-20 bg-white border border-[#F5C518]/30 rounded-2xl px-3 py-2 shadow-xl shadow-amber-500/15 flex items-center gap-2 animate-pulse">
            <div className="w-7 h-7 rounded-xl bg-[#F5C518] flex items-center justify-center text-black shadow-sm">
              <BatteryCharging className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-[10px] font-black text-[#1A1A1A]">100% Charged</div>
              <div className="text-[9px] text-[#E6A800] font-semibold">Ready to swap</div>
            </div>
          </div>

          {/* Floating Mini Ride Badge */}
          <div className="absolute bottom-4 left-6 z-20 bg-white border border-zinc-200 rounded-2xl px-3 py-2 shadow-lg flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-zinc-900 flex items-center justify-center text-[#F5C518]">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-black text-[#1A1A1A]">Bee Moto</div>
              <div className="text-[9px] text-zinc-500">2 mins away</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 1,
      headline: 'Get On Time',
      subtext: 'Fast, reliable rides and battery services when you need them.',
      illustration: (
        <div className="relative w-full h-64 flex items-center justify-center">
          <div className="absolute w-52 h-52 rounded-full bg-[#FFF9E6] -z-0" />

          {/* City skyline background */}
          <div className="absolute bottom-6 w-4/5 h-20 bg-gradient-to-t from-zinc-200/80 to-transparent rounded-t-2xl flex items-end justify-around px-4 pb-2 z-0">
            <Building2 className="w-10 h-14 text-zinc-300 stroke-[1.5]" />
            <Building2 className="w-8 h-18 text-zinc-400 stroke-[1.5]" />
            <Building2 className="w-12 h-12 text-zinc-300 stroke-[1.5]" />
            <Building2 className="w-7 h-16 text-zinc-300 stroke-[1.5]" />
          </div>

          {/* Electric Bike Card */}
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-44 h-24 rounded-2xl bg-white border border-zinc-200/90 p-3 shadow-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono font-bold text-[#E6A800] uppercase tracking-wider">Fast Transit</span>
                <span className="text-sm font-black text-[#1A1A1A]">Electric Moto</span>
                <span className="text-[10px] text-zinc-500">৳70 / km flat rate</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#F5C518] flex items-center justify-center shadow-md shadow-amber-400/30">
                <Bike className="w-6 h-6 text-black stroke-[2.5]" />
              </div>
            </div>

            {/* Comfort AC Car Card */}
            <div className="w-44 h-16 rounded-xl bg-white/90 border border-zinc-200 p-2.5 shadow-md flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#1A1A1A]">Comfort Car</span>
                <span className="text-[9px] text-zinc-500">Dual AC sedan</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center text-[#F5C518]">
                <Car className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      headline: 'Power Anywhere',
      subtext: 'Access hundreds of power stations and swap batteries in seconds.',
      illustration: (
        <div className="relative w-full h-64 flex items-center justify-center">
          <div className="absolute w-52 h-52 rounded-full bg-[#FFF9E6] -z-0" />

          {/* Battery Swap Grid Illustration */}
          <div className="relative z-10 w-52 bg-white rounded-3xl p-4 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#F5C518] flex items-center justify-center text-black">
                  <Zap className="w-3.5 h-3.5 fill-black" />
                </div>
                <span className="text-xs font-black text-[#1A1A1A]">Voltx Station #4</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Online
              </span>
            </div>

            {/* 6 Battery Cells Grid */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((cell) => (
                <div
                  key={cell}
                  className={`h-12 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                    cell <= 5
                      ? 'bg-[#FFF9E6] border-[#F5C518]/50 text-amber-700'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                  }`}
                >
                  <BatteryCharging className={`w-3.5 h-3.5 ${cell <= 5 ? 'text-[#E6A800]' : 'text-zinc-400'}`} />
                  <span className="text-[8px] font-mono font-bold">
                    {cell <= 5 ? '100%' : 'Charging'}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500 font-medium">
              <span>Available Swap:</span>
              <span className="font-bold text-[#E6A800]">5 Batteries</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      headline: 'Simple Payments',
      subtext: 'Pay with cash easily. Digital options coming soon.',
      illustration: (
        <div className="relative w-full h-64 flex items-center justify-center">
          <div className="absolute w-52 h-52 rounded-full bg-[#FFF9E6] -z-0" />

          {/* Cash Payment Card (Active) */}
          <div className="relative z-10 w-56 flex flex-col gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-xl border-2 border-[#F5C518] relative">
              <div className="absolute -top-2.5 right-3 bg-[#F5C518] text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                Active
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-center text-[#E6A800]">
                  <Banknote className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-sm font-black text-[#1A1A1A]">Cash on Arrival</div>
                  <div className="text-[10px] text-zinc-500">Pay directly to Rider in Taka</div>
                </div>
              </div>
            </div>

            {/* Digital Payment Card (Coming Soon) */}
            <div className="bg-white/80 rounded-2xl p-3 border border-zinc-200/80 shadow-sm flex items-center justify-between opacity-80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-700">bKash & Nagad</div>
                  <div className="text-[9px] text-zinc-400">Digital Wallet</div>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-md">
                Coming Soon
              </span>
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
      className="w-full min-h-screen bg-white text-[#1A1A1A] flex flex-col justify-between p-6 select-none max-w-[430px] mx-auto shadow-2xl relative"
    >
      {/* Top Header: Logo + Skip */}
      <div className="w-full flex items-center justify-between pt-2">
        <BeeGoVoltxLogo size="md" />

        {!isLast && (
          <button
            type="button"
            onClick={onFinish}
            className="text-xs font-bold text-zinc-400 hover:text-zinc-700 transition-colors px-2 py-1 rounded-lg cursor-pointer"
          >
            Skip
          </button>
        )}
      </div>

      {/* Middle Illustration Area */}
      <div className="my-auto py-4 flex flex-col items-center">
        {/* Animated Illustration */}
        <div className="w-full transition-all duration-300 ease-out">
          {slide.illustration}
        </div>

        {/* Headline & Subtext */}
        <div className="w-full text-center px-4 mt-6">
          <h2 className="text-2xl font-black tracking-tight text-[#1A1A1A] mb-2">
            {slide.headline}
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed font-normal">
            {slide.subtext}
          </p>
        </div>
      </div>

      {/* Bottom Navigation: Progress Dots & Action Buttons */}
      <div className="w-full flex flex-col gap-4 pb-4">
        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-1.5 py-2">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentSlide
                  ? 'w-6 bg-[#F5C518]'
                  : 'w-2 bg-zinc-200 hover:bg-zinc-300'
              }`}
            />
          ))}
        </div>

        {/* Buttons Row */}
        <div className="flex items-center gap-3">
          {currentSlide > 0 && (
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => prev - 1)}
              className="w-12 h-12 rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center text-zinc-700 transition-all cursor-pointer shrink-0"
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
              className="flex-1 py-3.5 px-6 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/25 transition-all cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => prev + 1)}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
