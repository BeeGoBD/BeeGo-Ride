import React, { useEffect, useState } from 'react';

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
      className={`fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none cursor-pointer transition-opacity duration-400 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Radiant Golden Honey Glow Behind Beego */}
      <div className="absolute w-80 h-80 sm:w-[28rem] sm:h-[28rem] rounded-full bg-amber-400/20 blur-3xl beego-glow-orb pointer-events-none" />

      {/* Center Beego Shining Text with Bee Theme */}
      <div className="relative flex flex-col items-center">
        <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter beego-shining-text">
          Beego
        </h1>

        {/* Minimalist Bee Sub-brand Indicator */}
        <div className="flex items-center gap-2 mt-4 text-xs font-bold tracking-widest uppercase text-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/60" />
          <span className="tracking-[0.25em]">BEE FAST RIDES • BANGLADESH</span>
        </div>
      </div>

      {/* Discreet skip hint */}
      <div className="absolute bottom-8 text-[11px] text-amber-500/60 font-mono tracking-wider">
        TAP ANYWHERE TO SKIP
      </div>
    </div>
  );
};
