import React, { useEffect, useState } from 'react';
import { BeeGoVoltxLogo } from './BeeGoVoltxLogo';
import { Zap } from 'lucide-react';

interface BeegoIntroSplashProps {
  onComplete: () => void;
}

export const BeegoIntroSplash: React.FC<BeegoIntroSplashProps> = ({ onComplete }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // 2-second shining intro duration as requested
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        onComplete();
      }, 400); // smooth fade transition
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 200);
  };

  return (
    <div
      id="beego-intro-splash"
      onClick={handleSkip}
      className={`fixed inset-0 z-50 bg-[#FFFFFF] flex flex-col items-center justify-center select-none cursor-pointer transition-opacity duration-400 max-w-[430px] mx-auto ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Radiant Golden Glow Behind Logo */}
      <div className="absolute w-72 h-72 sm:w-88 sm:h-88 rounded-full bg-[#FFF9E6] blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-44 h-44 rounded-full bg-[#F5C518]/20 blur-2xl pointer-events-none" />

      {/* Center BeeGo Voltx Logo & Shining Text */}
      <div className="relative z-10 flex flex-col items-center px-4">
        {/* Animated Brand Emblem */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="w-24 h-24 rounded-3xl bg-[#F5C518] shadow-2xl shadow-amber-400/30 flex items-center justify-center text-black border-2 border-white transform transition-transform hover:scale-105">
            <Zap className="w-12 h-12 fill-black stroke-[2.2]" />
          </div>
          {/* Subtle halo ring */}
          <div className="absolute -inset-2 rounded-[28px] border border-[#F5C518]/40 animate-ping pointer-events-none" />
        </div>

        {/* Brand Name */}
        <div className="flex items-center gap-1.5 text-center">
          <span className="text-4xl font-black tracking-tight text-[#1A1A1A]">BeeGo</span>
          <span className="text-4xl font-black tracking-tight text-[#E6A800]">Voltx</span>
        </div>

        {/* Minimalist Sub-brand Indicator */}
        <div className="flex items-center gap-2 mt-3 text-[10px] font-bold tracking-widest uppercase text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-[#F5C518] animate-pulse shadow-sm shadow-amber-400/60" />
          <span className="tracking-[0.2em]">FAST ELECTRIC MOBILITY & SWAPPABLE POWER</span>
        </div>
      </div>

      {/* Discreet skip hint */}
      <div className="absolute bottom-10 text-[11px] text-zinc-400 font-medium tracking-wider">
        TAP ANYWHERE TO SKIP
      </div>
    </div>
  );
};
