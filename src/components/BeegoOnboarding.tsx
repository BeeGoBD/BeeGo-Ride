import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Zap,
  Banknote,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Clock,
  BatteryCharging,
  Gauge,
  Lock,
  Compass,
} from 'lucide-react';
import { BeeGoVoltxLogo } from './BeeGoVoltxLogo';

interface BeegoOnboardingProps {
  onFinish: () => void;
}

/**
 * SLIDE 1 ANIMATION: Electric Vehicle Weaving Through Traffic
 */
const TrafficWeavingAnimation: React.FC = () => {
  const [laneStep, setLaneStep] = useState(0);

  // Cycle lane weaving every 1.4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setLaneStep((prev) => (prev + 1) % 4);
    }, 1400);
    return () => clearInterval(timer);
  }, []);

  // Lane positions in percent: 0 = center-left, 1 = right, 2 = left, 3 = center
  const getBikeTransform = () => {
    switch (laneStep) {
      case 0:
        return 'translate(-20px, 0px) rotate(-6deg)';
      case 1:
        return 'translate(36px, -6px) rotate(8deg)';
      case 2:
        return 'translate(-38px, -4px) rotate(-8deg)';
      case 3:
      default:
        return 'translate(0px, 0px) rotate(0deg)';
    }
  };

  return (
    <div className="relative w-full h-72 flex items-center justify-center overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl">
      {/* Background road lighting & ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[#F5C518]/10 blur-3xl pointer-events-none" />

      {/* 3-Lane Perspective Roadway */}
      <div className="relative w-64 h-full flex justify-between px-6 border-x border-zinc-700/60 bg-zinc-900/60 shadow-inner overflow-hidden">
        {/* Animated Dashed Lane Dividers */}
        <div className="w-0.5 h-[200%] border-r-2 border-dashed border-zinc-600/70 animate-[moveDown_1.2s_linear_infinite]" />
        <div className="w-0.5 h-[200%] border-r-2 border-dashed border-zinc-600/70 animate-[moveDown_1.2s_linear_infinite]" />

        {/* Traffic Vehicle 1 (Commuter Car on Left Lane) */}
        <div className="absolute left-8 top-8 w-11 h-18 rounded-xl bg-zinc-700/90 border border-zinc-500 shadow-md flex flex-col items-center justify-between p-1.5 animate-[trafficSlow_3.5s_ease-in-out_infinite]">
          <div className="w-8 h-2 rounded bg-amber-400/70" />
          <span className="text-[7px] font-mono text-zinc-300 font-bold">SEDAN</span>
          <div className="w-8 h-1 rounded bg-rose-600/80" />
        </div>

        {/* Traffic Vehicle 2 (CNG / Auto Rickshaw on Right Lane) */}
        <div className="absolute right-8 top-28 w-12 h-16 rounded-xl bg-emerald-900/90 border border-emerald-600 shadow-md flex flex-col items-center justify-between p-1.5 animate-[trafficFast_4.2s_ease-in-out_infinite]">
          <div className="w-8 h-1.5 rounded bg-yellow-300/80" />
          <span className="text-[7px] font-mono text-emerald-200 font-bold">CNG-EV</span>
          <div className="w-8 h-1 rounded bg-rose-600/80" />
        </div>

        {/* Traffic Vehicle 3 (Commuter Van further ahead) */}
        <div className="absolute left-10 top-44 w-12 h-16 rounded-xl bg-blue-950/80 border border-blue-700/80 shadow-md flex flex-col items-center justify-between p-1">
          <div className="w-9 h-1 rounded bg-amber-400/80" />
          <span className="text-[7px] font-mono text-blue-200">MINI</span>
          <div className="w-9 h-1 rounded bg-rose-600" />
        </div>

        {/* BeeGo Voltx Electric Moto (Actively Weaving dynamically between lanes) */}
        <div
          className="absolute bottom-7 left-1/2 -ml-6 w-12 h-22 flex flex-col items-center justify-center transition-all duration-700 ease-out z-20 cursor-default"
          style={{ transform: getBikeTransform() }}
        >
          {/* Headlight illumination beam cone */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-28 h-20 bg-gradient-to-t from-yellow-300/40 to-transparent clip-path-cone pointer-events-none filter blur-sm" />

          {/* Underglow neon green aura */}
          <div className="absolute inset-0 bg-[#F5C518]/30 rounded-full blur-md animate-pulse" />

          {/* Bike Chassis */}
          <div className="relative w-9 h-18 bg-[#F5C518] rounded-2xl border-2 border-white shadow-xl flex flex-col items-center justify-between p-1">
            {/* Front Headlight */}
            <div className="w-4 h-2 bg-white rounded-full shadow-[0_0_8px_#fff]" />

            {/* Rider & Battery Spark Core */}
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-black border border-white flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-[#F5C518] fill-[#F5C518]" />
              </div>
              <span className="text-[7px] font-black text-black font-mono tracking-tighter mt-0.5">
                VOLTX
              </span>
            </div>

            {/* Rear Tail Light */}
            <div className="w-5 h-1.5 bg-rose-500 rounded-full shadow-[0_0_6px_#f43f5e]" />
          </div>

          {/* Speed Energy Trails */}
          <div className="absolute -bottom-3 flex gap-2">
            <span className="w-0.5 h-4 bg-emerald-400 animate-ping" />
            <span className="w-0.5 h-3 bg-[#F5C518] animate-ping" />
          </div>
        </div>
      </div>

      {/* Floating HUD Badges */}
      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400">
        <Gauge className="w-3 h-3 text-emerald-400" />
        <span>48 km/h • Zero Congestion</span>
      </div>

      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#F5C518] text-black font-black text-[10px] font-mono shadow-md flex items-center gap-1">
        <Zap className="w-3 h-3 fill-black" />
        <span>Flat ৳70/km</span>
      </div>

      {/* Bottom Live Weaving Indicator */}
      <div className="absolute bottom-2.5 inset-x-4 flex items-center justify-between text-[9px] font-mono text-zinc-400 bg-black/80 px-3 py-1 rounded-xl border border-zinc-800">
        <span className="flex items-center gap-1 text-[#F5C518]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Agile EV Weave
        </span>
        <span className="text-zinc-300">Dodging Dhaka Gridlock</span>
      </div>
    </div>
  );
};

/**
 * SLIDE 2 ANIMATION: 30-Second Battery Swap
 */
const BatterySwapAnimation: React.FC = () => {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStage, setSwapStage] = useState<'depleted' | 'swapping' | 'locked'>('locked');

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Trigger automated swap cycle
          setSwapStage('depleted');
          setTimeout(() => setSwapStage('swapping'), 600);
          setTimeout(() => setSwapStage('locked'), 1400);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const progressPercent = ((30 - secondsLeft) / 30) * 100;
  const strokeDash = 2 * Math.PI * 38;

  return (
    <div className="relative w-full h-72 flex items-center justify-center overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl p-4">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#061810] via-zinc-950 to-black" />
      <div className="absolute w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Swap Bay Station Mechanism */}
      <div className="relative z-10 w-full flex flex-col items-center justify-between h-full py-1">
        {/* Top Header: Voltx Hub Terminal */}
        <div className="w-full flex items-center justify-between border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Zap className="w-3.5 h-3.5 fill-emerald-400" />
            </div>
            <div>
              <span className="text-[11px] font-black text-white block">Voltx Power Station Hub</span>
              <span className="text-[9px] text-zinc-400 font-mono">12+ Automated Exchange Bays</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-400 text-[9px] font-mono font-bold animate-pulse">
            Bay #3 Active
          </span>
        </div>

        {/* Center: Live 30-Second Countdown Dial & Battery Dock */}
        <div className="flex items-center justify-around w-full gap-4 my-auto">
          {/* Animated 30-second Circular Dial */}
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="38"
                className="stroke-zinc-800"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r="38"
                className="stroke-emerald-400 transition-all duration-1000 ease-linear"
                strokeWidth="6"
                strokeDasharray={strokeDash}
                strokeDashoffset={strokeDash - (strokeDash * progressPercent) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-black font-mono text-white">
                {secondsLeft}s
              </span>
              <span className="text-[8px] uppercase tracking-wider text-emerald-400 font-bold">
                Swap Time
              </span>
            </div>
          </div>

          {/* Interactive Battery Swap Mechanism Visual */}
          <div className="flex-1 flex flex-col items-center gap-2">
            {/* The Pack */}
            <div
              className={`w-28 h-18 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all duration-500 shadow-xl ${
                swapStage === 'locked'
                  ? 'bg-gradient-to-r from-emerald-950 to-zinc-900 border-emerald-400 shadow-emerald-500/20'
                  : swapStage === 'swapping'
                  ? 'bg-amber-950 border-amber-400 scale-95'
                  : 'bg-rose-950 border-rose-500 scale-90 opacity-60'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <BatteryCharging
                  className={`w-5 h-5 ${
                    swapStage === 'locked'
                      ? 'text-emerald-400 animate-pulse'
                      : swapStage === 'swapping'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                />
                <span
                  className={`text-sm font-black font-mono ${
                    swapStage === 'locked'
                      ? 'text-emerald-300'
                      : swapStage === 'swapping'
                      ? 'text-amber-300'
                      : 'text-rose-300'
                  }`}
                >
                  {swapStage === 'locked' ? '100%' : swapStage === 'swapping' ? 'SWAP' : '12%'}
                </span>
              </div>
              <span className="text-[9px] font-mono text-zinc-300 font-bold uppercase tracking-wider">
                {swapStage === 'locked' ? 'Locked & Ready' : swapStage === 'swapping' ? 'Docking Pack...' : 'Depleted Out'}
              </span>
            </div>

            {/* Range pill */}
            <div className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#F5C518]" />
              <span>Instant <strong>+65 km</strong> Range Restored</span>
            </div>
          </div>
        </div>

        {/* Bottom Station Status Bar */}
        <div className="w-full flex items-center justify-between text-[10px] font-mono bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800">
          <span className="text-zinc-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-400" />
            Never wait hours to charge
          </span>
          <span className="text-emerald-400 font-bold">100% Automated</span>
        </div>
      </div>
    </div>
  );
};

/**
 * SLIDE 3 ANIMATION: Secure Cash Payments
 */
const SecureCashAnimation: React.FC = () => {
  const [pulseShield, setPulseShield] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseShield((prev) => !prev);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-72 flex items-center justify-center overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl p-4">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1c1605] via-zinc-950 to-black" />
      <div className="absolute w-56 h-56 rounded-full bg-[#F5C518]/15 blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full flex flex-col items-center justify-between h-full py-1">
        {/* Header: Zero Surge & Verified Cash */}
        <div className="w-full flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#FFF9E6] text-black flex items-center justify-center font-bold">
              <Banknote className="w-4 h-4 text-black stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[11px] font-black text-white block">Cash on Arrival</span>
              <span className="text-[9px] text-zinc-400 font-mono">100% Transparent • Zero Surge</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#F5C518] text-black text-[9px] font-mono font-black uppercase">
            Active
          </span>
        </div>

        {/* Center Visual: Currency Notes & Glowing Security Escrow Shield */}
        <div className="relative flex items-center justify-center w-full my-auto py-2">
          {/* Fanning Bangladeshi Currency Notes Animation */}
          <div className="relative w-48 h-28 flex items-center justify-center">
            {/* 1000 Taka Note (Purple/Indigo tint) */}
            <div className="absolute -left-2 top-2 w-36 h-20 rounded-2xl bg-gradient-to-br from-indigo-900 to-purple-950 border-2 border-indigo-400/80 shadow-xl p-2 flex flex-col justify-between transform -rotate-12 transition-transform duration-700 hover:rotate-0">
              <div className="flex justify-between items-center text-[9px] font-mono font-black text-indigo-200">
                <span>BANGLADESH BANK</span>
                <span>৳1000</span>
              </div>
              <div className="text-center font-serif font-black text-lg text-indigo-100 opacity-90">
                ১০০০
              </div>
              <div className="text-[7px] font-mono text-indigo-300">ONE THOUSAND TAKA</div>
            </div>

            {/* 500 Taka Note (Green/Emerald tint) */}
            <div className="absolute right-0 bottom-1 w-36 h-20 rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-950 border-2 border-emerald-400 shadow-xl p-2 flex flex-col justify-between transform rotate-6 transition-transform duration-700 hover:rotate-0 z-10">
              <div className="flex justify-between items-center text-[9px] font-mono font-black text-emerald-200">
                <span>BANGLADESH BANK</span>
                <span>৳500</span>
              </div>
              <div className="text-center font-serif font-black text-lg text-emerald-100 opacity-90">
                ৫০০
              </div>
              <div className="text-[7px] font-mono text-emerald-300">FIVE HUNDRED TAKA</div>
            </div>

            {/* Glowing Digital Security Vault Shield in Center */}
            <div
              className={`absolute z-20 w-16 h-16 rounded-full bg-black/90 border-2 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md transition-all duration-700 ${
                pulseShield
                  ? 'border-[#F5C518] shadow-[0_0_20px_#f5c518] scale-110'
                  : 'border-emerald-400 shadow-[0_0_15px_#10b981] scale-100'
              }`}
            >
              <ShieldCheck className="w-7 h-7 text-[#F5C518]" />
              <span className="text-[7px] font-mono font-black text-white mt-0.5">SECURE</span>
            </div>
          </div>
        </div>

        {/* Fare Breakdown Seal */}
        <div className="w-full bg-zinc-900/90 rounded-2xl p-2.5 border border-zinc-800 flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pay Direct to Captain</span>
          </div>
          <span className="text-[#F5C518] font-black">৳0 Peak / Rain Surge Fee</span>
        </div>
      </div>
    </div>
  );
};

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

  // 3 Dynamic Slides with Live Animations
  const slides = [
    // SLIDE 1: EV WEAVING THROUGH TRAFFIC
    {
      id: 0,
      badge: 'Eco-Friendly Rides • Flat ৳70/km',
      headline: 'Electric Rides Weaving Traffic',
      subtext: 'Bypass Dhaka traffic gridlock smoothly with agile electric bikes and guaranteed zero-surge flat ৳70/km fares.',
      illustration: <TrafficWeavingAnimation />,
    },

    // SLIDE 2: 30-SECOND BATTERY SWAP
    {
      id: 1,
      badge: 'Voltx Power Network • 12+ City Hubs',
      headline: '30-Second Battery Swap',
      subtext: 'Never wait hours to charge. Swap your battery in 30 seconds at any of our 12+ city Voltx power exchange stations.',
      illustration: <BatterySwapAnimation />,
    },

    // SLIDE 3: SECURE CASH PAYMENTS
    {
      id: 2,
      badge: 'Zero-Surge Guarantee • Cash on Arrival',
      headline: 'Secure Cash Payments',
      subtext: 'Pay cash directly on arrival with total peace of mind. Transparent honest pricing with zero surge fees, ever.',
      illustration: <SecureCashAnimation />,
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
        {/* Animated Illustration Container */}
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
