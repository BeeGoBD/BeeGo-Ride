import React, { useState, useRef } from 'react';
import {
  Radio,
  Clock,
  QrCode,
  User,
  Bike,
  LayoutGrid,
} from 'lucide-react';
import { RideRequest } from '../types';
import { RiderDashboard } from './RiderDashboard';
import { RiderHistorySection } from './RiderHistorySection';
import { QrScannerSection } from './QrScannerSection';
import { RiderAccountSection } from './RiderAccountSection';

interface RiderAppShellProps {
  riderId: string;
  activeRide: RideRequest | null;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onBackToRoles: () => void;
  onSwitchToPassenger: () => void;
  onReplayIntro?: () => void;
}

type RiderTabType = 0 | 1 | 2 | 3;

export const RiderAppShell: React.FC<RiderAppShellProps> = ({
  riderId,
  activeRide,
  apiKey,
  onBackToRoles,
  onSwitchToPassenger,
  onReplayIntro,
}) => {
  const [activeTab, setActiveTab] = useState<RiderTabType>(0);

  // Swipe gesture tracking (when not dragging map)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.leaflet-container')) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0) {
        // Swiped Left -> Next tab
        setActiveTab((prev) => (prev < 3 ? ((prev + 1) as RiderTabType) : 3));
      } else {
        // Swiped Right -> Prev tab
        setActiveTab((prev) => (prev > 0 ? ((prev - 1) as RiderTabType) : 0));
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const hasIncomingRequest = activeRide && activeRide.status === 'requested';

  return (
    <div className="w-full h-full flex flex-col justify-between bg-black text-white overflow-hidden relative select-none">
      {/* 1. ANDROID APP COMPACT TOP APPBAR */}
      <header className="w-full h-12 bg-black/95 border-b border-zinc-900/90 px-3.5 flex items-center justify-between shrink-0 z-30">
        {/* Left: Brand & Captain Badge */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab(0)}
            className="flex items-center gap-1.5 cursor-pointer text-left"
          >
            <span className="text-xl font-black tracking-tight text-white">Beego</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50" />
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-600/50 text-[10px] font-bold text-amber-300">
              <Bike className="w-2.5 h-2.5" />
              <span>CAPTAIN</span>
            </span>
          </button>
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-1.5">
          {/* Switch to Passenger Mode */}
          <button
            type="button"
            onClick={onSwitchToPassenger}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-semibold text-zinc-300 hover:text-amber-400 transition-all cursor-pointer active:scale-95"
            title="Switch to Passenger Mode"
          >
            <User className="w-3 h-3 text-zinc-400" />
            <span>Passenger</span>
          </button>

          {/* Return to Portal / Dashboard Selector */}
          <button
            type="button"
            onClick={onBackToRoles}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer active:scale-95"
            title="Select Dashboard / Portal"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. ANDROID MAIN CONTENT AREA */}
      <main
        className="flex-1 w-full overflow-hidden relative flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* TAB 0: BOOKINGS / DISPATCH (All buttons and accept prompt visible without scroll!) */}
        {activeTab === 0 && (
          <div className="w-full h-full flex flex-col flex-1 overflow-hidden">
            <RiderDashboard
              riderId={riderId}
              activeRide={activeRide}
              apiKey={apiKey}
              onBackToRoles={onBackToRoles}
              onSwitchToPassenger={onSwitchToPassenger}
              hideHeader={true}
            />
          </div>
        )}

        {/* TAB 1: HISTORY */}
        {activeTab === 1 && (
          <div className="w-full flex-1 overflow-y-auto no-scrollbar">
            <RiderHistorySection />
          </div>
        )}

        {/* TAB 2: QR SCANNER */}
        {activeTab === 2 && (
          <div className="w-full flex-1 overflow-y-auto no-scrollbar">
            <QrScannerSection
              title="Captain Ride & Fare Scanner"
              subtitle="Scan Passenger QR Code"
              description="Scan passenger booking QR code to verify passenger identity at pickup or confirm cashless bKash/Nagad payments."
            />
          </div>
        )}

        {/* TAB 3: ACCOUNT */}
        {activeTab === 3 && (
          <div className="w-full flex-1 overflow-y-auto no-scrollbar">
            <RiderAccountSection
              riderId={riderId}
              onSwitchToPassenger={onSwitchToPassenger}
              onReplayIntro={onReplayIntro}
              onSignOut={onBackToRoles}
            />
          </div>
        )}
      </main>

      {/* 3. ANDROID NATIVE BOTTOM NAVIGATION BAR (Fixed at bottom of screen) */}
      <nav
        id="rider-bottom-navbar"
        className="w-full h-14 bg-zinc-950 border-t border-zinc-900/90 px-2 flex items-center justify-around shrink-0 z-30 select-none shadow-[0_-4px_16px_rgba(0,0,0,0.8)]"
      >
        {/* Tab 0: Bookings */}
        <button
          type="button"
          onClick={() => setActiveTab(0)}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 0 ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className="relative mb-0.5">
            <Radio className="w-5 h-5" />
            {hasIncomingRequest && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight">Bookings</span>
          {activeTab === 0 && (
            <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5 shadow-sm shadow-amber-400" />
          )}
        </button>

        {/* Tab 1: History */}
        <button
          type="button"
          onClick={() => setActiveTab(1)}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 1 ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Clock className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold tracking-tight">History</span>
          {activeTab === 1 && (
            <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5 shadow-sm shadow-amber-400" />
          )}
        </button>

        {/* Tab 2: QR Code */}
        <button
          type="button"
          onClick={() => setActiveTab(2)}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 2 ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <QrCode className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold tracking-tight">QR Code</span>
          {activeTab === 2 && (
            <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5 shadow-sm shadow-amber-400" />
          )}
        </button>

        {/* Tab 3: Account */}
        <button
          type="button"
          onClick={() => setActiveTab(3)}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 3 ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold tracking-tight">Account</span>
          {activeTab === 3 && (
            <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5 shadow-sm shadow-amber-400" />
          )}
        </button>
      </nav>
    </div>
  );
};
