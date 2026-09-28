import React, { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  CheckCircle2,
  Bike,
  Car,
  Receipt,
  RotateCcw,
  Star,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  X,
  FileText,
  Copy,
  Check,
  Banknote,
  AlertCircle,
  Navigation,
} from 'lucide-react';
import { RideRequest } from '../types';
import { RATE_PER_KM_TAKA, getRealTripHistory, StoredRealTrip } from '../services/rideSync';

export interface HistoryRideItem {
  id: string;
  date: string;
  time: string;
  pickup: string;
  dropoff: string;
  distanceKm: number;
  fareTaka: number;
  vehicleType: 'bike' | 'car';
  tierName: string;
  ratePerKm: number;
  vehicleModel: string;
  plateNumber: string;
  driverName: string;
  driverRating: number;
  paymentMethod: string;
  status: 'completed';
}

const DEFAULT_PAST_TRIPS: HistoryRideItem[] = [
  {
    id: 'tr-001',
    date: 'Today, 27 Sep',
    time: '02:15 PM',
    pickup: 'Gulshan 2 Circle, Dhaka',
    dropoff: 'Banani 11, Block D, Dhaka',
    distanceKm: 2.4,
    fareTaka: 168,
    vehicleType: 'bike',
    tierName: 'Bee Moto',
    ratePerKm: 70,
    vehicleModel: 'Voltx Eco Electric (Green)',
    plateNumber: 'Dhaka Metro-Ha 45-8921',
    driverName: 'Rafiqul Islam',
    driverRating: 4.9,
    paymentMethod: 'Cash',
    status: 'completed',
  },
  {
    id: 'tr-002',
    date: 'Yesterday, 26 Sep',
    time: '06:40 PM',
    pickup: 'Dhanmondi 27 (Rangs Square)',
    dropoff: 'Kawran Bazar Metro, Dhaka',
    distanceKm: 4.1,
    fareTaka: 287,
    vehicleType: 'bike',
    tierName: 'Bee Moto',
    ratePerKm: 70,
    vehicleModel: 'Voltx Speed 2.0 (Yellow)',
    plateNumber: 'Dhaka Metro-Ha 78-1204',
    driverName: 'Kamal Hossain',
    driverRating: 4.8,
    paymentMethod: 'Cash',
    status: 'completed',
  },
  {
    id: 'tr-003',
    date: '24 Sep 2026',
    time: '11:10 AM',
    pickup: 'Uttara Sector 3 (Jashimuddin Ave)',
    dropoff: 'Hazrat Shahjalal Airport Terminal 1',
    distanceKm: 3.5,
    fareTaka: 245,
    vehicleType: 'car',
    tierName: 'Comfort AC',
    ratePerKm: 70,
    vehicleModel: 'Toyota Axio AC Sedan',
    plateNumber: 'Dhaka Metro-Ga 23-4512',
    driverName: 'Tariqul Alam',
    driverRating: 5.0,
    paymentMethod: 'Cash',
    status: 'completed',
  },
];

interface RideHistorySectionProps {
  onRebookRide?: (dropoffText: string) => void;
  activeRide?: RideRequest | null;
  onCancelRide?: () => void;
  onViewLiveTracking?: () => void;
}

