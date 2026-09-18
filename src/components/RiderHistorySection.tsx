import React, { useState } from 'react';
import {
  Bike,
  Car,
  Clock,
  MapPin,
  CheckCircle2,
  Receipt,
  Star,
  Search,
  ArrowRight,
  TrendingUp,
  Banknote,
  Wallet,
  X,
  User,
  Download,
} from 'lucide-react';
import { RATE_PER_KM_TAKA } from '../services/rideSync';

export interface RiderHistoryTrip {
  id: string;
  date: string;
  time: string;
  passengerName: string;
  passengerId: string;
  pickup: string;
  dropoff: string;
  distanceKm: number;
  grossFareTaka: number;
  riderEarningsTaka: number;
  tipTaka: number;
  vehicleType: 'bike';
  paymentMethod: string;
  ratingGivenByPax: number;
  status: 'completed';
}

const DEFAULT_RIDER_TRIPS: RiderHistoryTrip[] = [
  {
    id: 'TRIP-BD-8901',
    date: 'Today',
    time: '11:20 AM',
    passengerName: 'Anika Rahman',
    passengerId: 'PAX-DH-9014',
    pickup: 'Gulshan 2 Circle, Road 90, Dhaka',
    dropoff: 'Dhanmondi 27, Satmasjid Road, Dhaka',
    distanceKm: 7.2,
    grossFareTaka: 504,
    riderEarningsTaka: 428,
    tipTaka: 30,
    vehicleType: 'bike',
    paymentMethod: 'bKash (Wallet credited)',
    ratingGivenByPax: 5.0,
    status: 'completed',
  },
  {
    id: 'TRIP-BD-8842',
    date: 'Today',
    time: '09:45 AM',
    passengerName: 'Rafiqul Islam',
    passengerId: 'PAX-DH-4412',
    pickup: 'Banani Road 11, Block C, Dhaka',
    dropoff: 'Mohakhali Bus Terminal, Dhaka',
    distanceKm: 3.5,
    grossFareTaka: 245,
    riderEarningsTaka: 208,
    tipTaka: 0,
    vehicleType: 'bike',
    paymentMethod: 'Cash Collected',
    ratingGivenByPax: 4.9,
    status: 'completed',
  },
  {
    id: 'TRIP-BD-7642',
    date: 'Yesterday',
    time: '06:45 PM',
    passengerName: 'Zubair Ahmed',
    passengerId: 'PAX-DH-1298',
    pickup: 'Uttara Sector 3, Jashimuddin Ave, Dhaka',
    dropoff: 'Hazrat Shahjalal Int’l Airport Terminal 1',
    distanceKm: 4.8,
    grossFareTaka: 336,
    riderEarningsTaka: 285,
    tipTaka: 20,
    vehicleType: 'bike',
    paymentMethod: 'bKash (Wallet credited)',
    ratingGivenByPax: 5.0,
    status: 'completed',
  },
  {
    id: 'TRIP-BD-6519',
    date: '16 Sep 2026',
    time: '02:15 PM',
    passengerName: 'Tahsin Kabir',
    passengerId: 'PAX-DH-7731',
    pickup: 'Bashundhara R/A, Block D, Dhaka',
    dropoff: 'Kuril Flyover, Dhaka',
    distanceKm: 4.0,
    grossFareTaka: 280,
    riderEarningsTaka: 238,
    tipTaka: 0,
    vehicleType: 'bike',
    paymentMethod: 'Nagad (Wallet credited)',
    ratingGivenByPax: 5.0,
    status: 'completed',
  },
  {
    id: 'TRIP-BD-5380',
    date: '15 Sep 2026',
    time: '08:30 PM',
    passengerName: 'Mahmudul Hasan',
    passengerId: 'PAX-DH-5509',
    pickup: 'Farmgate, Ananda Cinema Hall, Dhaka',
    dropoff: 'Mirpur 10 Circle, Dhaka',
    distanceKm: 8.5,
    grossFareTaka: 595,
    riderEarningsTaka: 505,
    tipTaka: 50,
    vehicleType: 'bike',
    paymentMethod: 'Cash Collected',
    ratingGivenByPax: 5.0,
    status: 'completed',
  },
];

