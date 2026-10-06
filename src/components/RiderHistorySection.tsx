import React, { useState, useEffect } from 'react';
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
  Calendar,
  Flag,
} from 'lucide-react';
import { RATE_PER_KM_TAKA, getRealTripHistory, fetchAndSyncTripHistory, StoredRealTrip } from '../services/rideSync';
import { ReportIssueModal } from './ReportIssueModal';

export interface RiderHistoryTrip {
  id: string;
  date: string;
  time: string;
  passengerName: string;
  passengerId: string;
  passengerPhone?: string;
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

export const RiderHistorySection: React.FC = () => {
  const formatDriverTrips = (realHistory: StoredRealTrip[]): RiderHistoryTrip[] => {
    if (!realHistory || realHistory.length === 0) return [];
    return realHistory.map((h, i) => {
      const grossFare = h.finalFareTaka || h.fareTaka || Math.round((h.distanceKm || 1) * RATE_PER_KM_TAKA);
      const earnings = h.riderEarningsTaka || Math.round(grossFare * 0.85); // 85% driver earnings
      return {
        id: h.id || `TRIP-${i + 1}`,
        date: h.date || new Date(h.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        time: h.time || new Date(h.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        passengerName: h.passengerName || 'Passenger',
        passengerId: h.passengerId || 'PAX-USER',
        passengerPhone: h.passengerPhone,
        pickup: h.pickup,
        dropoff: h.dropoff,
        distanceKm: h.actualTraveledKm || h.distanceKm,
        grossFareTaka: grossFare,
        riderEarningsTaka: earnings,
        tipTaka: 0,
        vehicleType: 'bike',
        paymentMethod: h.paymentMethod ? h.paymentMethod.toUpperCase() : 'Cash Collected',
        ratingGivenByPax: 5.0,
        status: 'completed',
      };
    });
  };

  const [trips, setTrips] = useState<RiderHistoryTrip[]>(() => formatDriverTrips(getRealTripHistory()));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<RiderHistoryTrip | null>(null);
  const [reportingTrip, setReportingTrip] = useState<RiderHistoryTrip | null>(null);

  useEffect(() => {
    // Initial sync from backend
    setTrips(formatDriverTrips(getRealTripHistory()));
    fetchAndSyncTripHistory().then((synced) => {
      if (synced && synced.length > 0) {
        setTrips(formatDriverTrips(synced));
      }
    });

    const handleUpdate = () => {
      fetchAndSyncTripHistory().then((synced) => {
        setTrips(formatDriverTrips(synced));
      });
    };

    window.addEventListener('beego:trip_history_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('beego:trip_history_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const filteredTrips = trips.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.passengerName.toLowerCase().includes(q) ||
      t.pickup.toLowerCase().includes(q) ||
      t.dropoff.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  });

  const totalEarned = trips.reduce((sum, t) => sum + t.riderEarningsTaka + t.tipTaka, 0);
  const totalKm = trips.reduce((sum, t) => sum + t.distanceKm, 0);

  return (
    <div id="rider-history-section" className="w-full flex-1 flex flex-col p-4 select-none bg-[#F8F9FA] text-[#1A1A1A] pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 pt-1 border-b border-zinc-200">
        <div>
          <h2 className="text-base font-black text-[#1A1A1A]">My Trips & Earnings</h2>
          <p className="text-[11px] text-zinc-500">Fulfilled trips at flat ৳{RATE_PER_KM_TAKA}/km</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-zinc-400 block font-medium">Total Earned</span>
          <span className="text-base font-black text-[#E6A800]">৳{totalEarned}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2 my-3">
        <div className="p-3 rounded-2xl bg-white border border-zinc-200 shadow-xs text-center">
          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Trips</span>
          <span className="text-base font-black text-[#1A1A1A] mt-0.5 block">{trips.length}</span>
        </div>
        <div className="p-3 rounded-2xl bg-white border border-zinc-200 shadow-xs text-center">
          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Distance</span>
          <span className="text-base font-black text-[#1A1A1A] mt-0.5 block">{totalKm.toFixed(1)} km</span>
        </div>
        <div className="p-3 rounded-2xl bg-white border border-zinc-200 shadow-xs text-center">
          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Avg Rating</span>
          <span className="text-base font-black text-[#E6A800] mt-0.5 block">4.98 ★</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search trips by passenger or destination..."
          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-zinc-200 rounded-2xl text-xs text-[#1A1A1A] placeholder-zinc-400 focus:outline-none focus:border-[#F5C518] shadow-xs font-medium"
        />
      </div>

      {/* Trips list */}
      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-white rounded-3xl border border-zinc-200/90 shadow-xs my-2">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/30 flex items-center justify-center text-[#E6A800] mb-3 shadow-xs">
            <Bike className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h3 className="text-sm font-black text-[#1A1A1A]">No Trips Completed Yet</h3>
          <p className="text-xs text-zinc-500 max-w-xs mt-1 leading-relaxed">
            When you go online and complete rides for passengers, your trip history, earnings, and passenger details will automatically appear here.
          </p>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-white rounded-2xl border border-zinc-200 shadow-xs my-2">
          <p className="text-xs text-zinc-500 font-medium">No trips match "{searchQuery}"</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredTrips.map((trip) => (
          <div
            key={trip.id}
            onClick={() => setSelectedTrip(trip)}
            className="p-3.5 rounded-2xl bg-white border border-zinc-200/90 hover:border-[#F5C518] shadow-xs transition-all cursor-pointer flex flex-col gap-2"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#FFF9E6] border border-[#F5C518]/30 flex items-center justify-center text-[#E6A800]">
                  <Bike className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#1A1A1A] block">
                    {trip.date} • {trip.time}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono block">
                    {trip.passengerName}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-black text-[#E6A800] block">
                  +৳{trip.riderEarningsTaka + trip.tipTaka}
                </span>
                <span className="text-[10px] text-zinc-400 block font-medium">
                  {trip.distanceKm} km
                </span>
              </div>
            </div>

            {/* Route */}
            <div className="text-[11px] space-y-1">
              <div className="flex items-center gap-2 truncate text-zinc-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{trip.pickup}</span>
              </div>
              <div className="flex items-center gap-2 truncate text-zinc-600">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                <span className="truncate">{trip.dropoff}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-[10px]">
              <span className="font-mono font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                {trip.paymentMethod}
              </span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </span>
            </div>
          </div>
        ))}
      </div>
    )}

      {/* Trip Details Modal */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
          <div className="w-full max-w-[340px] bg-white rounded-3xl p-5 shadow-2xl border border-zinc-200 flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-sm font-black text-[#1A1A1A]">Trip Details</h3>
              <button
                type="button"
                onClick={() => setSelectedTrip(null)}
                className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#E6A800] uppercase font-bold block">Earnings</span>
                <span className="text-xl font-black text-[#1A1A1A]">
                  ৳{selectedTrip.riderEarningsTaka + selectedTrip.tipTaka}
                </span>
              </div>
              <div className="text-right text-xs">
                <span className="text-zinc-500 block">Total Fare: ৳{selectedTrip.grossFareTaka}</span>
                <span className="text-zinc-500 block">Distance: {selectedTrip.distanceKm} km</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-xl bg-[#F8F9FA] border border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Passenger</span>
                <span className="font-bold text-[#1A1A1A] block">{selectedTrip.passengerName}</span>
                {selectedTrip.passengerPhone && (
                  <span className="text-[11px] text-zinc-500 font-mono block mt-0.5">{selectedTrip.passengerPhone}</span>
                )}
              </div>
              <div className="p-2 rounded-xl bg-[#F8F9FA] border border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Pickup</span>
                <span className="font-medium text-zinc-700 block">{selectedTrip.pickup}</span>
              </div>
              <div className="p-2 rounded-xl bg-[#F8F9FA] border border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Drop-off</span>
                <span className="font-medium text-zinc-700 block">{selectedTrip.dropoff}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setReportingTrip(selectedTrip);
                  setSelectedTrip(null);
                }}
                className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Flag className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                <span>Report Passenger / Incident</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTrip(null)}
                className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportingTrip && (
        <ReportIssueModal
          isOpen={true}
          onClose={() => setReportingTrip(null)}
          reporterRole="driver"
          reporterId="driver"
          reporterName="Captain (Driver)"
          reportedRole="passenger"
          reportedId={reportingTrip.passengerId}
          reportedName={reportingTrip.passengerName}
          rideId={reportingTrip.id}
        />
      )}
    </div>
  );
};