export const RideHistorySection: React.FC<RideHistorySectionProps> = ({
  onRebookRide,
  activeRide,
  onCancelRide,
  onViewLiveTracking,
}) => {
  const [vehicleFilter, setVehicleFilter] = useState<'bike' | 'car' | 'all'>('bike');
  const [selectedReceipt, setSelectedReceipt] = useState<HistoryRideItem | null>(null);
  const [trips, setTrips] = useState<HistoryRideItem[]>(DEFAULT_PAST_TRIPS);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  useEffect(() => {
    const realHistory = getRealTripHistory();
    if (realHistory && realHistory.length > 0) {
      const mapped: HistoryRideItem[] = realHistory.map((h, i) => ({
        id: h.id || `real-${i}`,
        date: new Date(h.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        time: new Date(h.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        pickup: h.pickup,
        dropoff: h.dropoff,
        distanceKm: h.distanceKm,
        fareTaka: h.fareTaka,
        vehicleType: 'bike',
        tierName: 'Bee Moto',
        ratePerKm: 70,
        vehicleModel: 'Voltx Eco Electric',
        plateNumber: 'Dhaka Metro-Ha 55-9012',
        driverName: h.driverName || 'Md. Jahangir',
        driverRating: h.driverRating || 4.9,
        paymentMethod: 'Cash',
        status: 'completed',
      }));
      setTrips([...mapped, ...DEFAULT_PAST_TRIPS]);
    }
  }, []);

  const filteredTrips = trips.filter((t) => {
    if (vehicleFilter === 'all') return true;
    return t.vehicleType === vehicleFilter;
  });

  const isOngoing =
    activeRide &&
    (activeRide.status === 'requested' ||
      activeRide.status === 'accepted' ||
      activeRide.status === 'arrived_at_pickup' ||
      activeRide.status === 'in_transit');

  return (
    <div className="w-full h-full min-h-screen bg-[#F8F9FA] text-[#1A1A1A] flex flex-col p-5 select-none max-w-[430px] mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 pt-1 border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#F5C518] flex items-center justify-center text-black">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#1A1A1A]">Activity</h1>
            <p className="text-[11px] text-zinc-500">Your ongoing and completed trips</p>
          </div>
        </div>

        {isOngoing && (
          <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            1 In Progress
          </span>
        )}
      </div>

      {/* 1. ONGOING RIDE CARD (if active) */}
      {isOngoing && activeRide && (
        <div className="mt-4 p-4 rounded-3xl bg-white border-2 border-[#F5C518] shadow-lg shadow-amber-500/10 flex flex-col gap-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black text-[#1A1A1A] uppercase tracking-wide">
                Ongoing Ride ({activeRide.status.replace(/_/g, ' ')})
              </span>
            </div>
            <span className="text-xs font-black text-[#E6A800]">
              ৳{activeRide.fareTaka} Cash
            </span>
          </div>

          {/* Locations */}
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-2 text-zinc-600 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-medium truncate">{activeRide.pickup?.formatted}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-900 font-bold truncate">
              <span className="w-2 h-2 rounded-full bg-[#F5C518] shrink-0" />
              <span className="truncate">{activeRide.dropoff?.formatted}</span>
            </div>
          </div>

          {/* Rider Details */}
          {(activeRide.driverDetails || activeRide.riderId) && (
            <div className="p-2.5 rounded-xl bg-[#F8F9FA] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 text-[#F5C518] flex items-center justify-center">
                  <Bike className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-zinc-900 block">
                    {activeRide.driverDetails?.name || 'Voltx Captain'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {activeRide.driverDetails?.phone || activeRide.riderId || 'Assigned Driver'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[#E6A800] font-black text-xs">
                <Star className="w-3.5 h-3.5 fill-[#F5C518] text-[#F5C518]" />
                <span>{activeRide.driverDetails?.rating?.toFixed(1) || '4.9'}</span>
              </div>
            </div>
          )}

          {/* Actions: View Tracking / Cancel */}
          <div className="flex items-center gap-2 pt-1">
            {onViewLiveTracking && (
              <button
                type="button"
                onClick={onViewLiveTracking}
                className="flex-1 py-2.5 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>View Live Ride</span>
              </button>
            )}

            {onCancelRide && (
              <button
                type="button"
                onClick={onCancelRide}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-rose-50 text-zinc-700 hover:text-rose-700 border border-zinc-200 hover:border-rose-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel Ride
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. FILTER TABS (Bike is default per prompt!) */}
      <div className="mt-4 flex items-center justify-between border-b border-zinc-200 pb-2">
        <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400">
          Past Trips
        </h2>

        <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl">
          <button
            type="button"
            onClick={() => setVehicleFilter('bike')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              vehicleFilter === 'bike'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-500 hover:text-black'
            }`}
          >
            Bike
          </button>
          <button
            type="button"
            onClick={() => setVehicleFilter('car')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              vehicleFilter === 'car'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-500 hover:text-black'
            }`}
          >
            Car
          </button>
          <button
            type="button"
            onClick={() => setVehicleFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              vehicleFilter === 'all'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-500 hover:text-black'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* 3. PAST TRIPS LIST */}
      <div className="mt-3 flex flex-col gap-3">
        {filteredTrips.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-zinc-200 text-zinc-400 text-xs">
            No completed {vehicleFilter} trips found.
          </div>
        ) : (
          filteredTrips.map((trip) => (
            <div
              key={trip.id}
              className="p-4 rounded-3xl bg-white border border-zinc-200/90 shadow-sm hover:border-[#F5C518] hover:shadow-md transition-all flex flex-col gap-3"
            >
              {/* Top row: Date, Vehicle, Fare */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FFF9E6] text-[#E6A800] flex items-center justify-center">
                    {trip.vehicleType === 'bike' ? (
                      <Bike className="w-4 h-4" />
                    ) : (
                      <Car className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-black text-[#1A1A1A] block">
                      {trip.tierName}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {trip.date} • {trip.time}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-[#1A1A1A] block">
                    ৳{trip.fareTaka}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    Completed • {trip.paymentMethod}
                  </span>
                </div>
              </div>

              {/* Route snippet */}
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center gap-2 text-zinc-500 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">{trip.pickup}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-900 font-bold truncate">
                  <span className="w-2 h-2 rounded-full bg-[#F5C518] shrink-0" />
                  <span className="truncate">{trip.dropoff}</span>
                </div>
              </div>

              {/* Rider details & Request Again action button */}
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <span>Captain: <strong className="text-zinc-800">{trip.driverName}</strong></span>
                  <span className="flex items-center text-[#E6A800] font-bold">
                    <Star className="w-3 h-3 fill-[#F5C518] inline ml-1" />
                    {trip.driverRating}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(trip)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                    title="View Receipt"
                  >
                    <Receipt className="w-4 h-4" />
                  </button>

                  {onRebookRide && (
                    <button
                      type="button"
                      onClick={() => onRebookRide(trip.dropoff)}
                      className="px-3 py-1.5 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-[11px] transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                      <span>Request Again</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. RECEIPT DETAILS MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
          <div className="w-full max-w-[380px] bg-white rounded-3xl p-5 shadow-2xl border border-zinc-200 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#E6A800]" />
                <h3 className="text-sm font-black text-[#1A1A1A]">Ride Statement</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-2 bg-[#F8F9FA] rounded-2xl border border-zinc-200/60">
              <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 block">
                Total Paid
              </span>
              <span className="text-2xl font-black text-[#1A1A1A]">
                ৳{selectedReceipt.fareTaka}
              </span>
              <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">
                Paid in Cash to Captain
              </span>
            </div>

            <div className="flex flex-col gap-2 text-xs text-zinc-600">
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span>Trip Distance</span>
                <span className="font-bold text-zinc-900">{selectedReceipt.distanceKm} km</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span>Rate per KM</span>
                <span className="font-bold text-zinc-900">৳{selectedReceipt.ratePerKm} / km</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span>Base Fare</span>
                <span className="font-bold text-zinc-900">৳{selectedReceipt.fareTaka}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span>Surge Fee</span>
                <span className="font-bold text-emerald-600">৳0 (Flat Guarantee)</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Captain</span>
                <span className="font-bold text-zinc-900">{selectedReceipt.driverName}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCopiedReceipt(true);
                setTimeout(() => setCopiedReceipt(false), 2000);
              }}
              className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedReceipt ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Statement Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Statement Ref</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
