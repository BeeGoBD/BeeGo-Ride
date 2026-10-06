import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, Check, ChevronRight, Sparkles, ShieldCheck } from 'lucide-react';

interface SwipeActionSliderProps {
  label: string;
  onConfirm: () => void;
  icon?: React.ReactNode;
  stepNumber?: number;
  totalSteps?: number;
  themeColor?: 'amber' | 'emerald' | 'blue';
  allowTapFallback?: boolean;
}

export const SwipeActionSlider: React.FC<SwipeActionSliderProps> = ({
  label,
  onConfirm,
  icon,
  stepNumber,
  totalSteps = 3,
  themeColor = 'amber',
  allowTapFallback = true,
}) => {
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const isConfirmingRef = useRef<boolean>(false);
  const activePointerIdRef = useRef<number | null>(null);

  // Reset state when step or label changes (prevents carry-over between steps)
  useEffect(() => {
    setDragProgress(0);
    setIsDragging(false);
    setIsCompleted(false);
    isConfirmingRef.current = false;
    activePointerIdRef.current = null;
  }, [stepNumber, label]);

  // Compute accurate real-time max draggable distance
  const getMaxDrag = useCallback((): number => {
    if (!containerRef.current) return 200;
    const rect = containerRef.current.getBoundingClientRect();
    const handleWidth = 52;
    const padding = 8;
    return Math.max(10, rect.width - handleWidth - padding);
  }, []);

  const triggerConfirm = useCallback(() => {
    if (isConfirmingRef.current || isCompleted) return;
    isConfirmingRef.current = true;
    setIsDragging(false);
    setIsCompleted(true);
    setDragProgress(1);

    // Haptic feedback if supported
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 50, 40]);
      }
    } catch {}

    // Execute callback with smooth delay for animation to complete
    setTimeout(() => {
      onConfirm();
    }, 220);
  }, [isCompleted, onConfirm]);

  // Pointer Down (Mouse or Touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isCompleted || isConfirmingRef.current) return;

    // Capture the pointer
    activePointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    setIsDragging(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isCompleted || isConfirmingRef.current) return;
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;

    const delta = e.clientX - startXRef.current;
    const maxDrag = getMaxDrag();
    const clampedDelta = Math.max(0, Math.min(delta, maxDrag));
    const progress = Math.max(0, Math.min(1, clampedDelta / maxDrag));

    setDragProgress(progress);

    // If driver slides fully to the end (>= 94%), trigger completion
    if (progress >= 0.94) {
      triggerConfirm();
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isCompleted || isConfirmingRef.current) return;
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;

    setIsDragging(false);
    activePointerIdRef.current = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    // If released past 88%, consider it a successful confirmation
    if (dragProgress >= 0.88) {
      triggerConfirm();
    } else {
      // Smooth snapback to 0 with spring animation
      setDragProgress(0);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isConfirmingRef.current || isCompleted) return;
    setIsDragging(false);
    activePointerIdRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setDragProgress(0);
  };

  // Quick 1-tap fallback for tricky touchscreen environments
  const handleDirectTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerConfirm();
  };

  const maxDrag = getMaxDrag();
  const handleOffsetPx = dragProgress * maxDrag;
  const isNearEnd = dragProgress >= 0.85;

  return (
    <div className="w-full flex flex-col gap-1.5 select-none touch-none">
      {/* Step Indicator Header if steps are provided */}
      {stepNumber && (
        <div className="flex items-center justify-between text-[11px] px-1 font-bold">
          <span className="text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-[#F5C518] animate-pulse" />
            Step {stepNumber} of {totalSteps}
          </span>
          <span className="text-[#E6A800] font-mono text-[11px]">
            {stepNumber === 1 && 'Arrive at Pickup'}
            {stepNumber === 2 && 'Start Journey'}
            {stepNumber === 3 && 'Complete Ride'}
          </span>
        </div>
      )}

      {/* Main Track Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`relative w-full h-[60px] rounded-2xl bg-[#121214] border-2 overflow-hidden flex items-center p-1 shadow-xl cursor-grab active:cursor-grabbing transition-colors duration-200 select-none ${
          isCompleted || isNearEnd
            ? 'border-emerald-500 shadow-emerald-500/25 ring-2 ring-emerald-500/20'
            : 'border-[#F5C518]/70 shadow-amber-500/10'
        }`}
        style={{ touchAction: 'none' }}
      >
        {/* Dynamic Progress Fill Track */}
        <div
          style={{
            width: `${handleOffsetPx + 54}px`,
            transition: isDragging ? 'none' : 'width 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          className={`absolute left-0 top-0 bottom-0 pointer-events-none transition-colors ${
            isCompleted || isNearEnd
              ? 'bg-gradient-to-r from-emerald-600/40 via-emerald-500/50 to-emerald-400/70'
              : 'bg-gradient-to-r from-[#F5C518]/20 via-[#F5C518]/35 to-[#F5C518]/50'
          }`}
        />

        {/* Shimmer Track Arrows (Fade out as user drags) */}
        <div
          style={{ opacity: Math.max(0, 1 - dragProgress * 2) }}
          className="absolute right-4 top-0 bottom-0 flex items-center gap-0.5 text-zinc-500 pointer-events-none transition-opacity duration-150"
        >
          <ChevronRight className="w-4 h-4 animate-pulse" />
          <ChevronRight className="w-4 h-4 animate-pulse delay-75" />
          <ChevronRight className="w-4 h-4 animate-pulse delay-150" />
        </div>

        {/* Center Label Text */}
        <div className="w-full text-center text-[12px] sm:text-[13px] font-black uppercase tracking-wider pointer-events-none z-10 px-14 flex items-center justify-center gap-1.5 transition-opacity duration-150">
          <span
            className={`${
              isCompleted
                ? 'text-emerald-400 font-extrabold flex items-center gap-1.5'
                : isNearEnd
                ? 'text-emerald-300 font-extrabold'
                : 'text-zinc-100'
            }`}
          >
            {isCompleted ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Confirmed</span>
              </>
            ) : isNearEnd ? (
              'Release to Confirm'
            ) : (
              label
            )}
          </span>
        </div>

        {/* Draggable Knob Handle */}
        <div
          style={{
            transform: `translateX(${handleOffsetPx}px)`,
            transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          className={`absolute left-1 w-[50px] h-[50px] rounded-xl flex items-center justify-center z-20 shadow-xl cursor-pointer transition-all duration-150 active:scale-95 ${
            isCompleted || isNearEnd
              ? 'bg-emerald-400 text-black shadow-emerald-400/50 scale-105 ring-2 ring-white/50'
              : 'bg-[#F5C518] text-black shadow-amber-400/40 ring-1 ring-white/40'
          }`}
        >
          {isCompleted ? (
            <Check className="w-6 h-6 stroke-[3.2] text-black animate-in zoom-in" />
          ) : (
            icon || <ArrowRight className="w-6 h-6 stroke-[3]" />
          )}
        </div>
      </div>

      {/* 1-Tap Fallback Option for Drivers */}
      {allowTapFallback && !isCompleted && (
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={handleDirectTap}
            className="text-[11px] font-bold text-zinc-400 hover:text-amber-500 transition-colors flex items-center gap-1 cursor-pointer py-0.5 active:scale-95"
          >
            <Sparkles className="w-3 h-3 text-[#F5C518]" />
            <span>Tap here to confirm directly</span>
          </button>
          <span className="text-[10px] text-zinc-400 font-mono font-bold">
            {Math.round(dragProgress * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};
