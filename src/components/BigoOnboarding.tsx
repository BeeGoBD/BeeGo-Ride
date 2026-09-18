import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Bike,
  Gauge,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface BigoOnboardingProps {
  onFinish: () => void;
}

interface SlideItem {
  badge: string;
  title: string;
  highlight: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  features: string[];
}

const ONBOARDING_SLIDES: SlideItem[] = [
  {
    badge: 'Slide 1 of 4 • Bangladesh Rides',
    title: 'Fast & Reliable Rides in',
    highlight: 'All 64 Districts',
    description:
      'Zip through city traffic on agile motorbikes or relax in comfortable AC sedans. Verified local Captains ready across Dhaka, Chittagong, Sylhet, and beyond.',
    icon: Bike,
    accentColor: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/30',
    features: ['⚡ Instant Captain Dispatch', '🏍️ Quick Motorbikes & AC Cars', '🇧🇩 64 Districts Coverage'],
  },
  {
    badge: 'Slide 2 of 4 • Transparent Fare',
    title: 'Fair & Flat Pricing at',
    highlight: '৳70 Taka / KM',
    description:
      'Zero surge pricing surprises and zero hidden fees. Clear distance calculation powered by real-time Geoapify navigation meter directly on your screen.',
    icon: Gauge,
    accentColor: 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/30',
    features: ['📊 ৳70 Flat Fare Per Kilometer', '🚫 Zero Surge Extortion', '🧾 Itemized Digital Fare Receipt'],
  },
  {
    badge: 'Slide 3 of 4 • Real-Time GPS',
    title: 'Precision Map Radar &',
    highlight: 'Captain Telemetry',
    description:
      'Track your Captain in real time on dark-mode vector maps. Receive live arrival alerts, exact kilometer odometers, and share trip tracking with your family.',
    icon: MapPin,
    accentColor: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/30',
    features: ['📍 Live GPS Radar & Beacon', '⏱️ Minute-by-minute ETA', '🛡️ SMS Live Location Share'],
  },
  {
    badge: 'Slide 4 of 4 • Safety & Cashless',
    title: 'Verified Safety &',
    highlight: 'Seamless Payments',
    description:
      'Dual certified helmets for rider and passenger, 24/7 Police 999 emergency hotline, and flexible payment via bKash, Nagad, or direct cash on arrival.',
    icon: ShieldCheck,
    accentColor: 'from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/30',
    features: ['🪖 Dual Certified Helmets', '💳 bKash, Nagad & Cash Support', '🚨 24/7 Safety SOS Helpline'],
  },
];

export const BigoOnboarding: React.FC<BigoOnboardingProps> = ({ onFinish }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const isLast = currentSlide === ONBOARDING_SLIDES.length - 1;
  const slide = ONBOARDING_SLIDES[currentSlide];
  const IconComponent = slide.icon;

  const handleNext = () => {
    if (isLast) {
      onFinish();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  return (
    <div
      id="bigo-onboarding"
      className="w-full min-h-screen bg-black text-white flex flex-col justify-between px-4 py-8 sm:py-12 select-none"
    >
      {/* Top Bar: Brand & Skip Button */}
      <div className="w-full max-w-xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tighter text-white">Bigo</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        <button
          type="button"
          onClick={onFinish}
          className="text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          Skip Intro
        </button>
      </div>

      {/* Main Slide Card */}
      <div className="w-full max-w-xl mx-auto my-auto py-6">
        <div className="relative rounded-3xl bg-zinc-950 border border-zinc-800/80 p-6 sm:p-8 shadow-2xl overflow-hidden transition-all duration-300">
          {/* Subtle Ambient Background Gradient */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Slide Category Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-semibold text-zinc-300 mb-6">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>{slide.badge}</span>
          </div>

          {/* Large Hero Icon */}
          <div className="mb-6">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${slide.accentColor} border flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105`}
            >
              <IconComponent className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
          </div>

          {/* Slide Headline */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
            {slide.title}{' '}
            <span className="text-emerald-400 block sm:inline">{slide.highlight}</span>
          </h2>

          {/* Slide Description */}
          <p className="text-sm sm:text-base text-zinc-400 mt-3 leading-relaxed">
            {slide.description}
          </p>

          {/* Feature Highlights Checklist */}
          <div className="mt-6 pt-6 border-t border-zinc-900 flex flex-col gap-2.5">
            {slide.features.map((item, index) => (
              <div key={index} className="flex items-center gap-2.5 text-xs sm:text-sm text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Controls: Indicators, Back and Next */}
      <div className="w-full max-w-xl mx-auto flex flex-col gap-4">
        {/* Dot / Pill Indicators */}
        <div className="flex items-center justify-center gap-2">
          {ONBOARDING_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentSlide
                  ? 'w-8 bg-emerald-400'
                  : 'w-2 bg-zinc-800 hover:bg-zinc-700'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Buttons Row */}
        <div className="flex items-center gap-3">
          {/* Back Button */}
          {currentSlide > 0 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="flex-1 sm:flex-initial px-5 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div className="w-0 sm:w-auto" />
          )}

          {/* Next / Finish Button */}
          <button
            type="button"
            onClick={handleNext}
            className="flex-2 sm:flex-1 px-6 py-3.5 rounded-xl bg-white hover:bg-zinc-100 text-black font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer active:scale-98"
          >
            <span>{isLast ? 'Select Dashboard' : 'Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
