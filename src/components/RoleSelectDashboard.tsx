import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  User,
  Bike,
  ShieldCheck,
  Radio,
  RotateCcw,
  ChevronsRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { UserRole } from '../types';
import { RATE_PER_KM_TAKA } from '../services/rideSync';

interface RoleSelectDashboardProps {
  onSelectRole: (role: UserRole) => void;
  onReplayIntro?: () => void;
}

interface ProfessionalSliderProps {
  id: string;
  role: UserRole;
  title: string;
  subtitle: string;
  slideLabel: string;
  variant: 'passenger' | 'captain';
  onConfirm: () => void;
}

const ProfessionalSlider: React.FC<ProfessionalSliderProps> = ({
  id,
  role,
  title,
  subtitle,
  slideLabel,
  variant,
  onConfirm,
}) => {
  const isPassenger = variant === 'passenger';
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxDragPx, setMaxDragPx] = useState(200);
  const [currentPx, setCurrentPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startThumbXRef = useRef(0);

  // Measure track width accurately
  useEffect(() => {
    const updateDimensions = () => {
      if (!trackRef.current) return;
      const trackWidth = trackRef.current.clientWidth;
      const thumbWidth = 60; // width of slider button thumb
      const padding = 10; // total horizontal padding
      const available = Math.max(80, trackWidth - thumbWidth - padding);
      setMaxDragPx(available);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const triggerConfirm = useCallback(() => {
    setIsUnlocked(true);
    setCurrentPx(maxDragPx);
    setTimeout(() => {
      onConfirm();
    }, 220);
  }, [maxDragPx, onConfirm]);

  const handlePointerDown = (clientX: number) => {
    if (isUnlocked) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    startXRef.current = clientX;
    startThumbXRef.current = currentPx;
  };

  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (!isDraggingRef.current || isUnlocked) return;
      const deltaX = clientX - startXRef.current;
      const nextX = Math.max(0, Math.min(maxDragPx, startThumbXRef.current + deltaX));
      setCurrentPx(nextX);

      // Trigger threshold: 75% of travel
      if (nextX >= maxDragPx * 0.75) {
        isDraggingRef.current = false;
        setIsDragging(false);
        triggerConfirm();
      }
    },
    [maxDragPx, isUnlocked, triggerConfirm]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current || isUnlocked) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    if (currentPx < maxDragPx * 0.75) {
      setCurrentPx(0); // Snap back to origin
    }
  }, [currentPx, maxDragPx, isUnlocked]);

  // Window listeners for mouse drag
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX);
    };
    const onMouseUp = () => {
      handlePointerUp();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Progress ratio 0 to 1
  const progressRatio = maxDragPx > 0 ? currentPx / maxDragPx : 0;

  return (
    <div
      className={`relative w-full rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 border ${
        isPassenger
          ? 'bg-zinc-950/90 border-zinc-800/90 hover:border-zinc-700 shadow-2xl shadow-black/80'
          : 'bg-zinc-950/90 border-zinc-800/90 hover:border-emerald-900/60 shadow-2xl shadow-black/80'
      }`}
    >
      {/* Top Status & Blinking Light */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          {/* Active Blinking Light Indicator */}
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isPassenger ? 'bg-white' : 'bg-emerald-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isPassenger ? 'bg-white shadow-sm shadow-white' : 'bg-emerald-400 shadow-sm shadow-emerald-400'
              }`}
            />
          </span>

          <span
            className={`text-xs font-bold uppercase tracking-wider font-mono ${
              isPassenger ? 'text-zinc-300' : 'text-emerald-400'
            }`}
          >
            {title}
          </span>
        </div>

        <span className="text-[11px] font-mono text-zinc-500">
          {isPassenger ? `৳${RATE_PER_KM_TAKA}/km` : 'Net 85%'}
        </span>
      </div>

      {/* Main Info */}
      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          {isPassenger ? 'Ride with Bigo' : 'Drive with Bigo'}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 leading-relaxed font-normal">
          {subtitle}
        </p>
      </div>

      {/* The Interactive Slider Track */}
      <div
        id={id}
        ref={trackRef}
        role="button"
        tabIndex={0}
        aria-label={slideLabel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerConfirm();
          }
        }}
        onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
        onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
        onTouchEnd={handlePointerUp}
        onMouseDown={(e) => handlePointerDown(e.clientX)}
        onClick={() => {
          if (!isUnlocked && currentPx === 0) {
            triggerConfirm();
          }
        }}
        className={`relative w-full h-17 rounded-2xl p-1.5 flex items-center select-none cursor-pointer overflow-hidden transition-colors ${
          isPassenger
            ? 'bg-zinc-900/90 border border-zinc-800'
            : 'bg-zinc-900/90 border border-zinc-800'
        }`}
      >
        {/* Dynamic Progress Fill Behind Thumb */}
        <div
          style={{
            width: `${Math.max(currentPx + 30, isUnlocked ? maxDragPx + 60 : 0)}px`,
          }}
          className={`absolute left-0 top-0 bottom-0 pointer-events-none transition-all ${
            isDragging ? 'duration-0' : 'duration-300'
          } ${
            isPassenger
              ? 'bg-gradient-to-r from-zinc-800 to-zinc-700/60'
              : 'bg-gradient-to-r from-emerald-950 to-emerald-800/50'
          }`}
        />

        {/* Center Prompt Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-14">
          <span
            className={`text-xs sm:text-sm font-bold tracking-wide uppercase transition-all duration-200 flex items-center gap-2 ${
              progressRatio > 0.35 ? 'opacity-20 translate-x-3' : 'opacity-85'
            } ${isPassenger ? 'text-zinc-300' : 'text-emerald-300'}`}
          >
            <span>{isUnlocked ? 'Connecting...' : slideLabel}</span>
            <ChevronsRight
              className={`w-4 h-4 animate-pulse ${
                isPassenger ? 'text-zinc-400' : 'text-emerald-400'
              }`}
            />
          </span>
        </div>

        {/* Draggable Slider Thumb */}
        <div
          style={{
            transform: `translateX(${currentPx}px)`,
          }}
          className={`relative z-10 w-14 h-14 rounded-xl flex items-center justify-center font-bold shadow-xl cursor-grab active:cursor-grabbing transition-transform ${
            isDragging ? 'duration-0' : 'duration-300 ease-out'
          } ${
            isPassenger
              ? 'bg-white text-black hover:bg-zinc-100 shadow-white/10'
              : 'bg-emerald-400 text-black hover:bg-emerald-300 shadow-emerald-400/20'
          }`}
        >
          {isPassenger ? (
            <User className="w-6 h-6 stroke-[2.2]" />
          ) : (
            <Bike className="w-6 h-6 stroke-[2.2]" />
          )}
        </div>

        {/* Right Arrow End Target */}
        <div
          className={`ml-auto pr-3.5 pointer-events-none transition-opacity duration-200 ${
            progressRatio > 0.5 ? 'opacity-0' : 'opacity-40'
          }`}
        >
          <ArrowRight
            className={`w-4 h-4 ${isPassenger ? 'text-zinc-400' : 'text-emerald-400'}`}
          />
        </div>
      </div>
    </div>
  );
};

export const RoleSelectDashboard: React.FC<RoleSelectDashboardProps> = ({
  onSelectRole,
  onReplayIntro,
}) => {
  return (
    <div
      id="role-select-dashboard"
      className="w-full h-screen h-dvh bg-black text-white flex flex-col justify-between overflow-hidden select-none"
    >
      {/* 1. MINIMAL PROFESSIONAL TOP BAR */}
      <header className="w-full border-b border-zinc-900/90 bg-black/80 backdrop-blur-md px-6 sm:px-10 py-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-white">Bigo</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/50" />
          </div>
          <span className="hidden sm:inline-block text-[11px] text-zinc-500 font-mono pl-2 border-l border-zinc-800">
            Dhaka Fleet Network
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-emerald-400">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>৳{RATE_PER_KM_TAKA}/km</span>
          </div>

          {onReplayIntro && (
            <button
              type="button"
              onClick={onReplayIntro}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Intro</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. ELEGANT CENTER HERO SECTION */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 flex flex-col justify-center items-center">
        {/* Crisp Header Title */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-400 mb-3.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Instant Guest Credentials • Zero Setup</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-2.5">
            Select Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto font-normal">
            Slide to unlock your dashboard and begin your trip.
          </p>
        </div>

        {/* TWO SLIDER CARDS: SIDE-BY-SIDE (ONE NEXT TO EACH OTHER) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-7 w-full max-w-3xl">
          {/* Slider 1: Passenger (Monochrome Platinum) */}
          <ProfessionalSlider
            id="continue-as-passenger-button"
            role="passenger"
            title="Passenger"
            subtitle="Search locations, request immediate pickup, and track ride progress."
            slideLabel="Slide for Passenger"
            variant="passenger"
            onConfirm={() => onSelectRole('passenger')}
          />

          {/* Slider 2: Captain (Vibrant Emerald) */}
          <ProfessionalSlider
            id="continue-as-rider-button"
            role="rider"
            title="Captain"
            subtitle="Accept live dispatch requests, navigate turn-by-turn, and collect fares."
            slideLabel="Slide for Captain"
            variant="captain"
            onConfirm={() => onSelectRole('rider')}
          />
        </div>
      </main>

      {/* 3. SUBTLE MINIMALIST FOOTER */}
      <footer className="w-full border-t border-zinc-900/90 py-3.5 px-6 sm:px-10 flex items-center justify-between text-[11px] font-mono text-zinc-600 shrink-0">
        <span>BIGO DISPATCH ENGINE</span>
        <span>SLIDE TO INITIATE</span>
      </footer>
    </div>
  );
};
