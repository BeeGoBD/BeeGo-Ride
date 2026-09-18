import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  CheckCircle2,
  Bike,
  Car,
  Receipt,
  RotateCcw,
  Star,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  X,
} from 'lucide-react';
import { RATE_PER_KM_TAKA } from '../services/rideSync';

export interface HistoryRideItem {
  id: string;
  date: string;
  time: string;
  pickup: string;
  dropoff: string;
  distanceKm: number;
  fareTaka: number;
  vehicleType: 'bike' | 'car';
  vehicleModel: string;
  plateNumber: string;
  driverName: string;
  driverRating: number;
  paymentMethod: string;
  status: 'completed';
}

const DEFAULT_COMPLETED_RIDES: HistoryRideItem[] = [
  {
    id: 'TRIP-BD-8901',
    date: 'Today',
    time: '11:20 AM',
    pickup: 'Gulshan 2 Circle, Road 90, Dhaka',
    dropoff: 'Dhanmondi 27, Satmasjid Road, Dhaka',
    distanceKm: 7.2,
    fareTaka: 504,
    vehicleType: 'bike',
    vehicleModel: 'Yamaha FZ-S FI (Midnight Black)',
    plateNumber: 'DHAKA METRO-HA 52-8910',
    driverName: 'Tanvir Hossain',
    driverRating: 4.95,
    paymentMethod: 'bKash (017••••••89)',
    status: 'completed',
  },
  {
    id: 'TRIP-BD-7642',
    date: 'Yesterday',
    time: '06:45 PM',
    pickup: 'Banani Road 11, Block D, Dhaka',
    dropoff: 'Hazrat Shahjalal Int’l Airport, Terminal 1',
    distanceKm: 8.5,
    fareTaka: 595,
    vehicleType: 'car',
    vehicleModel: 'Toyota Axio Hybrid (Pearl White)',
    plateNumber: 'DHAKA METRO-GA 29-4102',
    driverName: 'Abdur Rahim',
    driverRating: 4.88,
    paymentMethod: 'Cash on Arrival',
    status: 'completed',
  },
  {
    id: 'TRIP-BD-6519',
    date: '16 Sep 2026',
    time: '09:15 AM',
    pickup: 'Uttara Sector 3, Jashimuddin Ave, Dhaka',
    dropoff: 'Mohakhali Wireless Gate, Dhaka',
    distanceKm: 11.0,
    fareTaka: 770,
    vehicleType: 'bike',
    vehicleModel: 'Honda CB Hornet 160R (Crimson Red)',
    plateNumber: 'DHAKA METRO-LA 18-9321',
    driverName: 'Kamal Uddin',
    driverRating: 5.0,
    paymentMethod: 'Nagad Wallet',
    status: 'completed',
  },
  {
    id: 'TRIP-BD-5380',
    date: '14 Sep 2026',
    time: '08:30 PM',
    pickup: 'Bashundhara R/A, Block C, Dhaka',
    dropoff: 'Jamuna Future Park, Kuril, Dhaka',
    distanceKm: 3.4,
    fareTaka: 238,
    vehicleType: 'bike',
    vehicleModel: 'Suzuki Gixxer Monotone',
    plateNumber: 'DHAKA METRO-HA 33-7641',
    driverName: 'Sakibul Islam',
    driverRating: 4.92,
    paymentMethod: 'bKash (017••••••89)',
    status: 'completed',
  },
];

interface RideHistorySectionProps {
  onBookAgain?: (pickup: string, dropoff: string) => void;
}

