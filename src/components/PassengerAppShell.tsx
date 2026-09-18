import React, { useState, useRef } from 'react';
import {
  Compass,
  Clock,
  User,
  Bike,
  Smartphone,
  Monitor,
  X,
  ArrowLeft,
  LayoutGrid,
} from 'lucide-react';
import { LocationPoint, RouteData, RideRequest } from '../types';
import { PassengerHomeDashboard } from './PassengerHomeDashboard';
import { RideHistorySection } from './RideHistorySection';
import { PassengerAccountSection } from './PassengerAccountSection';
import { RideRequestForm } from './RideRequestForm';

interface PassengerAppShellProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  passengerId: string;
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

  // Touch swipe gesture tracking
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

    // Only trigger if horizontal swipe is significantly greater than vertical scroll
    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0) {
        // Swiped Left -> Move to Next Tab (max index 2)
        setActiveTab((prev) => (prev < 2 ? ((prev + 1) as TabType) : 2));
      } else {
        // Swiped Right -> Move to Previous Tab (min index 0)
        setActiveTab((prev) => (prev > 0 ? ((prev - 1) as TabType) : 0));
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // When user clicks "Take Your Ride" or selects a saved place
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
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-start overflow-x-hidden selection:bg-zinc-800">
      <div className="w-full max-w-6xl flex flex-col">
        {/* FIXED APP HEADER */}
        <header className="sticky top-0 z-30 w-full bg-black/90 backdrop-blur-xl border-b border-zinc-900 px-4 sm:px-6 py-3 flex items-center justify-between select-none">
          {/* Left: Brand & Mode Tag */}
          <div className="flex items-center gap-2.5">
            {isBookingOpen ? (
              <button
                type="button"
                onClick={handleCloseBooking}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer border border-zinc-800 text-xs font-semibold active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Home</span>
              </button>
            ) : (
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
                <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-400">
                  Passenger
                </span>
              </button>
            )}
          </div>

          {/* Center: Clean Status Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/60 border border-zinc-800/80 text-xs font-mono text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-zinc-300">Dhaka Metro</span>
            <span className="text-zinc-600">•</span>
            <span>৳70/km</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Switch to Rider / Captain Mode */}
            <button
              type="button"
              onClick={props.onSwitchToRider}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer active:scale-95"
              title="Switch to Captain Mode"
            >
              <Bike className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Captain Mode</span>
            </button>

            {/* Return to Portal / Dashboard Selector */}
            <button
              type="button"
              onClick={props.onBackToRoles}
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
          {isBookingOpen ? (
            /* FULL RIDE REQUEST EXPERIENCE */
            <div className="w-full py-2">
              <RideRequestForm
                {...props}
                onBackToRoles={() => setIsBookingOpen(false)}
              />
            </div>
          ) : (
            /* 3 SWIPEABLE APP TABS FOR PASSENGER */
            <>
              {/* TAB 0: DASHBOARD / BOOKINGS */}
              {activeTab === 0 && (
                <div className="animate-in fade-in duration-200">
                  <PassengerHomeDashboard
                    onTakeRide={handleOpenBooking}
                    userLiveAddress={props.pickup?.formatted}
                  />
                </div>
              )}

              {/* TAB 1: HISTORY */}
              {activeTab === 1 && (
                <div className="animate-in fade-in duration-200">
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
                <div className="animate-in fade-in duration-200">
                  <PassengerAccountSection
                    passengerId={props.passengerId}
                    onSwitchToRider={props.onSwitchToRider}
                    onReplayIntro={props.onReplayIntro}
                    onSignOut={props.onBackToRoles}
                  />
                </div>
              )}
            </>
          )}
        </main>

        {/* FIXED BOTTOM NAVIGATION BAR - EXACTLY 3 OPTIONS */}
        {!isBookingOpen && (
          <nav
            id="fixed-bottom-navbar"
            className="fixed bottom-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-4 py-2 flex items-center justify-around select-none shadow-[0_-10px_25px_rgba(0,0,0,0.7)] w-full max-w-6xl"
          >
            {/* Tab 0: Dashboard (used for bookings) */}
            <button
              type="button"
              onClick={() => setActiveTab(0)}
              className={`flex-1 flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 0
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  activeTab === 0 ? 'text-emerald-400' : ''
                }`}
              >
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold tracking-tight">Dashboard</span>
              {activeTab === 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 -mt-0.5" />
              )}
            </button>

            {/* Tab 1: History */}
            <button
              type="button"
              onClick={() => setActiveTab(1)}
              className={`flex-1 flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
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
              <span className="text-[11px] font-bold tracking-tight">History</span>
              {activeTab === 1 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 -mt-0.5" />
              )}
            </button>

            {/* Tab 2: Account */}
            <button
              type="button"
              onClick={() => setActiveTab(2)}
              className={`flex-1 flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
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
                <User className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold tracking-tight">Account</span>
              {activeTab === 2 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 -mt-0.5" />
              )}
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};
