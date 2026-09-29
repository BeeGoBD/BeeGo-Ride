import React, { useEffect, useState } from 'react';

interface BeegoIntroSplashProps {
  onComplete: () => void;
}

export const BeegoIntroSplash: React.FC<BeegoIntroSplashProps> = ({ onComplete }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Exactly 2-second clean intro duration, then transition to app
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        onComplete();
      }, 300);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 150);
  };

  return (
    <div
      id="beego-intro-splash"
      onClick={handleSkip}
      className={`fixed inset-0 z-50 bg-white flex flex-col items-center justify-center select-none cursor-pointer transition-opacity duration-300 max-w-[430px] mx-auto ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Clean Minimalist B Image / Brand Mark + BeeGo Text (No shining, nothing else) */}
      <div className="flex flex-col items-center justify-center">
        {/* B Image Emblem */}
        <div className="w-20 h-20 rounded-2xl bg-[#F5C518] flex items-center justify-center shadow-md">
          <span className="text-4xl font-black text-black font-sans leading-none tracking-tight select-none">
            B
          </span>
        </div>

        {/* BeeGo Text */}
        <h1 className="text-3xl font-black tracking-tight text-[#1A1A1A] mt-3.5 select-none">
          BeeGo
        </h1>
      </div>
    </div>
  );
};
