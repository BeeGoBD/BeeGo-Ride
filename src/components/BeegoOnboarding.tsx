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

interface BeegoOnboardingProps {
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
    badge: 'Bee Fast Transit',
    title: 'Buzzing Across Dhaka &',
    highlight: '64 Districts',
    description:
      'Lightning-fast motorbikes and comfortable AC sedans with verified Captains ready to dispatch from the hive.',
    icon: Bike,
    accentColor: 'from-amber-500/25 to-yellow-500/10 text-amber-400 border-amber-500/40',
    features: ['Instant Captain Dispatch', 'Agile Bee Moto Fleet', 'Full Bangladesh Coverage'],
  },
  {
    badge: 'Honest Honey Fare',
    title: 'Fair & Flat Pricing at',
    highlight: '৳70 / km',
    description:
      'Zero surge pricing and zero surprises. Exact kilometer rates calculated with live route navigation.',
    icon: Gauge,
    accentColor: 'from-yellow-500/25 to-amber-500/10 text-yellow-400 border-yellow-500/40',
    features: ['৳70 Flat Fare / km', 'Zero Hidden Fees', 'Digital Itemized Receipts'],
  },
  {
    badge: 'Live Radar Hive',
    title: 'Precision Map Radar &',
    highlight: 'Live Tracking',
    description:
      'Follow your Captain in real time on vector maps with minute-by-minute ETA and live progress updates.',
    icon: MapPin,
    accentColor: 'from-amber-400/25 to-yellow-400/10 text-amber-300 border-amber-400/40',
    features: ['Live GPS Radar', 'Precise ETA & Meter', 'Share Trip Location'],
  },
  {
    badge: 'Safety & Cashless',
    title: 'Verified Safety &',
    highlight: 'Instant Payouts',
    description:
      'Dual certified helmets, 24/7 safety response, and easy payments via bKash, Nagad, or cash on arrival.',
    icon: ShieldCheck,
    accentColor: 'from-yellow-400/25 to-amber-600/10 text-yellow-300 border-yellow-400/40',
    features: ['Certified Safety Helmets', 'bKash, Nagad & Cash Support', '24/7 Captain Hotline'],
  },
];

export const BeegoOnboarding: React.FC<BeegoOnboardingProps> = ({ onFinish }) => {
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
      id="beego-onboarding"
      className="w-full min-h-screen bg-black text-white flex flex-col justify-between px-4 py-8 sm:py-12 select-none"
    >
      {/* Top Bar: Brand & Skip Button */}
      <div className="w-full max-w-xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tighter text-white">Beego</span>
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50" />
        </div>

        <button
          type="button"
          onClick={onFinish}
          className="text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-amber-400 px-3 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          Skip Intro
        </button>
      </div>

      {/* Main Slide Card */}
      <div className="w-full max-w-xl mx-auto my-auto py-6">
        <div className="relative rounded-3xl bg-zinc-950 border border-zinc-800/80 p-6 sm:p-8 shadow-2xl overflow-hidden transition-all duration-300">
          {/* Subtle Ambient Golden Bee Background Glow */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Slide Category Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-500/30 text-[11px] font-semibold text-amber-300 mb-6">
            <Sparkles className="w-3 h-3 text-amber-400" />
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
            <span className="text-amber-400 block sm:inline">{slide.highlight}</span>
          </h2>

          {/* Slide Description */}
          <p className="text-sm sm:text-base text-zinc-400 mt-3 leading-relaxed">
            {slide.description}
          </p>

          {/* Feature Highlights Checklist */}
          <div className="mt-6 pt-6 border-t border-zinc-900 flex flex-col gap-2.5">
            {slide.features.map((item, index) => (
              <div key={index} className="flex items-center gap-2.5 text-xs sm:text-sm text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
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
                  ? 'w-8 bg-amber-400 shadow-sm shadow-amber-400/50'
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

          {/* Next / Finish Button with Bee Yellow Theme */}
          <button
            type="button"
            onClick={handleNext}
            className="flex-2 sm:flex-1 px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-400/20 cursor-pointer active:scale-98"
          >
            <span>{isLast ? 'Select Dashboard' : 'Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
