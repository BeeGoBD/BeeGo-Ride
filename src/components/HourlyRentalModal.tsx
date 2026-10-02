import React from 'react';
import {
  X,
  Clock,
  Zap,
  Bike,
  ShieldCheck,
  Sparkles,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface HourlyRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HourlyRentalModal: React.FC<HourlyRentalModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in select-none">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl flex flex-col gap-4 border border-zinc-200 animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-zinc-950">Hourly EV Rental</h3>
                <span className="text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Coming Soon
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium">Self-drive electric bikes by the hour</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Preview Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50/50 to-white border border-amber-200 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-black text-amber-950">
            <Sparkles className="w-4 h-4 text-[#E6A800]" />
            <span>Freedom to Ride Across Dhaka</span>
          </div>

          <div className="space-y-2 text-xs text-zinc-600 font-medium">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Rent by 2, 4, 8, or 24 hours</strong> with flexible hourly rates starting at ৳80/hr.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Unlimited 30-second battery swaps</strong> included at all Voltx Hubs nationwide.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Smart helmet & digital lock</strong> unlocked seamlessly from your phone.</span>
            </div>
          </div>
        </div>

        {/* Launch Notice */}
        <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center gap-2.5 text-xs text-zinc-600">
          <Calendar className="w-4 h-4 text-[#E6A800] shrink-0" />
          <div className="leading-relaxed">
            <strong className="text-zinc-900">Fleet Deployment Q4 2026:</strong> Initial roll-out hubs will open in Gulshan, Banani, Dhanmondi, and Uttara.
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-4 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-95 text-black font-black text-xs transition-all shadow-xs cursor-pointer text-center"
        >
          Got It, Thanks!
        </button>
      </div>
    </div>
  );
};