export const RiderHistorySection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState<'all' | 'cash' | 'digital'>('all');
  const [selectedTrip, setSelectedTrip] = useState<RiderHistoryTrip | null>(null);

  const filteredTrips = DEFAULT_RIDER_TRIPS.filter((trip) => {
    if (filterPayment === 'cash' && !trip.paymentMethod.toLowerCase().includes('cash')) {
      return false;
    }
    if (filterPayment === 'digital' && trip.paymentMethod.toLowerCase().includes('cash')) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        trip.pickup.toLowerCase().includes(q) ||
        trip.dropoff.toLowerCase().includes(q) ||
        trip.passengerName.toLowerCase().includes(q) ||
        trip.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalEarned = DEFAULT_RIDER_TRIPS.reduce(
    (acc, t) => acc + t.riderEarningsTaka + t.tipTaka,
    0
  );
  const totalKm = DEFAULT_RIDER_TRIPS.reduce((acc, t) => acc + t.distanceKm, 0);

  const handleExportRiderCsv = () => {
    const headers = [
      'Trip ID',
      'Date',
      'Time',
      'Passenger Name',
      'Pickup',
      'Drop-off',
      'Distance (km)',
      'Gross Fare (BDT)',
      'Platform Fee (BDT)',
      'Net Earnings (BDT)',
      'Tip (BDT)',
      'Total Payout (BDT)',
      'Payment Method',
    ];
    const escape = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    const rows = filteredTrips.map((t) => [
      escape(t.id),
      escape(t.date),
      escape(t.time),
      escape(t.passengerName),
      escape(t.pickup),
      escape(t.dropoff),
      t.distanceKm,
      t.grossFareTaka,
      Math.round(t.grossFareTaka * 0.15),
      t.riderEarningsTaka,
      t.tipTaka,
      t.riderEarningsTaka + t.tipTaka,
      escape(t.paymentMethod),
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bigo-captain-earnings-statement.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="rider-history-section" className="w-full max-w-3xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Captain Trip Log</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
              Completed
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Your fulfilled trips and fare payouts at ৳{RATE_PER_KM_TAKA}/km
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportRiderCsv}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download payout ledger as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <div className="text-right">
            <div className="text-[11px] text-zinc-400">Total Payouts</div>
            <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">৳{totalEarned}</div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-6">
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-lg">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Trips</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-white">5 Rides</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">100% completed</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-lg">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
            <Bike className="w-3.5 h-3.5 text-blue-400" />
            <span>Distance</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-white">{totalKm.toFixed(1)} km</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Dhaka city routes</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-lg">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Rating</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-400">4.98 ★</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Top-tier captain</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search passenger name or route..."
            className="w-full pl-9.5 pr-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setFilterPayment('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterPayment === 'all'
                ? 'bg-white text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterPayment('digital')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterPayment === 'digital'
                ? 'bg-emerald-500 text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            bKash/Nagad
          </button>
          <button
            type="button"
            onClick={() => setFilterPayment('cash')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterPayment === 'cash'
                ? 'bg-emerald-500 text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Cash
          </button>
        </div>
      </div>

      {/* Trips list */}
      <div className="flex flex-col gap-3.5">
        {filteredTrips.map((trip) => (
          <div
            key={trip.id}
            className="rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 p-4 sm:p-5 transition-all shadow-lg group"
          >
            {/* Top row */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
                  <Bike className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{trip.date}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-400 font-normal">{trip.time}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">{trip.id}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-base sm:text-lg font-black text-emerald-400">
                  +৳{trip.riderEarningsTaka + trip.tipTaka}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">
                  {trip.distanceKm} km • Fare ৳{trip.grossFareTaka}
                </div>
              </div>
            </div>

            {/* Route Points */}
            <div className="flex flex-col gap-2 relative pl-5 my-3">
              <div className="absolute left-1.5 top-2.5 bottom-2.5 w-0.5 bg-zinc-800" />

              <div className="relative">
                <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-black" />
                <div className="text-xs text-zinc-400">Passenger Pickup</div>
                <div className="text-sm font-medium text-white line-clamp-1">
                  {trip.pickup}
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-black" />
                <div className="text-xs text-zinc-400">Drop-off Destination</div>
                <div className="text-sm font-medium text-white line-clamp-1">
                  {trip.dropoff}
                </div>
              </div>
            </div>

            {/* Passenger and Payout details */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-900 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">
                  <User className="w-3.5 h-3.5 text-zinc-300" />
                </div>
                <div>
                  <div className="text-zinc-300 font-medium flex items-center gap-1">
                    <span>{trip.passengerName}</span>
                    <span className="flex items-center text-amber-400 text-[10px]">
                      <Star className="w-2.5 h-2.5 fill-amber-400 inline" /> {trip.ratingGivenByPax}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500">{trip.paymentMethod}</div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setSelectedTrip(trip)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Statement</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* RIDER STATEMENT MODAL */}
      {selectedTrip && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedTrip(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white">Bigo Rider</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-900 font-mono">
                  Payout Slip
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrip(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-zinc-400 mb-4 flex justify-between">
              <span>Trip ID: {selectedTrip.id}</span>
              <span>{selectedTrip.date} • {selectedTrip.time}</span>
            </div>

            <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800/80 mb-4 flex flex-col gap-2 text-xs">
              <div className="flex justify-between text-zinc-300">
                <span>Trip Distance</span>
                <span className="font-semibold text-white">{selectedTrip.distanceKm} km</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Gross Passenger Fare</span>
                <span className="font-semibold text-white">৳{selectedTrip.grossFareTaka}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Platform Commission (15%)</span>
                <span>-৳{Math.round(selectedTrip.grossFareTaka * 0.15)}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Captain Net Share (85%)</span>
                <span className="font-semibold text-white">৳{selectedTrip.riderEarningsTaka}</span>
              </div>
              {selectedTrip.tipTaka > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Passenger Tip</span>
                  <span>+৳{selectedTrip.tipTaka}</span>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-800 flex justify-between text-sm font-bold text-emerald-400">
                <span>Net Credited to Wallet</span>
                <span>৳{selectedTrip.riderEarningsTaka + selectedTrip.tipTaka} Taka</span>
              </div>
            </div>

            <div className="text-xs text-zinc-400 mb-4">
              <div className="flex justify-between py-1">
                <span>Passenger</span>
                <span className="text-white font-medium">{selectedTrip.passengerName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Settlement Method</span>
                <span className="text-white font-medium">{selectedTrip.paymentMethod}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTrip(null)}
              className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-sm transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
