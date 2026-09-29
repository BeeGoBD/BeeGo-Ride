import React, { useState } from 'react';
import {
  Compass,
  Clock,
  QrCode,
  User,
  Bike,
  ArrowLeft,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { RideRequest } from '../types';
import { BeeGoVoltxLogo } from './BeeGoVoltxLogo';
import { RiderDashboard } from './RiderDashboard';
import { RiderHistorySection } from './RiderHistorySection';
import { QrScannerSection } from './QrScannerSection';
import { RiderAccountSection } from './RiderAccountSection';
import { BatterySwapModal } from './BatterySwapModal';

interface RiderAppShellProps {
  riderId: string;
  activeRide: RideRequest | null;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onBackToRoles: () => void;
  onSwitchToPassenger: () => void;
  onReplayIntro?: () => void;
}

type RiderNavTab = 'dashboard' | 'trips' | 'scan_qr' | 'profile';

export const RiderAppShell: React.FC<RiderAppShellProps> = ({
  riderId,
  activeRide,
  apiKey,
  onApiKeyChange,
  onBackToRoles,
  onSwitchToPassenger,
  onReplayIntro,
}) => {
  const [activeTab, setActiveTab] = useState<RiderNavTab>('dashboard');
  const [isPowerStationsOpen, setIsPowerStationsOpen] = useState(false);

  return (
    <div className="w-full h-full bg-white text-[#1A1A1A] flex flex-col justify-between overflow-hidden relative select-none max-w-[430px] mx-auto shadow-2xl">
      {/* 1. STICKY TOP APPBAR */}
      <header className="sticky top-0 z-40 w-full h-14 bg-white/95 backdrop-blur-md border-b border-zinc-100 px-4 flex items-center justify-between shrink-0 shadow-xs">
        {/* Left: Brand Logo & Driver Tag */}
        <div className="flex items-center gap-2">
          {activeTab !== 'dashboard' ? (
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 cursor-pointer text-xs font-bold active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="cursor-pointer text-left flex items-center gap-2"
            >
              <BeeGoVoltxLogo size="md" />
              <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 text-[#F5C518]">
                Driver
              </span>
            </button>
          )}
        </div>

        {/* Right: Quick Switch to Passenger & Profile Avatar */}
        <div className="flex items-center gap-2">
          {/* Switch to Passenger Mode */}
          <button
            type="button"
            onClick={onSwitchToPassenger}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FFF9E6] border border-[#F5C518]/40 hover:bg-[#F5C518] text-[11px] font-bold text-[#E6A800] hover:text-black transition-all cursor-pointer active:scale-95"
            title="Switch to Passenger Mode"
          >
            <User className="w-3.5 h-3.5" />
            <span>Passenger</span>
          </button>

          {/* Circular Driver Profile Avatar */}
          <button
            type="button"
            id="driver-profile-avatar-button"
            onClick={() => setActiveTab(activeTab === 'profile' ? 'dashboard' : 'profile')}
            className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all cursor-pointer border-2 ${
              activeTab === 'profile'
                ? 'bg-[#F5C518] text-black border-[#E6A800] shadow-sm'
                : 'bg-zinc-900 text-[#F5C518] border-zinc-900 hover:bg-zinc-800'
            }`}
            title="Driver Profile & Documents"
          >
            DR
          </button>
        </div>
      </header>

      {/* 2. MAIN SCROLLABLE CONTENT */}
      <main className="flex-1 w-full overflow-y-auto no-scrollbar relative flex flex-col bg-[#F8F9FA]">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <RiderDashboard
            riderId={riderId}
            activeRide={activeRide}
            apiKey={apiKey}
            onBackToRoles={onBackToRoles}
            onSwitchToPassenger={onSwitchToPassenger}
            onOpenMyTrips={() => setActiveTab('trips')}
            onOpenPowerStations={() => setIsPowerStationsOpen(true)}
            hideHeader={true}
          />
        )}

        {/* TAB 2: MY TRIPS (Activity for Driver) */}
        {activeTab === 'trips' && (
          <RiderHistorySection />
        )}

        {/* TAB 3: SCAN QR (Scan Battery QR page) */}
        {activeTab === 'scan_qr' && (
          <QrScannerSection onBack={() => setActiveTab('dashboard')} />
        )}

        {/* TAB 4: PROFILE / ACCOUNT (Driver details) */}
        {activeTab === 'profile' && (
          <RiderAccountSection
            riderId={riderId}
            onSwitchToPassenger={onSwitchToPassenger}
            onReplayIntro={onReplayIntro}
            onSignOut={onBackToRoles}
          />
        )}
      </main>

      {/* 3. FIXED BOTTOM NAVIGATION BAR (3 Items Adapted for Rider) */}
      <nav
        id="rider-voltx-fixed-bottom-nav"
        className="shrink-0 w-full z-40 bg-white/98 backdrop-blur-md border-t border-zinc-200/90 h-16 px-4 flex items-center justify-around shadow-lg select-none"
      >
        {/* Item 1: Dispatch / Dashboard */}
        <button
          type="button"
          id="rider-bottom-nav-dashboard-button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            activeTab === 'dashboard' ? 'text-[#1A1A1A]' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <div
            className={`w-10 h-7 rounded-full flex items-center justify-center transition-colors ${
              activeTab === 'dashboard' ? 'bg-[#FFF9E6] text-[#E6A800]' : ''
            }`}
          >
            <Compass className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span
            className={`text-[10px] tracking-tight ${
              activeTab === 'dashboard' ? 'font-black text-[#1A1A1A]' : 'font-medium'
            }`}
          >
            Radar
          </span>
        </button>

        {/* Item 2: My Trips */}
        <button
          type="button"
          id="rider-bottom-nav-trips-button"
          onClick={() => setActiveTab('trips')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer relative ${
            activeTab === 'trips' ? 'text-[#1A1A1A]' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <div
            className={`w-10 h-7 rounded-full flex items-center justify-center transition-colors ${
              activeTab === 'trips' ? 'bg-[#FFF9E6] text-[#E6A800]' : ''
            }`}
          >
            <Clock className={`w-5 h-5 ${activeTab === 'trips' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span
            className={`text-[10px] tracking-tight ${
              activeTab === 'trips' ? 'font-black text-[#1A1A1A]' : 'font-medium'
            }`}
          >
            My Trips
          </span>

          {activeRide && (activeRide.status === 'accepted' || activeRide.status === 'in_transit') && (
            <span className="absolute top-1.5 right-6 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          )}
        </button>

        {/* Item 3: Scan QR */}
        <button
          type="button"
          id="rider-bottom-nav-scan-qr-button"
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

      {/* 4. BATTERY SWAP POWER STATIONS MODAL */}
      {isPowerStationsOpen && (
        <BatterySwapModal
          onClose={() => setIsPowerStationsOpen(false)}
          onSelectStation={() => {
            setIsPowerStationsOpen(false);
          }}
        />
      )}
    </div>
  );
};
