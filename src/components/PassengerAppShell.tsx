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
    <div className="w-full h-full min-h-screen bg-white text-[#1A1A1A] flex flex-col justify-between overflow-hidden relative select-none max-w-[430px] mx-auto shadow-2xl">
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
          {/* Switch to Rider Mode */}
          <button
            type="button"
            onClick={props.onSwitchToRider}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FFF9E6] border border-[#F5C518]/40 hover:bg-[#F5C518] text-[11px] font-bold text-[#E6A800] hover:text-black transition-all cursor-pointer active:scale-95"
            title="Switch to Rider Mode"
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Driver</span>
          </button>

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
                onRebookRide={(dropoffStr) => {
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
                onSwitchToRider={props.onSwitchToRider}
                onClose={() => setActiveTab('home')}
                onSignOut={props.onBackToRoles}
                onOpenOffers={() => setActiveTab('offers')}
              />
            )}
          </div>
        )}
      </main>

      {/* 3. FIXED BOTTOM NAVIGATION BAR (3 Items Only: Offers, Activity, Scan QR) */}
      {!isBookingOpen && (
        <nav
          id="beego-voltx-fixed-bottom-nav"
          className="fixed bottom-0 left-0 right-0 z-40 max-w-[430px] mx-auto bg-white/98 backdrop-blur-md border-t border-zinc-200/90 h-16 px-4 flex items-center justify-around shadow-lg select-none"
        >
          {/* Item 1: Offers */}
          <button
            type="button"
            id="bottom-nav-offers-button"
            onClick={() => setActiveTab('offers')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
              activeTab === 'offers' ? 'text-[#1A1A1A]' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <div
              className={`w-10 h-7 rounded-full flex items-center justify-center transition-colors ${
                activeTab === 'offers' ? 'bg-[#FFF9E6] text-[#E6A800]' : ''
              }`}
            >
              <Tag className={`w-5 h-5 ${activeTab === 'offers' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            </div>
            <span
              className={`text-[10px] tracking-tight ${
                activeTab === 'offers' ? 'font-black text-[#1A1A1A]' : 'font-medium'
              }`}
            >
              Offers
            </span>
          </button>

          {/* Item 2: Activity (Shows ongoing badge if active) */}
          <button
            type="button"
            id="bottom-nav-activity-button"
            onClick={() => setActiveTab('activity')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer relative ${
              activeTab === 'activity' ? 'text-[#1A1A1A]' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <div
              className={`w-10 h-7 rounded-full flex items-center justify-center transition-colors ${
                activeTab === 'activity' ? 'bg-[#FFF9E6] text-[#E6A800]' : ''
              }`}
            >
              <Clock className={`w-5 h-5 ${activeTab === 'activity' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            </div>
            <span
              className={`text-[10px] tracking-tight ${
                activeTab === 'activity' ? 'font-black text-[#1A1A1A]' : 'font-medium'
              }`}
            >
              Activity
            </span>

            {/* Ongoing dot badge */}
            {props.activeRide &&
              (props.activeRide.status === 'requested' ||
                props.activeRide.status === 'accepted' ||
                props.activeRide.status === 'in_transit') && (
                <span className="absolute top-1.5 right-6 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
          </button>

          {/* Item 3: Scan QR (Replaces Inbox) */}
          <button
            type="button"
            id="bottom-nav-scan-qr-button"
            onClick={() => setActiveTab('scan_qr')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
              activeTab === 'scan_qr' ? 'text-[#1A1A1A]' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <div
              className={`w-10 h-7 rounded-full flex items-center justify-center transition-colors ${
                activeTab === 'scan_qr' ? 'bg-[#FFF9E6] text-[#E6A800]' : ''
              }`}
            >
              <QrCode className={`w-5 h-5 ${activeTab === 'scan_qr' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            </div>
            <span
              className={`text-[10px] tracking-tight ${
                activeTab === 'scan_qr' ? 'font-black text-[#1A1A1A]' : 'font-medium'
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
