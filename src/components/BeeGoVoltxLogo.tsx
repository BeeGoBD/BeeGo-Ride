import React from 'react';
import { Zap } from 'lucide-react';

interface BeeGoVoltxLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: string;
  className?: string;
}

export const BeeGoVoltxLogo: React.FC<BeeGoVoltxLogoProps> = ({
  size = 'md',
  showBadge,
  className = '',
}) => {
  const sizeClasses = {
    sm: {
      text: 'text-lg',
      icon: 'w-4 h-4',
      badge: 'text-[9px] px-1.5 py-0.2',
    },
    md: {
      text: 'text-xl',
      icon: 'w-4 h-4',
      badge: 'text-[10px] px-2 py-0.5',
    },
    lg: {
      text: 'text-2xl',
      icon: 'w-5 h-5',
      badge: 'text-xs px-2.5 py-0.5',
    },
    xl: {
      text: 'text-3xl',
      icon: 'w-7 h-7',
      badge: 'text-xs px-3 py-1',
    },
  }[size];

  return (
    <div className={`flex items-center gap-1.5 select-none ${className}`}>
      {/* Golden Yellow Bee Volt Hexagon Icon */}
      <div className="relative flex items-center justify-center shrink-0">
        <div className="w-7 h-7 rounded-xl bg-[#F5C518] flex items-center justify-center shadow-sm shadow-amber-400/30">
          <Zap className={`${sizeClasses.icon} text-black fill-black`} />
        </div>
      </div>

      {/* Typography: BeeGo (dark) + Voltx (golden yellow) */}
      <div className="flex items-baseline tracking-tight">
        <span className={`font-black text-[#1A1A1A] ${sizeClasses.text}`}>BeeGo</span>
        <span className={`font-black text-[#E6A800] ml-0.5 ${sizeClasses.text}`}>Voltx</span>
      </div>

      {showBadge && (
        <span
          className={`font-mono font-bold rounded-full bg-[#FFF9E6] border border-[#F5C518]/40 text-[#E6A800] tracking-wide uppercase ${sizeClasses.badge}`}
        >
          {showBadge}
        </span>
      )}
    </div>
  );
};
