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
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  X,
  Download,
  FileText,
  CheckSquare,
  Square,
  Share2,
  Copy,
  Printer,
  Sparkles,
  Layers,
  SlidersHorizontal,
  TrendingUp,
  QrCode,
  Calendar,
  ExternalLink,
  Check,
  Banknote,
  Navigation,
} from 'lucide-react';
import { RATE_PER_KM_TAKA, getRealTripHistory, REAL_TRIP_HISTORY_KEY, StoredRealTrip } from '../services/rideSync';

export interface HistoryRideItem {
  id: string;
  date: string;
  time: string;
  pickup: string;
  dropoff: string;
  distanceKm: number;
  fareTaka: number;
  vehicleType: 'bike' | 'car';
  tier: 'select' | 'moto' | 'sedan';
  tierName: string;
  ratePerKm: number;
  vehicleModel: string;
  plateNumber: string;
  driverName: string;
  driverRating: number;
  paymentMethod: string;
  transactionRef: string;
  vatTaka: number;
  status: 'completed';
}

function mapStoredToHistoryItem(item: StoredRealTrip): HistoryRideItem {
  const vat = Math.round(item.fareTaka * 0.05);
  return {
    id: item.id,
    date: item.date,
    time: item.time,
    pickup: item.pickup,
    dropoff: item.dropoff,
    distanceKm: item.distanceKm,
    fareTaka: item.fareTaka,
    vehicleType: item.vehicleType || 'bike',
    tier: item.tier || 'moto',
    tierName: item.tierName || 'Beego Moto',
    ratePerKm: item.ratePerKm || RATE_PER_KM_TAKA,
    vehicleModel: item.vehicleModel,
    plateNumber: item.plateNumber,
    driverName: item.driverName,
    driverRating: item.driverRating,
    paymentMethod:
      item.paymentMethod === 'bkash'
        ? 'bKash Wallet'
        : item.paymentMethod === 'nagad'
        ? 'Nagad Wallet'
        : item.paymentMethod === 'rocket'
        ? 'Rocket DBBL'
        : 'Cash on Arrival',
    transactionRef: item.transactionRef,
    vatTaka: vat,
    status: 'completed',
  };
}

