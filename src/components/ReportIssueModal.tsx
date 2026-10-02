import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Flag,
} from 'lucide-react';
import { submitIncidentReport } from '../services/adminService';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  reporterRole: 'passenger' | 'driver';
  reporterId: string;
  reporterName: string;
  reportedRole: 'passenger' | 'driver';
  reportedId: string;
  reportedName: string;
  reportedPhone?: string;
  rideId?: string;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  reporterRole,
  reporterId,
  reporterName,
  reportedRole,
  reportedId,
  reportedName,
  reportedPhone,
  rideId,
}) => {
  const driverCategories = [
    'Passenger Unresponsive / No-Show',
    'Incorrect / Inaccessible Pickup Location',
    'Safety / Behavioral Concern',
    'Refused Ride Upon Arrival',
    'Payment / Cash Dispute',
    'Other Issue',
  ];

  const passengerCategories = [
    'Driver Unresponsive / Heavy Delay',
    'Requested Extra Cash / Overcharging',
    'Unsafe Driving / Route Deviation',
    'Vehicle Condition / Missing Helmet',
    'Rude / Unprofessional Behavior',
    'Other Issue',
  ];

  const categories = reporterRole === 'driver' ? driverCategories : passengerCategories;

  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!description.trim()) {
      setErrorMessage('Please provide details about what happened.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitIncidentReport({
        reporterRole,
        reporterId,
        reporterName,
        reportedRole,
        reportedId,
        reportedName,
        reportedPhone,
        rideId,
        category: selectedCategory,
        description: description.trim(),
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setDescription('');
        onClose();
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in select-none">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl flex flex-col gap-4 border border-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Flag className="w-4 h-4 fill-rose-600 text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-950">Report an Incident</h3>
              <p className="text-[10px] text-zinc-500 font-medium">
                Against {reportedRole === 'driver' ? 'Captain' : 'Passenger'}: <strong>{reportedName}</strong>
              </p>
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

        {isSuccess ? (
          <div className="py-6 flex flex-col items-center text-center gap-2 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-black text-zinc-900">Report Filed Successfully</h4>
            <p className="text-xs text-zinc-500 max-w-[260px] leading-relaxed">
              Our safety review team will audit this report and take appropriate action.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Category Select */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-zinc-700">Select Issue Category</label>
              <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`py-2 px-3 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer border ${
                      selectedCategory === cat
                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Description Textarea */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-zinc-700">Describe What Happened</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Give details about the incident so our support agents can review fairly..."
                required
                className="w-full p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none text-xs text-black placeholder:text-zinc-400 resize-none font-medium"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Incident...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Submit Incident Report</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