export const RideHistorySection: React.FC<RideHistorySectionProps> = ({ onBookAgain }) => {
  const [filterType, setFilterType] = useState<'all' | 'bike' | 'car'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<HistoryRideItem | null>(null);

  const filteredRides = DEFAULT_COMPLETED_RIDES.filter((ride) => {
    if (filterType !== 'all' && ride.vehicleType !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        ride.pickup.toLowerCase().includes(q) ||
        ride.dropoff.toLowerCase().includes(q) ||
        ride.driverName.toLowerCase().includes(q) ||
        ride.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div id="ride-history-section" className="w-full max-w-3xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Trip History</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
              Completed
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            All your past trips with itemized receipts at ৳{RATE_PER_KM_TAKA}/km
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs text-zinc-400">Total Spent</div>
          <div className="text-base sm:text-lg font-black text-emerald-400">৳2,107</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search destination or captain..."
            className="w-full pl-9.5 pr-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-white text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Trips
          </button>
          <button
            type="button"
            onClick={() => setFilterType('bike')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              filterType === 'bike'
                ? 'bg-emerald-500 text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Moto</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('car')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              filterType === 'car'
                ? 'bg-emerald-500 text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Car</span>
          </button>
        </div>
      </div>

      {/* Trips List */}
      <div className="flex flex-col gap-3.5">
        {filteredRides.map((ride) => (
          <div
            key={ride.id}
            className="rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 p-4 sm:p-5 transition-all shadow-lg group"
          >
            {/* Top row: Date, Vehicle tag, Fare */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                  {ride.vehicleType === 'bike' ? (
                    <Bike className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Car className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{ride.date}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-400 font-normal">{ride.time}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">{ride.id}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-base sm:text-lg font-black text-white">
                  ৳{ride.fareTaka}
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Paid • {ride.distanceKm} km</span>
                </div>
              </div>
            </div>

            {/* Route Points */}
            <div className="flex flex-col gap-2 relative pl-5 my-3">
              {/* Vertical connector line */}
              <div className="absolute left-1.5 top-2.5 bottom-2.5 w-0.5 bg-zinc-800" />

              {/* Pickup */}
              <div className="relative">
                <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-black" />
                <div className="text-xs text-zinc-400">Pickup</div>
                <div className="text-sm font-medium text-white line-clamp-1">
                  {ride.pickup}
                </div>
              </div>

              {/* Dropoff */}
              <div className="relative">
                <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-black" />
                <div className="text-xs text-zinc-400">Destination</div>
                <div className="text-sm font-medium text-white line-clamp-1">
                  {ride.dropoff}
                </div>
              </div>
            </div>

            {/* Driver details and actions */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-900 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">
                  {ride.driverName.charAt(0)}
                </div>
                <div>
                  <div className="text-zinc-300 font-medium flex items-center gap-1">
                    <span>Captain {ride.driverName}</span>
                    <span className="flex items-center text-amber-400 text-[10px]">
                      <Star className="w-2.5 h-2.5 fill-amber-400 inline" /> {ride.driverRating}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500">{ride.vehicleModel}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* View Receipt */}
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(ride)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 flex items-center gap-1 transition-colors cursor-pointer"
                  title="View Itemized Receipt"
                >
                  <Receipt className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Receipt</span>
                </button>

                {/* Re-book / Ride Again */}
                {onBookAgain && (
                  <button
                    type="button"
                    onClick={() => onBookAgain(ride.pickup, ride.dropoff)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Ride Again</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* RECEIPT MODAL */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white">Bigo</span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                  Receipt
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-zinc-400 mb-4 flex justify-between">
              <span>Trip ID: {selectedReceipt.id}</span>
              <span>{selectedReceipt.date} • {selectedReceipt.time}</span>
            </div>

            {/* Price breakdown */}
            <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800/80 mb-4 flex flex-col gap-2 text-xs">
              <div className="flex justify-between text-zinc-300">
                <span>Distance Traveled</span>
                <span className="font-semibold text-white">{selectedReceipt.distanceKm} km</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Fare Rate</span>
                <span className="font-semibold text-white">৳{RATE_PER_KM_TAKA} / km</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Calculation</span>
                <span>{selectedReceipt.distanceKm} km × ৳{RATE_PER_KM_TAKA}</span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex justify-between text-sm font-bold text-emerald-400">
                <span>Total Fare</span>
                <span>৳{selectedReceipt.fareTaka} Taka</span>
              </div>
            </div>

            <div className="text-xs text-zinc-400 mb-4">
              <div className="flex justify-between py-1">
                <span>Payment Method</span>
                <span className="text-white font-medium">{selectedReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Captain</span>
                <span className="text-white font-medium">{selectedReceipt.driverName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Vehicle</span>
                <span className="text-white font-medium">{selectedReceipt.vehicleModel}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-sm transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