// Helper: Download trips as CSV
export function exportTripsToCsv(trips: HistoryRideItem[], filename = 'beego-trips-statement.csv') {
  const headers = [
    'Trip ID',
    'Date',
    'Time',
    'Service Tier',
    'Pickup Address',
    'Drop-off Address',
    'Distance (km)',
    'Rate per km (BDT)',
    'Gross Fare (BDT)',
    'Govt VAT (BDT)',
    'Payment Method',
    'Transaction Reference',
    'Captain Name',
    'Captain Rating',
    'Vehicle Model',
    'Registration Plate',
    'Status',
  ];

  const escapeCsv = (str: string | number) => `"${String(str).replace(/"/g, '""')}"`;

  const rows = trips.map((t) => [
    escapeCsv(t.id),
    escapeCsv(t.date),
    escapeCsv(t.time),
    escapeCsv(t.tierName),
    escapeCsv(t.pickup),
    escapeCsv(t.dropoff),
    t.distanceKm,
    t.ratePerKm,
    t.fareTaka,
    t.vatTaka,
    escapeCsv(t.paymentMethod),
    escapeCsv(t.transactionRef),
    escapeCsv(t.driverName),
    t.driverRating,
    escapeCsv(t.vehicleModel),
    escapeCsv(t.plateNumber),
    escapeCsv(t.status.toUpperCase()),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface RideHistorySectionProps {
  onBookAgain?: (pickup: string, dropoff: string) => void;
}

export const RideHistorySection: React.FC<RideHistorySectionProps> = ({ onBookAgain }) => {
  const [trips, setTrips] = useState<HistoryRideItem[]>(() => {
    return getRealTripHistory().map(mapStoredToHistoryItem);
  });

  useEffect(() => {
    const refreshTrips = () => {
      setTrips(getRealTripHistory().map(mapStoredToHistoryItem));
    };
    refreshTrips();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === REAL_TRIP_HISTORY_KEY) {
        refreshTrips();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const [filterType, setFilterType] = useState<'all' | 'select' | 'moto' | 'sedan'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<HistoryRideItem | null>(null);

  // Multi-select & Batch Export State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [showBatchStatementModal, setShowBatchStatementModal] = useState(false);

  const filteredRides = trips.filter((ride) => {
    if (filterType !== 'all' && ride.tier !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        ride.pickup.toLowerCase().includes(q) ||
        ride.dropoff.toLowerCase().includes(q) ||
        ride.driverName.toLowerCase().includes(q) ||
        ride.id.toLowerCase().includes(q) ||
        ride.tierName.toLowerCase().includes(q) ||
        ride.vehicleModel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalSpent = filteredRides.reduce((acc, r) => acc + r.fareTaka, 0);
  const totalKm = filteredRides.reduce((acc, r) => acc + r.distanceKm, 0);
  const totalVat = filteredRides.reduce((acc, r) => acc + r.vatTaka, 0);

  // Selected trips calculation
  const selectedTrips = trips.filter((r) => selectedIds.includes(r.id));
  const selectedTotalFare = selectedTrips.reduce((acc, r) => acc + r.fareTaka, 0);
  const selectedTotalKm = selectedTrips.reduce((acc, r) => acc + r.distanceKm, 0);

  const handleToggleSelectTrip = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredRides.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRides.map((r) => r.id));
    }
  };

  const handleExportSelectedCsv = () => {
    const targets = selectedTrips.length > 0 ? selectedTrips : filteredRides;
    exportTripsToCsv(
      targets,
      `beego-${selectedTrips.length > 0 ? 'selected' : 'all'}-trips-statement.csv`
    );
  };

  const handleCopySummary = (text: string, label = 'Copied to clipboard') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedNotification(label);
      setTimeout(() => setCopiedNotification(null), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="ride-history-section" className="w-full max-w-4xl mx-auto px-4 py-6 selection:bg-zinc-800">
      {/* 1. MILLION-DOLLAR EXECUTIVE HEADER */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-900">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Trip Archive & Invoices
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] uppercase font-mono tracking-widest text-amber-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Verified
              </span>
            </div>
            <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
              Verified travel records, digital receipts, and expense statements.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="toggle-select-mode-btn"
              type="button"
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                if (isSelectMode) setSelectedIds([]);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                isSelectMode
                  ? 'bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-400/20'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {isSelectMode ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Selecting ({selectedIds.length})</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Select Trips</span>
                </>
              )}
            </button>

            <button
              id="export-all-csv-btn"
              type="button"
              onClick={() => exportTripsToCsv(trips, 'beego-full-statement.csv')}
              disabled={trips.length === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed text-black flex items-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
              title="Download full CSV archive of all trips"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              id="open-statement-modal-btn"
              type="button"
              onClick={() => setShowBatchStatementModal(true)}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              title="View Corporate Statement Summary"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FINANCIAL INTELLIGENCE KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900 shadow-sm relative overflow-hidden group">
            <div className="text-[11px] font-medium text-zinc-400 mb-1">Total Travel Volume</div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              ৳{totalSpent.toLocaleString()}
            </div>
            <div className="text-[10px] text-amber-400 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Flat ৳70-৳95/km</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900 shadow-sm">
            <div className="text-[11px] font-medium text-zinc-400 mb-1">Odometer Tracked</div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {totalKm.toFixed(1)} <span className="text-xs font-normal text-zinc-500">km</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Satellite GPS audit</div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900 shadow-sm">
            <div className="text-[11px] font-medium text-zinc-400 mb-1">Govt VAT / SD</div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
              ৳{totalVat}
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">100% Tax Compliant</div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900 shadow-sm">
            <div className="text-[11px] font-medium text-zinc-400 mb-1">Trips Completed</div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {filteredRides.length} <span className="text-xs font-normal text-zinc-500">rides</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Zero surge markup</div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROL TOWER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Search bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="trip-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search destination, trip ID, or Captain..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tier filter tabs */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({trips.length})
          </button>

          {/* Beego Select Filter */}
          <button
            type="button"
            onClick={() => setFilterType('select')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterType === 'select'
                ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Beego Select</span>
          </button>

          {/* Beego Moto Filter */}
          <button
            type="button"
            onClick={() => setFilterType('moto')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterType === 'moto'
                ? 'bg-amber-400 text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Moto</span>
          </button>

          {/* Beego Sedan Filter */}
          <button
            type="button"
            onClick={() => setFilterType('sedan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterType === 'sedan'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Sedan</span>
          </button>
        </div>
      </div>

      {/* Select All Bar when in select mode */}
      {isSelectMode && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-bold text-white hover:text-amber-400 flex items-center gap-1.5 cursor-pointer"
            >
              {selectedIds.length === filteredRides.length ? (
                <CheckSquare className="w-4 h-4 text-amber-400" />
              ) : (
                <Square className="w-4 h-4 text-zinc-500" />
              )}
              <span>
                {selectedIds.length === filteredRides.length
                  ? 'Deselect All'
                  : `Select All Filtered (${filteredRides.length})`}
              </span>
            </button>
          </div>

          <div className="text-zinc-400">
            <span>{selectedIds.length} of {filteredRides.length} selected</span>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {copiedNotification && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-white text-black text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* 3. TRIPS LIST WITH PREMIUM BREADTH */}
      <div className="flex flex-col gap-3">
        {trips.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-3xl bg-zinc-950 border border-zinc-900 text-zinc-400 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-amber-400">
              <Bike className="w-7 h-7" />
            </div>
            <div className="text-base font-bold text-white mb-1.5">No Ride History Yet</div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              All mock and demo data has been cleared. When you take your first ride with Beego Moto, your real digital receipt, road distance calculation (৳70/km), and payment details will appear here.
            </p>
            {onBookAgain && (
              <button
                type="button"
                onClick={() => onBookAgain('', '')}
                className="py-3 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-2 shadow-lg shadow-amber-400/20"
              >
                <Bike className="w-4 h-4" />
                <span>Book Your First Moto Ride</span>
              </button>
            )}
          </div>
        ) : filteredRides.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-zinc-950 border border-zinc-900 text-zinc-500">
            <FileText className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
            <div className="text-sm font-semibold text-zinc-300">No matching trips found</div>
            <div className="text-xs text-zinc-500 mt-1">Try clearing your search query or filter</div>
          </div>
        ) : (
          filteredRides.map((ride) => {
            const isSelected = selectedIds.includes(ride.id);

            return (
              <div
                key={ride.id}
                id={`trip-card-${ride.id}`}
                onClick={() => {
                  if (isSelectMode) handleToggleSelectTrip(ride.id);
                }}
                className={`rounded-2xl transition-all relative group ${
                  isSelectMode ? 'cursor-pointer' : ''
                } ${
                  isSelected
                    ? 'bg-zinc-950 border-2 border-amber-500/80 shadow-lg shadow-amber-500/5'
                    : 'bg-zinc-950 border border-zinc-900 hover:border-zinc-700/80 shadow-sm'
                } p-5`}
              >
                {/* Header Row: Tier Badge, Hash ID, Date & Fare */}
                <div className="flex items-start justify-between pb-3.5 border-b border-zinc-900/90 mb-3.5">
                  <div className="flex items-center gap-3">
                    {/* Selection Checkbox */}
                    {isSelectMode && (
                      <div className="shrink-0">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-md bg-amber-400 flex items-center justify-center text-black shadow-sm">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border border-zinc-700 bg-zinc-900 group-hover:border-zinc-500" />
                        )}
                      </div>
                    )}

                    {/* Tier badge icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        ride.tier === 'select'
                          ? 'bg-amber-400/10 text-amber-300 border-amber-500/30'
                          : ride.tier === 'moto'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      {ride.tier === 'select' ? (
                        <Sparkles className="w-5 h-5" />
                      ) : ride.tier === 'moto' ? (
                        <Bike className="w-5 h-5" />
                      ) : (
                        <Car className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                            ride.tier === 'select'
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-500/30'
                              : ride.tier === 'moto'
                              ? 'bg-zinc-800 text-zinc-200'
                              : 'bg-zinc-800 text-zinc-200'
                          }`}
                        >
                          {ride.tierName}
                        </span>

                        <span className="text-xs text-zinc-400 font-mono">{ride.id}</span>
                      </div>

                      <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                        <span className="font-medium text-zinc-300">{ride.date}</span>
                        <span className="text-zinc-600">•</span>
                        <span>{ride.time}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-500">{ride.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fare & Mileage */}
                  <div className="text-right">
                    <div className="text-lg sm:text-xl font-black text-white tracking-tight">
                      ৳{ride.fareTaka}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      {ride.distanceKm} km • ৳{ride.ratePerKm}/km
                    </div>
                  </div>
                </div>

                {/* Route Points */}
                <div className="relative pl-6 space-y-3 my-4">
                  {/* Vertical connecting dash */}
                  <div className="absolute left-2.5 top-2 bottom-2 w-px bg-zinc-800" />

                  {/* Origin */}
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-black" />
                    <div className="text-[10px] uppercase font-mono text-zinc-500">Pickup Location</div>
                    <div className="text-xs sm:text-sm font-medium text-white truncate max-w-lg">
                      {ride.pickup}
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-red-400 ring-4 ring-black" />
                    <div className="text-[10px] uppercase font-mono text-zinc-500">Destination</div>
                    <div className="text-xs sm:text-sm font-medium text-white truncate max-w-lg">
                      {ride.dropoff}
                    </div>
                  </div>
                </div>

                {/* Footer: Captain Details + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-zinc-900/90 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-300 text-xs">
                      {ride.driverName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-zinc-300 font-semibold flex items-center gap-1.5">
                        <span>Captain {ride.driverName}</span>
                        <span className="flex items-center text-amber-400 text-[11px] font-mono">
                          <Star className="w-3 h-3 fill-amber-400 inline" /> {ride.driverRating}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {ride.vehicleModel} • <span className="font-mono">{ride.plateNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Group */}
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* View Digital Receipt */}
                    <button
                      id={`view-receipt-btn-${ride.id}`}
                      type="button"
                      onClick={() => setSelectedReceipt(ride)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                      title="Inspect official itemized tax invoice"
                    >
                      <Receipt className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Itemized Receipt</span>
                    </button>

                    {/* Quick Single CSV */}
                    <button
                      type="button"
                      onClick={() => exportTripsToCsv([ride], `beego-trip-${ride.id}.csv`)}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                      title="Download single CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Re-book / Ride Again */}
                    {onBookAgain && (
                      <button
                        type="button"
                        onClick={() => onBookAgain(ride.pickup, ride.dropoff)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span className="hidden sm:inline">Ride Again</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. DOCKED BATCH SELECTION & EXPORT TOOLBAR */}
      {isSelectMode && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-700/80 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{selectedIds.length} Trips Selected</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Total ৳{selectedTotalFare.toLocaleString()} • {selectedTotalKm.toFixed(1)} km
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="export-selected-csv-btn"
              type="button"
              onClick={handleExportSelectedCsv}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Export CSV</span>
            </button>

            <button
              id="export-selected-statement-btn"
              type="button"
              onClick={() => setShowBatchStatementModal(true)}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Statement</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. MILLION-DOLLAR ITEMIZED TAX RECEIPT MODAL */}
      {selectedReceipt && (
        <div
          id="itemized-receipt-modal"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden relative my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Branding Bar */}
            <div className="p-6 bg-zinc-900/60 border-b border-zinc-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tracking-tighter text-amber-400">Beego</span>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded font-mono ${
                      selectedReceipt.tier === 'select'
                        ? 'bg-amber-400 text-black'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {selectedReceipt.tierName}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Beego Technologies Bangladesh Ltd. • BIN: 004829104-0102
                </div>
              </div>

              <button
                id="close-receipt-modal-btn"
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: High-end Typography & Verified Audit */}
            <div className="p-6 space-y-5 text-xs">
              {/* Trip Reference & Date */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900 text-zinc-400">
                <div>
                  <span className="block text-[10px] uppercase font-mono text-zinc-500">
                    Receipt & Invoice No.
                  </span>
                  <span className="font-mono font-bold text-white text-sm">
                    {selectedReceipt.id}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] uppercase font-mono text-zinc-500">
                    Issued Date & Time
                  </span>
                  <span className="text-zinc-200 font-medium">
                    {selectedReceipt.date} • {selectedReceipt.time}
                  </span>
                </div>
              </div>

              {/* Transit Itinerary Details */}
              <div className="space-y-3 p-4 rounded-2xl bg-black border border-zinc-900">
                <div>
                  <div className="text-[10px] uppercase font-mono text-amber-400 flex items-center gap-1 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Origin / Boarding Spot</span>
                  </div>
                  <div className="text-sm font-medium text-white">{selectedReceipt.pickup}</div>
                </div>

                <div className="pt-2 border-t border-zinc-900">
                  <div className="text-[10px] uppercase font-mono text-red-400 flex items-center gap-1 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span>Destination / Drop-off Spot</span>
                  </div>
                  <div className="text-sm font-medium text-white">{selectedReceipt.dropoff}</div>
                </div>
              </div>

              {/* Financial Ledger Table */}
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 divide-y divide-zinc-900">
                <div className="flex justify-between py-1.5 text-zinc-300">
                  <span>GPS Measured Distance</span>
                  <span className="font-mono font-bold text-white">
                    {selectedReceipt.distanceKm} km
                  </span>
                </div>

                <div className="flex justify-between py-1.5 text-zinc-300">
                  <span>Tier Base Rate ({selectedReceipt.tierName})</span>
                  <span className="font-mono text-white">৳{selectedReceipt.ratePerKm} / km</span>
                </div>

                <div className="flex justify-between py-1.5 text-zinc-300">
                  <span>Voyage Transit Subtotal</span>
                  <span className="font-mono text-white">
                    ৳{selectedReceipt.fareTaka - selectedReceipt.vatTaka}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 text-zinc-300">
                  <span>Bangladesh Govt VAT / SD (5%)</span>
                  <span className="font-mono text-white">৳{selectedReceipt.vatTaka}</span>
                </div>

                <div className="flex justify-between py-1.5 text-zinc-300">
                  <span>Surge / Dynamic Pricing Extortion</span>
                  <span className="font-mono font-bold text-amber-400">৳0 (Guaranteed)</span>
                </div>

                <div className="flex justify-between pt-3 text-base font-black text-white">
                  <span>Total Amount Paid</span>
                  <span className="text-amber-400">৳{selectedReceipt.fareTaka} BDT</span>
                </div>
              </div>

              {/* Captain & Transaction Audit */}
              <div className="grid grid-cols-2 gap-3 text-zinc-400 text-[11px] p-3 rounded-xl bg-zinc-900/30 border border-zinc-900">
                <div>
                  <span className="text-zinc-500 block">Payment Method</span>
                  <span className="text-white font-medium">{selectedReceipt.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Authorization Ref</span>
                  <span className="font-mono text-white text-[10px]">
                    {selectedReceipt.transactionRef}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Captain</span>
                  <span className="text-white font-medium">
                    {selectedReceipt.driverName} ({selectedReceipt.driverRating}★)
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Assigned Vehicle</span>
                  <span className="text-white font-medium">{selectedReceipt.vehicleModel}</span>
                </div>
              </div>

              {/* Action Buttons: Download PDF, CSV, Copy Summary */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  id="receipt-print-btn"
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save Tax PDF</span>
                </button>

                <button
                  id="receipt-export-csv-btn"
                  type="button"
                  onClick={() =>
                    exportTripsToCsv([selectedReceipt], `beego-receipt-${selectedReceipt.id}.csv`)
                  }
                  className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-zinc-800 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleCopySummary(
                      `BEEGO RECEIPT ${selectedReceipt.id}\nDate: ${selectedReceipt.date} ${selectedReceipt.time}\nTier: ${selectedReceipt.tierName}\nPickup: ${selectedReceipt.pickup}\nDrop-off: ${selectedReceipt.dropoff}\nDistance: ${selectedReceipt.distanceKm} km\nTotal Paid: ৳${selectedReceipt.fareTaka} BDT\nPayment: ${selectedReceipt.paymentMethod}\nCaptain: ${selectedReceipt.driverName} (${selectedReceipt.vehicleModel})`
                    )
                  }
                  className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer flex items-center justify-center"
                  title="Copy formatted receipt text"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. BATCH CORPORATE STATEMENT MODAL */}
      {showBatchStatementModal && (
        <div
          id="batch-statement-modal"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowBatchStatementModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden relative my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Statement Header */}
            <div className="p-6 bg-zinc-900/70 border-b border-zinc-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tracking-tighter text-amber-400">Beego</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                    Corporate Travel Statement
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Tax Summary for Passenger ID • Period: September 2026
                </div>
              </div>

              <button
                onClick={() => setShowBatchStatementModal(false)}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Statement Content */}
            <div className="p-6 space-y-5 text-xs">
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-black border border-zinc-900 text-center">
                <div>
                  <div className="text-zinc-500 text-[10px] uppercase">Rides Total</div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {selectedTrips.length > 0 ? selectedTrips.length : filteredRides.length}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500 text-[10px] uppercase">Total Mileage</div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {(selectedTrips.length > 0 ? selectedTotalKm : totalKm).toFixed(1)} km
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500 text-[10px] uppercase">Expenditure</div>
                  <div className="text-lg font-black text-amber-400 mt-0.5">
                    ৳{(selectedTrips.length > 0 ? selectedTotalFare : totalSpent).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Table Preview of Trips */}
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 text-[10px] uppercase font-mono">
                      <tr>
                        <th className="p-2.5">Trip ID</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Tier</th>
                        <th className="p-2.5">Distance</th>
                        <th className="p-2.5 text-right">Fare (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-zinc-300">
                      {(selectedTrips.length > 0 ? selectedTrips : filteredRides).map((t) => (
                        <tr key={t.id} className="hover:bg-zinc-900/40">
                          <td className="p-2.5 font-mono text-white">{t.id}</td>
                          <td className="p-2.5 text-zinc-400">{t.date}</td>
                          <td className="p-2.5">{t.tierName}</td>
                          <td className="p-2.5">{t.distanceKm} km</td>
                          <td className="p-2.5 text-right font-semibold text-white">৳{t.fareTaka}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={handleExportSelectedCsv}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-amber-400/20"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Download Statement CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Statement</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
