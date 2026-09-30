import React, { useState, useRef } from 'react';
import {
  Tag,
  Clock,
  QrCode,
  User,
  ArrowLeft,
  Bike,
  Sparkles,
  LayoutGrid,
  Home,
} from 'lucide-react';
import { LocationPoint, RouteData, RideRequest } from '../types';
import { PassengerProfile } from '../services/passengerAuth';
import { BeeGoVoltxLogo } from './BeeGoVoltxLogo';
import { PassengerHomeDashboard } from './PassengerHomeDashboard';
import { RideHistorySection } from './RideHistorySection';
import { PassengerAccountSection } from './PassengerAccountSection';
import { OffersSection } from './OffersSection';
import { QrScannerSection } from './QrScannerSection';
import { BatterySwapModal } from './BatterySwapModal';
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
  onOpenAuthModal?: () => void;
}

type NavTab = 'home' | 'offers' | 'activity' | 'scan_qr' | 'profile';

export const PassengerAppShell: React.FC<PassengerAppShellProps> = (props) => {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isPowerStationsOpen, setIsPowerStationsOpen] = useState(false);

  const displayName = props.passengerProfile?.name || 'Passenger';
  const initials =
    displayName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'P';

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
    <div className="w-full h-full bg-white text-[#1A1A1A] flex flex-col justify-between overflow-hidden relative select-none max-w-[430px] mx-auto shadow-2xl">
      {/* 1. STICKY TOP APPBAR (Pathao Style) */}
      <header className="sticky top-0 z-40 w-full h-14 bg-white/95 backdrop-blur-md border-b border-zinc-100 px-4 flex items-center justify-between shrink-0 shadow-xs">
        {/* Left: BeeGo Voltx Logo or Back Button */}
        <div className="flex items-center gap-2">
          {isBookingOpen ? (
            <button
              type="button"
              onClick={handleCloseBooking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-black transition-all cursor-pointer text-xs font-bold active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-900" />
              <span>Back</span>
            </button>
          ) : activeTab !== 'home' ? (
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 cursor-pointer text-xs font-bold active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="cursor-pointer text-left"
            >
              <BeeGoVoltxLogo size="md" />
            </button>
          )}
        </div>

        {/* Right: Circular Profile Avatar (Tapping opens Account Page) */}
        <div className="flex items-center gap-2">
          {/* Circular Profile Avatar */}
          <button
            type="button"
            id="top-profile-avatar-button"
            onClick={() => setActiveTab(activeTab === 'profile' ? 'home' : 'profile')}
            className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all cursor-pointer border-2 ${
              activeTab === 'profile'
                ? 'bg-[#F5C518] text-black border-[#E6A800] shadow-sm'
                : 'bg-zinc-100 hover:bg-[#FFF9E6] text-zinc-800 border-zinc-200 hover:border-[#F5C518]'
            }`}
            title="My Profile"
          >
            {initials}
          </button>
        </div>
      </header>

      {/* 2. MAIN SCROLLABLE CONTENT AREA */}
      <main className="flex-1 w-full overflow-y-auto no-scrollbar relative flex flex-col bg-[#F8F9FA]">
        {isBookingOpen ? (
          /* Full Ride Request Experience */
          <div className="w-full flex-1 flex flex-col bg-white">
            <RideRequestForm
              {...props}
              onBackToRoles={() => setIsBookingOpen(false)}
            />
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col">
            {/* VIEW: HOME DASHBOARD */}
            {activeTab === 'home' && (
              <PassengerHomeDashboard
                onTakeRide={handleOpenBooking}
                onOpenPowerStations={() => setIsPowerStationsOpen(true)}
                onOpenOffers={() => setActiveTab('offers')}
                userLiveAddress={props.pickup?.formatted}
                passengerName={props.passengerProfile?.name || props.passengerId}
              />
            )}

            {/* VIEW 1: OFFERS */}
            {activeTab === 'offers' && (
              <OffersSection
                onApplyPromo={(code) => {
                  setActiveTab('home');
                  handleOpenBooking();
                }}
                onBookRide={() => {
                  setActiveTab('home');
                  handleOpenBooking();
                }}
              />
            )}

            {/* VIEW 2: ACTIVITY */}
            {activeTab === 'activity' && (
              <RideHistorySection
                activeRide={props.activeRide}
                onCancelRide={props.onCancelRide}
                onViewLiveTracking={() => {
                  setIsBookingOpen(true);
                }}
                onRebookRide={(dropoffStr: string) => {
                  props.setDropoff({
                    lat: 23.7925,
                    lon: 90.4078,
                    formatted: dropoffStr,
                  });
                  setIsBookingOpen(true);
                }}
              />
            )}

            {/* VIEW 3: SCAN QR (Replaces Inbox) */}
            {activeTab === 'scan_qr' && (
              <QrScannerSection onBack={() => setActiveTab('home')} />
            )}

            {/* VIEW 4: PROFILE / ACCOUNT */}
            {activeTab === 'profile' && (
              <PassengerAccountSection
                passengerId={props.passengerId}
                passengerProfile={props.passengerProfile}
                onClose={() => setActiveTab('home')}
                onSignOut={props.onBackToRoles}
                onOpenOffers={() => setActiveTab('offers')}
              />
            )}
          </div>
        )}
      </main>

      {/* 3. FIXED BOTTOM NAVIGATION BAR (4 Items: Dashboard, Offers, Activity, Scan QR) */}
      {!isBookingOpen && (
        <nav
          id="beego-voltx-fixed-bottom-nav"
          className="shrink-0 w-full z-40 bg-white/95 backdrop-blur-2xl border-t border-zinc-200/80 rounded-t-[26px] h-[70px] px-2.5 pb-1 pt-1.5 flex items-center justify-around shadow-[0_-10px_35px_rgba(0,0,0,0.07),0_-1px_0_rgba(255,255,255,0.9)_inset] select-none transition-all duration-300"
        >
          {/* Item 1: Dashboard (Main Ride Selection Hub - Selected by Default) */}
          <button
            type="button"
            id="bottom-nav-dashboard-button"
            onClick={() => {
              setIsBookingOpen(false);
              setActiveTab('home');
            }}
            className={`group relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all cursor-pointer active:scale-92 ${
              activeTab === 'home' ? 'text-[#1A1A1A]' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            {/* Active micro-indicator bar on top */}
            {activeTab === 'home' && (
              <span className="absolute -top-1.5 w-10 h-[3.5px] bg-[#F5C518] rounded-full shadow-[0_2px_8px_rgba(245,197,24,0.65)] animate-in fade-in duration-200" />
            )}

            <div
              className={`w-12 h-7.5 rounded-full flex items-center justify-center transition-all duration-200 ${
                activeTab === 'home'
                  ? 'bg-gradient-to-r from-[#F5C518] to-[#FFD84D] text-[#1A1A1A] shadow-[0_4px_12px_rgba(245,197,24,0.32)] scale-105 ring-1.5 ring-amber-300/50'
                  : 'text-zinc-400 group-hover:text-zinc-700 group-hover:bg-zinc-100/60'
              }`}
            >
              <Home className={`w-4.5 h-4.5 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-[1.9]'}`} />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                activeTab === 'home' ? 'font-black text-[#1A1A1A]' : 'font-semibold text-zinc-400 group-hover:text-zinc-700'
              }`}
            >
              Dashboard
            </span>
          </button>

          {/* Item 2: Offers */}
          <button
            type="button"
            id="bottom-nav-offers-button"
            onClick={() => {
              setIsBookingOpen(false);
              setActiveTab('offers');
            }}
            className={`group relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all cursor-pointer active:scale-92 ${
              activeTab === 'offers' ? 'text-[#1A1A1A]' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            {activeTab === 'offers' && (
              <span className="absolute -top-1.5 w-10 h-[3.5px] bg-[#F5C518] rounded-full shadow-[0_2px_8px_rgba(245,197,24,0.65)] animate-in fade-in duration-200" />
            )}

            <div
              className={`w-12 h-7.5 rounded-full flex items-center justify-center transition-all duration-200 relative ${
                activeTab === 'offers'
                  ? 'bg-gradient-to-r from-[#F5C518] to-[#FFD84D] text-[#1A1A1A] shadow-[0_4px_12px_rgba(245,197,24,0.32)] scale-105 ring-1.5 ring-amber-300/50'
                  : 'text-zinc-400 group-hover:text-zinc-700 group-hover:bg-zinc-100/60'
              }`}
            >
              <Tag className={`w-4.5 h-4.5 ${activeTab === 'offers' ? 'stroke-[2.5]' : 'stroke-[1.9]'}`} />
              {/* Subtle Promo Tag indicator */}
              {activeTab !== 'offers' && (
                <span className="absolute -top-0.5 -right-0.5 px-1 py-0.2 rounded-full text-[7.5px] font-black bg-rose-500 text-white tracking-tighter shadow-xs leading-none">
                  %
                </span>
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                activeTab === 'offers' ? 'font-black text-[#1A1A1A]' : 'font-semibold text-zinc-400 group-hover:text-zinc-700'
              }`}
            >
              Offers
            </span>
          </button>

          {/* Item 3: Activity (Shows ongoing live tracking beacon if active) */}
          <button
            type="button"
            id="bottom-nav-activity-button"
            onClick={() => {
              setIsBookingOpen(false);
              setActiveTab('activity');
            }}
            className={`group relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all cursor-pointer active:scale-92 ${
              activeTab === 'activity' ? 'text-[#1A1A1A]' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            {activeTab === 'activity' && (
              <span className="absolute -top-1.5 w-10 h-[3.5px] bg-[#F5C518] rounded-full shadow-[0_2px_8px_rgba(245,197,24,0.65)] animate-in fade-in duration-200" />
            )}

            <div
              className={`w-12 h-7.5 rounded-full flex items-center justify-center transition-all duration-200 relative ${
                activeTab === 'activity'
                  ? 'bg-gradient-to-r from-[#F5C518] to-[#FFD84D] text-[#1A1A1A] shadow-[0_4px_12px_rgba(245,197,24,0.32)] scale-105 ring-1.5 ring-amber-300/50'
                  : 'text-zinc-400 group-hover:text-zinc-700 group-hover:bg-zinc-100/60'
              }`}
            >
              <Clock className={`w-4.5 h-4.5 ${activeTab === 'activity' ? 'stroke-[2.5]' : 'stroke-[1.9]'}`} />

              {/* Ongoing pulse radar badge if ride is active */}
              {props.activeRide &&
                (props.activeRide.status === 'requested' ||
                  props.activeRide.status === 'accepted' ||
                  props.activeRide.status === 'in_transit') && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white shadow-xs" />
                  </span>
                )}
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                activeTab === 'activity' ? 'font-black text-[#1A1A1A]' : 'font-semibold text-zinc-400 group-hover:text-zinc-700'
              }`}
            >
              Activity
            </span>
          </button>

          {/* Item 4: Scan QR */}
          <button
            type="button"
            id="bottom-nav-scan-qr-button"
            onClick={() => {
              setIsBookingOpen(false);
              setActiveTab('scan_qr');
            }}
            className={`group relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all cursor-pointer active:scale-92 ${
              activeTab === 'scan_qr' ? 'text-[#1A1A1A]' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            {activeTab === 'scan_qr' && (
              <span className="absolute -top-1.5 w-10 h-[3.5px] bg-[#F5C518] rounded-full shadow-[0_2px_8px_rgba(245,197,24,0.65)] animate-in fade-in duration-200" />
            )}

            <div
              className={`w-12 h-7.5 rounded-full flex items-center justify-center transition-all duration-200 ${
                activeTab === 'scan_qr'
                  ? 'bg-gradient-to-r from-[#F5C518] to-[#FFD84D] text-[#1A1A1A] shadow-[0_4px_12px_rgba(245,197,24,0.32)] scale-105 ring-1.5 ring-amber-300/50'
                  : 'text-zinc-400 group-hover:text-zinc-700 group-hover:bg-zinc-100/60'
              }`}
            >
              <QrCode className={`w-4.5 h-4.5 ${activeTab === 'scan_qr' ? 'stroke-[2.5]' : 'stroke-[1.9]'}`} />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 ${
                activeTab === 'scan_qr' ? 'font-black text-[#1A1A1A]' : 'font-semibold text-zinc-400 group-hover:text-zinc-700'
              }`}
            >
              Scan QR
            </span>
          </button>
        </nav>
      )}

      {/* 4. BATTERY SWAP POWER STATIONS MODAL */}
      {isPowerStationsOpen && (
        <BatterySwapModal
          onClose={() => setIsPowerStationsOpen(false)}
          onSelectStation={(stName) => {
            setIsPowerStationsOpen(false);
            handleOpenBooking(`Voltx Station: ${stName}`);
          }}
        />
      )}
    </div>
  );
};
