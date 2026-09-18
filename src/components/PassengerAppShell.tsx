import React, { useState, useRef } from 'react';
import {
  Compass,
  Clock,
  QrCode,
  User,
  Bike,
  Smartphone,
  Monitor,
  X,
  ArrowLeft,
  Key,
} from 'lucide-react';
import { LocationPoint, RouteData, RideRequest } from '../types';
import { PassengerHomeDashboard } from './PassengerHomeDashboard';
import { RideHistorySection } from './RideHistorySection';
import { QrScannerSection } from './QrScannerSection';
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

type TabType = 0 | 1 | 2 | 3;

export const PassengerAppShell: React.FC<PassengerAppShellProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabType>(0);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [deviceFrameMode, setDeviceFrameMode] = useState<'responsive' | 'phone'>('responsive');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(props.apiKey);

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
        // Swiped Left -> Move to Next Tab
        setActiveTab((prev) => (prev < 3 ? ((prev + 1) as TabType) : 3));
      } else {
        // Swiped Right -> Move to Previous Tab
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
      {/* LAPTOP / DESKTOP RESPONSIVE CONTAINER */}
      <div
        className={`w-full flex flex-col transition-all duration-300 ${
          deviceFrameMode === 'phone'
            ? 'max-w-[430px] my-4 sm:my-8 rounded-[40px] border-4 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden bg-black min-h-[92dvh]'
            : 'max-w-5xl'
        }`}
      >
        {/* FIXED APP HEADER */}
        <header className="sticky top-0 z-30 w-full bg-black/95 backdrop-blur-md border-b border-zinc-900/80 px-4 py-3 flex items-center justify-between select-none">
          {/* Brand */}
          <div className="flex items-center gap-2">
            {isBookingOpen ? (
              <button
                type="button"
                onClick={handleCloseBooking}
                className="p-1.5 -ml-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div
                onClick={() => setActiveTab(0)}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <span className="text-2xl font-black tracking-tighter text-white">Bigo</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            )}
          </div>

          {/* Center Info on desktop */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Dhaka Metro • ৳70/km Flat</span>
          </div>

          {/* Right actions: View mode toggle & Switch to Rider */}
          <div className="flex items-center gap-2">
            {/* Desktop / Laptop Phone Frame Toggle */}
            <button
              type="button"
              onClick={() =>
                setDeviceFrameMode(deviceFrameMode === 'responsive' ? 'phone' : 'responsive')
              }
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs transition-colors cursor-pointer border border-zinc-800"
              title={
                deviceFrameMode === 'responsive'
                  ? 'Switch to Mobile Phone Shell view'
                  : 'Switch to Full Width Laptop/PC view'
              }
            >
              {deviceFrameMode === 'responsive' ? (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Phone Frame</span>
                </>
              ) : (
                <>
                  <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Desktop View</span>
                </>
              )}
            </button>

            {/* Switch to Rider Button */}
            <button
              type="button"
              onClick={props.onSwitchToRider}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Switch to Captain/Rider Mode"
            >
              <Bike className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rider Mode</span>
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
            /* 4 SWIPEABLE APP TABS */
            <>
              {/* TAB 0: HOME / DASHBOARD */}
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

              {/* TAB 2: QR CODE SCANNER (FROZEN) */}
              {activeTab === 2 && (
                <div className="animate-in fade-in duration-200">
                  <QrScannerSection />
                </div>
              )}

              {/* TAB 3: ACCOUNT */}
              {activeTab === 3 && (
                <div className="animate-in fade-in duration-200">
                  <PassengerAccountSection
                    passengerId={props.passengerId}
                    onSwitchToRider={props.onSwitchToRider}
                    onReplayIntro={props.onReplayIntro}
                    onOpenApiKeyModal={() => setShowApiKeyModal(true)}
                  />
                </div>
              )}
            </>
          )}
        </main>

        {/* FIXED BOTTOM NAVIGATION BAR */}
        {!isBookingOpen && (
          <nav
            id="fixed-bottom-navbar"
            className={`fixed bottom-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-3 py-2 flex items-center justify-around select-none shadow-[0_-10px_25px_rgba(0,0,0,0.7)] ${
              deviceFrameMode === 'phone'
                ? 'w-full max-w-[422px]'
                : 'w-full max-w-5xl'
            }`}
          >
            {/* Tab 0: Home / Dashboard */}
            <button
              type="button"
              onClick={() => setActiveTab(0)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
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
              <span className="text-[10px] font-bold tracking-tight">Home</span>
              {activeTab === 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 -mt-0.5" />
              )}
            </button>

            {/* Tab 1: History */}
            <button
              type="button"
              onClick={() => setActiveTab(1)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
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
              <span className="text-[10px] font-bold tracking-tight">History</span>
              {activeTab === 1 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 -mt-0.5" />
              )}
            </button>

            {/* Tab 2: QR Scanner */}
            <button
              type="button"
              onClick={() => setActiveTab(2)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
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
              <span className="text-[10px] font-bold tracking-tight">Scan QR</span>
              {activeTab === 2 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 -mt-0.5" />
              )}
            </button>

            {/* Tab 3: Account */}
            <button
              type="button"
              onClick={() => setActiveTab(3)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
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
              <span className="text-[10px] font-bold tracking-tight">Account</span>
              {activeTab === 3 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 -mt-0.5" />
              )}
            </button>
          </nav>
        )}
      </div>

      {/* API KEY CONFIGURATION MODAL */}
      {showApiKeyModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowApiKeyModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Geoapify API Key</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Geoapify provides routing and address search across Bangladesh. You can use your custom key anytime.
            </p>

            <input
              type="text"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="Paste your Geoapify API key..."
              className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  props.onApiKeyChange(tempApiKey);
                  setShowApiKeyModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold cursor-pointer"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
