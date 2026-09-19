import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  User,
  Bike,
  ShieldCheck,
  Radio,
  RotateCcw,
  ChevronsRight,
  ArrowRight,
  LogIn,
  UserPlus,
  Lock,
} from 'lucide-react';
import { UserRole } from '../types';
import { RATE_PER_KM_TAKA } from '../services/rideSync';

interface RoleSelectDashboardProps {
  onSelectRole: (role: UserRole) => void;
  onOpenPassengerAuth?: (mode: 'signup' | 'login') => void;
  onReplayIntro?: () => void;
}

interface AndroidSliderCardProps {
  id: string;
  role: UserRole;
  title: string;
  subtitle: string;
  slideLabel: string;
  variant: 'passenger' | 'captain';
  onConfirm: () => void;
}

const AndroidSliderCard: React.FC<AndroidSliderCardProps> = ({
  id,
  title,
  subtitle,
  slideLabel,
  variant,
  onConfirm,
}) => {
  const isPassenger = variant === 'passenger';
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxDragPx, setMaxDragPx] = useState(140);
  const [currentPx, setCurrentPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startThumbXRef = useRef(0);

  useEffect(() => {
    const updateDimensions = () => {
      if (!trackRef.current) return;
      const trackWidth = trackRef.current.clientWidth;
      const thumbWidth = 46;
      const padding = 8;
      const available = Math.max(60, trackWidth - thumbWidth - padding);
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
    }, 180);
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

      if (nextX >= maxDragPx * 0.72) {
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

    if (currentPx >= maxDragPx * 0.72) {
      triggerConfirm();
    } else {
      setCurrentPx(0);
    }
  }, [currentPx, maxDragPx, isUnlocked, triggerConfirm]);

  useEffect(() => {
    const onWindowPointerMove = (e: MouseEvent) => {
      if (isDraggingRef.current) handlePointerMove(e.clientX);
    };
    const onWindowPointerUp = () => {
      if (isDraggingRef.current) handlePointerUp();
    };

    window.addEventListener('mousemove', onWindowPointerMove);
    window.addEventListener('mouseup', onWindowPointerUp);
    return () => {
      window.removeEventListener('mousemove', onWindowPointerMove);
      window.removeEventListener('mouseup', onWindowPointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const progressRatio = maxDragPx > 0 ? Math.min(1, currentPx / maxDragPx) : 0;

  return (
    <div
      className={`w-full rounded-2xl p-3 sm:p-3.5 transition-all duration-200 border flex flex-col justify-between ${
        isPassenger
          ? 'bg-zinc-950/90 border-zinc-800/90 hover:border-zinc-700 shadow-md'
          : 'bg-zinc-950/90 border-amber-500/50 hover:border-amber-400 shadow-md shadow-amber-950/30'
      }`}
    >
      {/* Top Details & Direct 1-Tap Enter Button for Android */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              isPassenger
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                : 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
            }`}
          >
            {isPassenger ? (
              <User className="w-5 h-5 stroke-[2.2]" />
            ) : (
              <Bike className="w-5 h-5 stroke-[2.2]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-white tracking-tight">{title}</span>
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  isPassenger
                    ? 'bg-zinc-800 text-zinc-300'
                    : 'bg-amber-400 text-black font-black'
                }`}
              >
                {isPassenger ? 'GUEST' : 'FLEET'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate max-w-[200px]">{subtitle}</p>
          </div>
        </div>

        {/* 1-Tap Quick Action Button */}
        <button
          id={id}
          type="button"
          onClick={onConfirm}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-all ${
            isPassenger
              ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
              : 'bg-amber-400 hover:bg-amber-300 text-black shadow-sm'
          }`}
        >
          <span>Enter</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Swipe to Unlock Slider Track */}
      <div
        ref={trackRef}
        onMouseDown={(e) => handlePointerDown(e.clientX)}
        onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
        onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
        onTouchEnd={handlePointerUp}
        className={`relative w-full h-11 rounded-xl p-1 flex items-center select-none overflow-hidden cursor-pointer ${
          isPassenger
            ? 'bg-zinc-900 border border-zinc-800'
            : 'bg-amber-950/30 border border-amber-500/40'
        }`}
      >
        {/* Dynamic Progress Fill Behind Thumb */}
        <div
          style={{
            width: `${Math.max(currentPx + 24, isUnlocked ? maxDragPx + 48 : 0)}px`,
          }}
          className={`absolute left-0 top-0 bottom-0 pointer-events-none transition-all ${
            isDragging ? 'duration-0' : 'duration-200'
          } ${
            isPassenger
              ? 'bg-gradient-to-r from-zinc-800 to-zinc-700'
              : 'bg-gradient-to-r from-amber-950 to-amber-700/60'
          }`}
        />

        {/* Center Prompt Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-8">
          <span
            className={`text-[11px] font-bold tracking-wide uppercase transition-all duration-150 flex items-center gap-1.5 ${
              progressRatio > 0.35 ? 'opacity-20 translate-x-2' : 'opacity-80'
            } ${isPassenger ? 'text-zinc-300' : 'text-amber-300'}`}
          >
            <span>{isUnlocked ? 'Opening...' : slideLabel}</span>
            <ChevronsRight className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          </span>
        </div>

        {/* Draggable Slider Thumb */}
        <div
          style={{
            transform: `translateX(${currentPx}px)`,
          }}
          className={`relative z-10 w-9 h-9 rounded-lg flex items-center justify-center font-bold shadow-md cursor-grab active:cursor-grabbing transition-transform ${
            isDragging ? 'duration-0' : 'duration-200 ease-out'
          } ${
            isPassenger
              ? 'bg-white text-black hover:bg-zinc-100'
              : 'bg-amber-400 text-black hover:bg-amber-300 shadow-amber-400/30'
          }`}
        >
          {isPassenger ? (
            <User className="w-4 h-4 stroke-[2.4]" />
          ) : (
            <Bike className="w-4 h-4 stroke-[2.4]" />
          )}
        </div>
      </div>
    </div>
  );
};

export const RoleSelectDashboard: React.FC<RoleSelectDashboardProps> = ({
  onSelectRole,
  onOpenPassengerAuth,
  onReplayIntro,
}) => {
  return (
    <div
      id="role-select-dashboard"
      className="w-full h-full flex flex-col justify-between bg-black text-white overflow-hidden select-none bg-bee-honeycomb"
    >
      {/* 1. TOP APP BAR */}
      <header className="w-full h-12 border-b border-zinc-900 bg-black/95 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-white">Beego</span>
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50" />
          <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/30">
            Dhaka
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/40 border border-amber-500/30 text-[11px] font-mono text-amber-300">
            <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>৳{RATE_PER_KM_TAKA}/km</span>
          </div>

          {onReplayIntro && (
            <button
              type="button"
              onClick={onReplayIntro}
              className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 border border-zinc-800 cursor-pointer"
              title="Replay Intro Splash"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* 2. CENTER CONTENT (Sized for fluid Mobile View) */}
      <main className="flex-1 w-full px-4 py-4 flex flex-col justify-center items-center gap-5 max-w-sm mx-auto">
        {/* Clean Header */}
        <div className="text-center flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Choose your role
          </h1>
          <p className="text-xs text-zinc-400">
            Select how you would like to use Beego
          </p>
        </div>

        {/* Roles Container */}
        <div className="w-full flex flex-col gap-3">
          {/* ================= PASSENGER CARD ================= */}
          <div className="w-full rounded-2xl p-4 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 shadow-xl flex flex-col gap-3 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center font-bold shrink-0 shadow-md shadow-amber-400/20">
                <User className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white tracking-tight">Passenger</h2>
                <p className="text-xs text-zinc-400">
                  Request fast motorcycle rides across Dhaka
                </p>
              </div>
            </div>

            {/* Passenger Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                id="passenger-signup-button"
                type="button"
                onClick={() => {
                  if (onOpenPassengerAuth) {
                    onOpenPassengerAuth('signup');
                  } else {
                    onSelectRole('passenger');
                  }
                }}
                className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-400/10 cursor-pointer active:scale-95"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Sign Up</span>
              </button>

              <button
                id="passenger-login-button"
                type="button"
                onClick={() => {
                  if (onOpenPassengerAuth) {
                    onOpenPassengerAuth('login');
                  } else {
                    onSelectRole('passenger');
                  }
                }}
                className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-200 hover:text-white border border-zinc-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>Sign In</span>
              </button>
            </div>
          </div>

          {/* ================= CAPTAIN CARD ================= */}
          <div className="w-full rounded-2xl p-4 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 shadow-xl flex flex-col gap-3 transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 text-zinc-200 border border-zinc-800 flex items-center justify-center font-bold shrink-0">
                  <Bike className="w-5 h-5 stroke-[2.2] text-amber-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-white tracking-tight">Captain</h2>
                  <p className="text-xs text-zinc-400">
                    Accept ride requests & earn on your bike
                  </p>
                </div>
              </div>

              {/* Captain Direct Enter */}
              <button
                id="continue-as-rider-button"
                type="button"
                onClick={() => onSelectRole('rider')}
                className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 bg-zinc-900 hover:bg-zinc-850 text-amber-400 border border-zinc-800 hover:border-amber-400/40 cursor-pointer active:scale-95 transition-all"
              >
                <span>Captain Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 3. FOOTER STRIP */}
      <footer className="w-full h-10 border-t border-zinc-900 px-4 flex items-center justify-between text-xs font-medium text-zinc-500 shrink-0">
        <span className="text-amber-500/80">BEEGO • DHAKA MOTO</span>
        <span>24/7 Service</span>
      </footer>
    </div>
  );
};

