import React, { useState, useRef } from 'react';
import {
  Compass,
  Clock,
  User,
  Bike,
  ArrowLeft,
  LayoutGrid,
} from 'lucide-react';
import { LocationPoint, RouteData, RideRequest } from '../types';
import { PassengerProfile } from '../services/passengerAuth';
import { PassengerHomeDashboard } from './PassengerHomeDashboard';
import { RideHistorySection } from './RideHistorySection';
import { PassengerAccountSection } from './PassengerAccountSection';
import { RideRequestForm } from './RideRequestForm';

interface PassengerAppShellProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  passengerId: string;
  passengerProfile?: PassengerProfile | null;
  pickup: LocationPoint | null;
  setPickup: (point: LocationPoint | null) => void;
  dropoff: LocationPoint | null;
  setDropoff: (point: LocationPoint | null) => void;
  routeData?: RouteData | null;
  onRequestRide: () => void;
  isLoadingRoute: boolean;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  activeRide: RideRequest | null;
  onCancelRide: () => void;
  onResetRide: () => void;
  onBackToRoles: () => void;
  onSwitchToRider: () => void;
  onReplayIntro?: () => void;
}

type TabType = 0 | 1 | 2;

export const PassengerAppShell: React.FC<PassengerAppShellProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabType>(0);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Touch swipe gesture tracking between Android tabs
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0) {
        // Swiped Left -> Move to Next Tab
        setActiveTab((prev) => (prev < 2 ? ((prev + 1) as TabType) : 2));
      } else {
        // Swiped Right -> Move to Prev Tab
        setActiveTab((prev) => (prev > 0 ? ((prev - 1) as TabType) : 0));
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleOpenBooking = (suggestedDestination?: string) => {
    if (suggestedDestination) {
      props.setDropoff({
        lat: 23.7925,
        lon: 90.4078,
        formatted: suggestedDestination,
      });
    }
    setIsBookingOpen(true);
  };

  const handleCloseBooking = () => {
    setIsBookingOpen(false);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between bg-black text-white overflow-hidden relative select-none">
      {/* 1. ANDROID APP COMPACT TOP APPBAR */}
      <header className="w-full h-12 bg-black/95 border-b border-zinc-900/90 px-3.5 flex items-center justify-between shrink-0 z-30">
        {/* Left: Brand or Back to Home */}
        <div className="flex items-center gap-2">
          {isBookingOpen ? (
            <button
              type="button"
              onClick={handleCloseBooking}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer border border-zinc-800 text-xs font-semibold active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab(0)}
              className="flex items-center gap-1.5 cursor-pointer text-left"
            >
              <span className="text-xl font-black tracking-tight text-white">Beego</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50" />
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300">
                PASSENGER
              </span>
            </button>
          )}
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-1.5">
          {/* Switch to Captain Mode */}
          <button
            type="button"
            onClick={props.onSwitchToRider}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-950/60 border border-amber-500/40 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-all cursor-pointer active:scale-95"
            title="Switch to Captain Mode"
          >
            <Bike className="w-3 h-3 text-amber-400" />
            <span>Captain</span>
          </button>

          {/* Return to Portal / Dashboard Selector */}
          <button
            type="button"
            onClick={props.onBackToRoles}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer active:scale-95"
            title="Role Selector"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. ANDROID SCROLLABLE MAIN CONTENT AREA */}
      <main
        className="flex-1 w-full overflow-y-auto no-scrollbar relative flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isBookingOpen ? (
          /* Full Ride Request Experience */
          <div className="w-full flex-1 flex flex-col">
            <RideRequestForm
              {...props}
              onBackToRoles={() => setIsBookingOpen(false)}
            />
          </div>
        ) : (
          /* 3 Swipeable Android Tabs */
          <div className="w-full flex-1 flex flex-col">
            {/* TAB 0: DASHBOARD / BOOKINGS (Zero Scroll for all buttons!) */}
            {activeTab === 0 && (
              <PassengerHomeDashboard
                onTakeRide={handleOpenBooking}
                userLiveAddress={props.pickup?.formatted}
              />
            )}

            {/* TAB 1: HISTORY */}
            {activeTab === 1 && (
              <div className="w-full flex-1 overflow-y-auto no-scrollbar">
                <RideHistorySection
                  onBookAgain={(pickupStr, dropoffStr) => {
                    props.setDropoff({
                      lat: 23.7925,
                      lon: 90.4078,
                      formatted: dropoffStr,
                    });
                    setIsBookingOpen(true);
                  }}
                />
              </div>
            )}

            {/* TAB 2: ACCOUNT */}
            {activeTab === 2 && (
              <div className="w-full flex-1 overflow-y-auto no-scrollbar">
                <PassengerAccountSection
                  passengerId={props.passengerId}
                  passengerProfile={props.passengerProfile}
                  onSwitchToRider={props.onSwitchToRider}
                  onReplayIntro={props.onReplayIntro}
                  onSignOut={props.onBackToRoles}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. ANDROID NATIVE BOTTOM NAVIGATION BAR (Fixed at bottom of screen) */}
      {!isBookingOpen && (
        <nav
          id="fixed-bottom-navbar"
          className="w-full h-14 bg-zinc-950 border-t border-zinc-900/90 px-3 flex items-center justify-around shrink-0 z-30 select-none shadow-[0_-4px_16px_rgba(0,0,0,0.8)]"
        >
          {/* Tab 0: Dashboard */}
          <button
            type="button"
            onClick={() => setActiveTab(0)}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 0 ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Compass className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold tracking-tight">Dashboard</span>
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

          {/* Tab 2: Account */}
          <button
            type="button"
            onClick={() => setActiveTab(2)}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 2 ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold tracking-tight">Account</span>
            {activeTab === 2 && (
              <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5 shadow-sm shadow-amber-400" />
            )}
          </button>
        </nav>
      )}
    </div>
  );
};
