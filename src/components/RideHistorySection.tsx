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
  Flag,
} from 'lucide-react';
import { RideRequest } from '../types';
import { RATE_PER_KM_TAKA, getRealTripHistory, fetchAndSyncTripHistory, StoredRealTrip } from '../services/rideSync';
import { ReportIssueModal } from './ReportIssueModal';

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
  driverPhone?: string;
  paymentMethod: string;
  status: 'completed' | 'cancelled';
  cancellationReason?: string;
}

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
  const [vehicleFilter, setVehicleFilter] = useState<'bike' | 'car' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<HistoryRideItem | null>(null);
  const [reportingTrip, setReportingTrip] = useState<HistoryRideItem | null>(null);

  const formatStoredTrips = (realHistory: StoredRealTrip[]): HistoryRideItem[] => {
    if (!realHistory || realHistory.length === 0) return [];
    return realHistory.map((h, i) => {
      const isCancelled = h.status === 'cancelled';
      return {
        id: h.id || `real-${i}`,
        date: h.date || new Date(h.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        time: h.time || new Date(h.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        pickup: h.pickup,
        dropoff: h.dropoff,
        distanceKm: h.distanceKm || 1,
        fareTaka: isCancelled ? 0 : (h.fareTaka || h.finalFareTaka || 0),
        vehicleType: (h.vehicleType as 'bike' | 'car') || 'bike',
        tierName: h.tierName || (h.vehicleType === 'car' ? 'Comfort AC' : 'Bee Moto'),
        ratePerKm: h.ratePerKm || RATE_PER_KM_TAKA,
        vehicleModel: h.vehicleModel || 'Voltx Eco Electric',
        plateNumber: h.plateNumber || 'Dhaka Metro 45-8921',
        driverName: h.driverName || 'Captain Tanvir',
        driverRating: h.driverRating || 4.9,
        driverPhone: h.driverPhone,
        paymentMethod: isCancelled ? 'No Charge' : (h.paymentMethod ? h.paymentMethod.toUpperCase() : 'Cash'),
        status: isCancelled ? 'cancelled' : 'completed',
        cancellationReason: h.cancellationReason || (isCancelled ? 'Cancelled by passenger' : undefined),
      };
    });
  };

  const [trips, setTrips] = useState<HistoryRideItem[]>(() => formatStoredTrips(getRealTripHistory()));
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  useEffect(() => {
    // Initial sync with backend server
    setTrips(formatStoredTrips(getRealTripHistory()));
    fetchAndSyncTripHistory().then((synced) => {
      if (synced && synced.length > 0) {
        setTrips(formatStoredTrips(synced));
      }
    });

    const handleUpdate = () => {
      fetchAndSyncTripHistory().then((synced) => {
        setTrips(formatStoredTrips(synced));
      });
    };

    window.addEventListener('beego:trip_history_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('beego:trip_history_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [activeRide?.status]);

  const filteredTrips = trips.filter((t) => {
    const matchesVehicle = vehicleFilter === 'all' || t.vehicleType === vehicleFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesVehicle && matchesStatus;
  });

  const isOngoing =
    activeRide &&
    (activeRide.status === 'requested' ||
      activeRide.status === 'accepted' ||
      activeRide.status === 'arrived_at_pickup' ||
      activeRide.status === 'in_transit');

  return (
    <div className="w-full flex-1 flex flex-col p-4 select-none pb-28 bg-[#F8F9FA] text-[#1A1A1A] overflow-y-auto no-scrollbar gap-3.5">
      {/* 1. Header */}
      <div className="flex items-center justify-between pt-1 pb-2 border-b border-zinc-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#F5C518] text-black flex items-center justify-center shadow-xs">
            <Clock className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#1A1A1A]">Activity</h1>
            <p className="text-[11px] text-zinc-500 font-medium">Your ongoing, completed and cancelled trips</p>
          </div>
        </div>

        {isOngoing && (
          <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            1 In Progress
          </span>
        )}
      </div>

      {/* 2. ONGOING RIDE CARD (if active) */}
      {isOngoing && activeRide && (
        <div className="p-4 rounded-3xl bg-white border-2 border-[#F5C518] shadow-lg shadow-amber-500/10 flex flex-col gap-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black text-[#1A1A1A] uppercase tracking-wide">
                Ongoing Ride ({activeRide.status.replace(/_/g, ' ')})
              </span>
            </div>
            <span className="text-xs font-mono font-black text-[#E6A800]">
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
            <div className="p-2.5 rounded-2xl bg-[#F8F9FA] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-zinc-900 text-[#F5C518] flex items-center justify-center">
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

      {/* 3. FILTER TABS (Vehicle + Status) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400">
            Trip History
          </h2>

          <div className="flex items-center gap-1 p-0.5 bg-zinc-200/70 rounded-xl">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              Completed
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('cancelled')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                statusFilter === 'cancelled'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-rose-600'
              }`}
            >
              Cancelled
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setVehicleFilter('all')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
              vehicleFilter === 'all'
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            All Vehicles
          </button>
          <button
            type="button"
            onClick={() => setVehicleFilter('bike')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              vehicleFilter === 'bike'
                ? 'bg-[#F5C518] text-black border-[#F5C518] shadow-xs'
                : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <Bike className="w-3 h-3" />
            <span>Moto</span>
          </button>
          <button
            type="button"
            onClick={() => setVehicleFilter('car')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              vehicleFilter === 'car'
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <Car className="w-3 h-3" />
            <span>Sedan</span>
          </button>
        </div>
      </div>

      {/* 4. PAST TRIPS LIST */}
      <div className="space-y-3">
        {filteredTrips.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-zinc-200 text-zinc-400 text-xs">
            No {statusFilter !== 'all' ? statusFilter : ''} {vehicleFilter !== 'all' ? vehicleFilter : ''} trips found.
          </div>
        ) : (
          filteredTrips.map((trip) => {
            const isCancelled = trip.status === 'cancelled';
            return (
              <div
                key={trip.id}
                className={`p-4 rounded-3xl bg-white border shadow-xs transition-all flex flex-col gap-3 group ${
                  isCancelled
                    ? 'border-zinc-200 hover:border-rose-300 bg-gradient-to-br from-white to-zinc-50/50'
                    : 'border-zinc-200/90 hover:border-[#F5C518] hover:shadow-md'
                }`}
              >
                {/* Top row: Date, Vehicle, Fare / Status */}
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isCancelled
                          ? 'bg-rose-50 text-rose-500'
                          : 'bg-[#FFF9E6] text-[#E6A800]'
                      }`}
                    >
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
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {trip.date} • {trip.time}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-black font-mono block ${
                        isCancelled ? 'text-zinc-400 line-through' : 'text-[#1A1A1A]'
                      }`}
                    >
                      ৳{trip.fareTaka}
                    </span>
                    {isCancelled ? (
                      <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md inline-block">
                        Cancelled
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-bold">
                        Completed • {trip.paymentMethod}
                      </span>
                    )}
                  </div>
                </div>

                {/* Route snippet */}
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center gap-2 text-zinc-500 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">{trip.pickup}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-900 font-bold truncate">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isCancelled ? 'bg-zinc-400' : 'bg-[#F5C518]'}`} />
                    <span className="truncate">{trip.dropoff}</span>
                  </div>
                </div>

                {/* Cancellation Reason note if cancelled */}
                {isCancelled && trip.cancellationReason && (
                  <div className="px-2.5 py-1.5 rounded-xl bg-zinc-50 border border-zinc-100 text-[11px] text-zinc-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">Reason: {trip.cancellationReason}</span>
                  </div>
                )}

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
                      title={isCancelled ? "View Details" : "View Receipt"}
                    >
                      <Receipt className="w-4 h-4" />
                    </button>

                    {onRebookRide && (
                      <button
                        type="button"
                        onClick={() => onRebookRide(trip.dropoff)}
                        className="px-3 py-1.5 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-[11px] transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                        <span>{isCancelled ? 'Rebook Ride' : 'Request Again'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. RECEIPT DETAILS MODAL */}
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

            <div className="text-center py-2.5 bg-[#F8F9FA] rounded-2xl border border-zinc-200/60">
              <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 block">
                {selectedReceipt.status === 'cancelled' ? 'Trip Status' : 'Total Paid'}
              </span>
              <span className={`text-2xl font-black ${selectedReceipt.status === 'cancelled' ? 'text-rose-600' : 'text-[#1A1A1A]'}`}>
                {selectedReceipt.status === 'cancelled' ? 'Cancelled' : `৳${selectedReceipt.fareTaka}`}
              </span>
              <span className={`text-[11px] font-bold block mt-0.5 ${selectedReceipt.status === 'cancelled' ? 'text-rose-500' : 'text-emerald-600'}`}>
                {selectedReceipt.status === 'cancelled'
                  ? (selectedReceipt.cancellationReason || 'No fee charged to account')
                  : 'Paid in Cash to Captain'}
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

            {/* Report Issue Button for past completed trip */}
            <button
              type="button"
              onClick={() => {
                const target = selectedReceipt;
                setSelectedReceipt(null);
                setReportingTrip(target);
              }}
              className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
            >
              <Flag className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
              <span>Report Issue with this Trip</span>
            </button>
          </div>
        </div>
      )}

      {/* Report Incident Modal */}
      {reportingTrip && (
        <ReportIssueModal
          isOpen={true}
          onClose={() => setReportingTrip(null)}
          reporterRole="passenger"
          reporterId="passenger"
          reporterName="Passenger"
          reportedRole="driver"
          reportedId={reportingTrip.plateNumber}
          reportedName={reportingTrip.driverName}
          rideId={reportingTrip.id}
        />
      )}
    </div>
  );
};
