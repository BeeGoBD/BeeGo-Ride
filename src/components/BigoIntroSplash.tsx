import React, { useEffect, useState } from 'react';

interface BigoIntroSplashProps {
  onComplete: () => void;
}

export const BigoIntroSplash: React.FC<BigoIntroSplashProps> = ({ onComplete }) => {
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
      id="bigo-intro-splash"
      onClick={handleSkip}
      className={`fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none cursor-pointer transition-opacity duration-400 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle Radial Glow Behind Bigo */}
      <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-white/10 blur-3xl bigo-glow-orb pointer-events-none" />

      {/* Center Bigo Shining Text (Uber-style) */}
      <div className="relative flex flex-col items-center">
        <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter bigo-shining-text">
          Bigo
        </h1>

        {/* Minimalist Sub-brand Indicator */}
        <div className="flex items-center gap-2 mt-4 text-xs font-semibold tracking-widest uppercase text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>RIDES • BANGLADESH</span>
        </div>
      </div>

      {/* Discreet skip hint */}
      <div className="absolute bottom-8 text-[11px] text-zinc-600 font-mono tracking-wider">
        TAP ANYWHERE TO SKIP
      </div>
    </div>
  );
};
