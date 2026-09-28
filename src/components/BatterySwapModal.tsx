import React, { useState } from 'react';
import {
  X,
  Zap,
  BatteryCharging,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
  Navigation,
  Sparkles,
} from 'lucide-react';

interface Station {
  id: string;
  name: string;
  area: string;
  distance: string;
  availableBatteries: number;
  totalSlots: number;
  status: 'online' | 'busy';
  address: string;
}

const DHAKA_STATIONS: Station[] = [
  {
    id: 'st-gulshan',
    name: 'Voltx Hub 01 — Gulshan 2',
    area: 'Gulshan 2 Circle',
    distance: '0.8 km away',
    availableBatteries: 14,
    totalSlots: 16,
    status: 'online',
    address: 'Plot 12, Road 45, Gulshan 2, Dhaka',
  },
  {
    id: 'st-banani',
    name: 'Voltx Hub 02 — Banani 11',
    area: 'Road 11, Banani',
    distance: '1.4 km away',
    availableBatteries: 10,
    totalSlots: 12,
    status: 'online',
    address: 'House 67, Block D, Road 11, Banani, Dhaka',
  },
  {
    id: 'st-dhanmondi',
    name: 'Voltx Hub 03 — Dhanmondi 27',
    area: 'Old 27 (Rangs KB Square)',
    distance: '3.6 km away',
    availableBatteries: 8,
    totalSlots: 12,
    status: 'online',
    address: 'Mirpur Road, Dhanmondi 27, Dhaka',
  },
  {
    id: 'st-uttara',
    name: 'Voltx Hub 04 — Uttara Sector 7',
    area: 'Rabindra Sarani, Sector 7',
    distance: '7.2 km away',
    availableBatteries: 15,
    totalSlots: 16,
    status: 'online',
    address: 'Sector 7 Main Road, Uttara, Dhaka',
  },
  {
    id: 'st-mirpur',
    name: 'Voltx Hub 05 — Mirpur 10',
    area: 'Mirpur 10 Roundabout',
    distance: '5.1 km away',
    availableBatteries: 9,
    totalSlots: 12,
    status: 'online',
    address: 'Near Metro Station, Mirpur 10, Dhaka',
  },
  {
    id: 'st-motijheel',
    name: 'Voltx Hub 06 — Motijheel C/A',
    area: 'City Center, Motijheel',
    distance: '6.8 km away',
    availableBatteries: 11,
    totalSlots: 12,
    status: 'online',
    address: 'Dilkusha C/A, Motijheel, Dhaka',
  },
];

interface BatterySwapModalProps {
  onClose: () => void;
  onSelectStation?: (stationName: string) => void;
}

export const BatterySwapModal: React.FC<BatterySwapModalProps> = ({
  onClose,
  onSelectStation,
}) => {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [reserved, setReserved] = useState(false);

  const handleReserve = (st: Station) => {
    setSelectedStation(st);
    setReserved(true);
    setTimeout(() => {
      if (onSelectStation) onSelectStation(st.name);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="w-full max-w-[420px] bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-zinc-200 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F5C518] flex items-center justify-center text-black">
              <Zap className="w-4 h-4 fill-black" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1A1A1A]">Power Stations</h2>
              <p className="text-[11px] text-zinc-500">Instant electric battery swap across Dhaka</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success toast if reserved */}
        {reserved && selectedStation && (
          <div className="mt-3 p-3 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/50 flex items-center gap-2.5 text-xs text-amber-900 shrink-0 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#E6A800] shrink-0" />
            <div className="flex-1">
              <span className="font-bold">Battery slot reserved at {selectedStation.area}!</span>
              <span className="block text-[10px] text-amber-700">Held for 15 minutes. Drive to the station.</span>
            </div>
          </div>
        )}

        {/* Stations Scroll List */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-3 flex flex-col gap-2.5">
          {DHAKA_STATIONS.map((station) => (
            <div
              key={station.id}
              className="p-3.5 rounded-2xl bg-[#F8F9FA] hover:bg-white border border-zinc-200/80 hover:border-[#F5C518] hover:shadow-md transition-all flex flex-col gap-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#FFF9E6] text-[#E6A800] flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#1A1A1A]">{station.name}</h3>
                    <p className="text-[11px] text-zinc-500">{station.address}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                  {station.distance}
                </span>
              </div>

              {/* Battery availability bar */}
              <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-zinc-600">
                  <BatteryCharging className="w-3.5 h-3.5 text-[#E6A800]" />
                  <span className="text-[11px] font-semibold">
                    <strong className="text-zinc-900">{station.availableBatteries}</strong> / {station.totalSlots} Ready
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleReserve(station)}
                  className="px-3 py-1.5 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-[11px] transition-colors cursor-pointer shadow-sm active:scale-95"
                >
                  Swap Here
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
          <span>Standard Swap Fee: <strong className="text-zinc-900">৳60</strong></span>
          <span className="text-[#E6A800] font-bold">100% Green Electric</span>
        </div>
      </div>
    </div>
  );
};
