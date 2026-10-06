import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  Check,
  Clock,
  MapPin,
  UserX,
  HelpCircle,
  PhoneOff,
  Navigation,
  Sparkles,
} from 'lucide-react';

interface CancelRideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (reason: string) => void;
  driverName?: string;
  vehicleModel?: string;
}

export const CANCEL_REASONS = [
  {
    id: 'booked_mistake',
    label: 'Mistake ride / Booked by mistake',
    description: 'Accidental click or tested the app',
    icon: HelpCircle,
  },
  {
    id: 'change_plans',
    label: 'Change my mind / No longer need a ride',
    description: 'My destination, schedule, or plans changed',
    icon: AlertTriangle,
  },
  {
    id: 'too_long',
    label: 'Too much time requested / Captain taking too long',
    description: 'Wait time is longer than estimated',
    icon: Clock,
  },
  {
    id: 'wrong_way',
    label: 'Captain heading wrong way or not moving',
    description: 'Driver is moving away from the pickup spot',
    icon: Navigation,
  },
  {
    id: 'driver_asked',
    label: 'Captain asked me to cancel',
    description: 'Driver called or messaged requesting cancellation',
    icon: PhoneOff,
  },
  {
    id: 'wrong_location',
    label: 'Wrong pickup or dropoff location',
    description: 'Need to rebook with the correct address',
    icon: MapPin,
  },
  {
    id: 'found_alternative',
    label: 'Found alternative transportation',
    description: 'Already got another vehicle or ride',
    icon: UserX,
  },
];

export const CancelRideModal: React.FC<CancelRideModalProps> = ({
  isOpen,
  onClose,
  onConfirmCancel,
  driverName = 'Captain',
  vehicleModel,
}) => {
  const [selectedReasonId, setSelectedReasonId] = useState<string>('booked_mistake');
  const [customNote, setCustomNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setIsSubmitting(true);
    const chosen = CANCEL_REASONS.find((r) => r.id === selectedReasonId)?.label || 'Cancelled by passenger';
    const finalReason = customNote.trim() ? `${chosen} (${customNote.trim()})` : chosen;
    setTimeout(() => {
      onConfirmCancel(finalReason);
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/75 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-250">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold shadow-xs">
              <AlertTriangle className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900 leading-tight">Cancel Ride</h2>
              <p className="text-[11px] text-zinc-500 font-medium">Why do you need to cancel this trip?</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-200/70 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 cursor-pointer transition-colors active:scale-95"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Informational banner */}
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-950 flex items-start gap-2.5 text-xs">
          <span className="text-base leading-none">⚠️</span>
          <div className="text-[11px] leading-relaxed">
            <strong>{driverName}</strong> {vehicleModel ? `(${vehicleModel})` : ''} is assigned to your trip. There is no cancellation fee if cancelled early.
          </div>
        </div>

        {/* Reason options list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block px-1">
            Select Cancellation Reason (Uber / Pathao)
          </span>

          {CANCEL_REASONS.map((reason) => {
            const Icon = reason.icon;
            const isSelected = selectedReasonId === reason.id;
            return (
              <div
                key={reason.id}
                onClick={() => setSelectedReasonId(reason.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#FFF9E6] border-[#F5C518] shadow-xs ring-1 ring-[#F5C518]/50'
                    : 'bg-white border-zinc-200/90 hover:border-zinc-300 hover:bg-zinc-50/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-[#F5C518] text-black font-bold'
                        : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-zinc-900 block truncate leading-tight">
                      {reason.label}
                    </span>
                    <span className="text-[10px] text-zinc-500 block truncate mt-0.5">
                      {reason.description}
                    </span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'border-[#F5C518] bg-[#F5C518]'
                      : 'border-zinc-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3] text-black" />}
                </div>
              </div>
            );
          })}

          {/* Optional custom comment */}
          <div className="pt-2">
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Additional comment or note (optional)..."
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#F5C518] font-medium"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-100 bg-white flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition-colors cursor-pointer text-center active:scale-98"
          >
            Keep Ride
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all shadow-md shadow-rose-600/25 cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
};
