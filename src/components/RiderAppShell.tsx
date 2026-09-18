import React, { useState, useRef } from 'react';
import {
  Radio,
  Clock,
  QrCode,
  User,
  Bike,
  Smartphone,
  Monitor,
  X,
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
  onApiKeyChange,
  onBackToRoles,
  onSwitchToPassenger,
  onReplayIntro,
}) => {
  const [activeTab, setActiveTab] = useState<RiderTabType>(0);

  // Swipe gesture tracking (when not dragging map)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    // If target is inside the leaflet map, do not hijack swipe
    if ((e.target as HTMLElement).closest('.leaflet-container')) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    // Horizontal swipe threshold
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
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-start overflow-x-hidden selection:bg-zinc-800">
      <div className="w-full max-w-6xl flex flex-col">
        {/* FIXED APP HEADER */}
        <header className="sticky top-0 z-30 w-full bg-black/90 backdrop-blur-xl border-b border-zinc-900 px-4 sm:px-6 py-3 flex items-center justify-between select-none">
          {/* Left: Brand & Captain Badge */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab(0)}
              className="flex items-center gap-2.5 cursor-pointer text-left group"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-zinc-200 transition-colors">
                  Bigo
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/60 text-[11px] font-bold text-emerald-400">
                <Bike className="w-3 h-3" />
                <span>Captain</span>
              </span>
            </button>
          </div>

          {/* Center: Clean Status Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/60 border border-zinc-800/80 text-xs font-mono text-zinc-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-emerald-400 font-semibold">Live Radar</span>
            <span className="text-zinc-600">•</span>
            <span>৳70/km Dispatch</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Switch to Passenger Mode */}
            <button
              type="button"
              onClick={onSwitchToPassenger}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95"
              title="Switch to Passenger Mode"
            >
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Passenger</span>
            </button>

            {/* Return to Portal / Dashboard Selector */}
            <button
              type="button"
              onClick={onBackToRoles}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white transition-all cursor-pointer active:scale-95"
              title="Select Dashboard / Portal"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        <main
          className="flex-1 w-full pb-20 overflow-y-auto no-scrollbar"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* TAB 0: BOOKING SECTION (Where he will accept the ride and everything) */}
          {activeTab === 0 && (
            <div className="w-full h-full min-h-[620px] flex flex-col animate-in fade-in duration-200">
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

          {/* TAB 1: HISTORY (Where rider can see his trips, earnings, ratings) */}
          {activeTab === 1 && (
            <div className="animate-in fade-in duration-200">
              <RiderHistorySection />
            </div>
          )}

          {/* TAB 2: QR CODE (Rider-only QR Scanner to verify rides or contactless fares) */}
          {activeTab === 2 && (
            <div className="animate-in fade-in duration-200">
              <QrScannerSection
                title="Captain Ride & Fare Scanner"
                subtitle="Scan Passenger Ride QR"
                description="Scan passenger booking QR code to verify passenger identity at pickup or confirm cashless bKash/Nagad trip payments."
              />
            </div>
          )}

          {/* TAB 3: ACCOUNT (Captain Profile, Vehicle specs, Wallet Cashout, Emergency 999) */}
          {activeTab === 3 && (
            <div className="animate-in fade-in duration-200">
              <RiderAccountSection
                riderId={riderId}
                onSwitchToPassenger={onSwitchToPassenger}
                onReplayIntro={onReplayIntro}
                onSignOut={onBackToRoles}
              />
            </div>
          )}
        </main>

        {/* FIXED BOTTOM NAVIGATION BAR - EXACTLY 4 OPTIONS FOR RIDER */}
        <nav
          id="rider-bottom-navbar"
          className="fixed bottom-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-3 py-2 flex items-center justify-around select-none shadow-[0_-10px_25px_rgba(0,0,0,0.7)] w-full max-w-6xl"
        >
          {/* Tab 0: Bookings / Dispatch */}
          <button
            type="button"
            onClick={() => setActiveTab(0)}
            className={`flex-1 flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 0
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-colors relative ${
                activeTab === 0 ? 'text-emerald-400' : ''
              }`}
            >
              <Radio className="w-5 h-5" />
              {hasIncomingRequest && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-tight">Bookings</span>
            {activeTab === 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 -mt-0.5" />
            )}
          </button>

          {/* Tab 1: History */}
          <button
            type="button"
            onClick={() => setActiveTab(1)}
            className={`flex-1 flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 1
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-colors ${
                activeTab === 1 ? 'text-emerald-400' : ''
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-tight">History</span>
            {activeTab === 1 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 -mt-0.5" />
            )}
          </button>

          {/* Tab 2: QR Code */}
          <button
            type="button"
            onClick={() => setActiveTab(2)}
            className={`flex-1 flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 2
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-colors ${
                activeTab === 2 ? 'text-emerald-400' : ''
              }`}
            >
              <QrCode className="w-5 h-5" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-tight">QR Code</span>
            {activeTab === 2 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 -mt-0.5" />
            )}
          </button>

          {/* Tab 3: Account */}
          <button
            type="button"
            onClick={() => setActiveTab(3)}
            className={`flex-1 flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 3
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-colors ${
                activeTab === 3 ? 'text-emerald-400' : ''
              }`}
            >
              <User className="w-5 h-5" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-tight">Account</span>
            {activeTab === 3 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 -mt-0.5" />
            )}
          </button>
        </nav>
      </div>
    </div>
  );
};
