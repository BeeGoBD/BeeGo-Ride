import React, { useState } from 'react';
import {
  Bike,
  User,
  ShieldCheck,
  Star,
  Wallet,
  PhoneCall,
  Key,
  RotateCcw,
  LogOut,
  ChevronRight,
  Copy,
  Check,
  CreditCard,
  Send,
  AlertTriangle,
  FileText,
  BadgeCheck,
  Clock,
  Sparkles,
  Lock,
  X,
  FileCheck2,
  Zap,
  Camera,
  Eye,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { RATE_PER_KM_TAKA } from '../services/rideSync';
import {
  getCurrentDriver,
  updateDriverStatus,
  DriverProfile,
  DriverVerificationStatus,
} from '../services/driverAuth';

interface RiderAccountSectionProps {
  riderId: string;
  onSwitchToPassenger: () => void;
  onReplayIntro?: () => void;
  onSignOut: () => void;
}

export const RiderAccountSection: React.FC<RiderAccountSectionProps> = ({
  riderId,
  onSwitchToPassenger,
  onReplayIntro,
  onSignOut,
}) => {
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(() => getCurrentDriver());
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const [copied, setCopied] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [withdrawAccount, setWithdrawAccount] = useState('01712-345678');
  const [withdrawAmount, setWithdrawAmount] = useState('1480');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [activeNotice, setActiveNotice] = useState<string | null>(null);

  const status = driverProfile?.verificationStatus || 'under_review';
  const isPending = status === 'under_review' || status === 'pending';

  const handleToggleStatus = (newStatus: DriverVerificationStatus) => {
    if (!driverProfile) return;
    const updated = updateDriverStatus(driverProfile.id, newStatus);
    if (updated) {
      setDriverProfile({ ...updated });
      setActiveNotice(`Status updated to: ${newStatus.toUpperCase()}`);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(riderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawSuccess(true);
    setTimeout(() => {
      setWithdrawSuccess(false);
      setShowWithdrawModal(false);
    }, 1800);
  };

  const handleItemNotice = (msg: string) => {
    setActiveNotice(msg);
    setTimeout(() => setActiveNotice(null), 2500);
  };

  return (
    <div id="rider-account-section" className="w-full flex-1 flex flex-col p-4 select-none bg-[#F8F9FA] text-[#1A1A1A] pb-28">
      {/* Notice Toast */}
      {activeNotice && (
        <div className="mb-3 p-3 rounded-2xl bg-zinc-900 text-white text-xs flex items-center justify-between shadow-lg animate-in fade-in">
          <span>{activeNotice}</span>
          <Check className="w-3.5 h-3.5 text-[#F5C518]" />
        </div>
      )}

      {/* 1. DRIVER PROFILE HEADER CARD */}
      <div className="p-4 rounded-3xl bg-white border border-zinc-200/90 shadow-sm flex items-center gap-3.5">
        <div className="relative shrink-0">
          {driverProfile?.selfieUrl ? (
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[#F5C518] shadow-sm bg-zinc-900">
              <img
                src={driverProfile.selfieUrl}
                alt="Driver Portrait"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-center text-[#E6A800]">
              <Bike className="w-7 h-7 stroke-[2.2]" />
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#F5C518] border-2 border-white flex items-center justify-center shadow-xs">
            <Check className="w-3 h-3 text-black stroke-[3]" />
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-black text-[#1A1A1A] truncate">
              {driverProfile?.name || 'Captain Tanvir'} (You)
            </h2>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              title={status}
            />
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-zinc-500 font-mono">
              {driverProfile?.phone || riderId}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="text-zinc-400 hover:text-[#E6A800] transition-colors cursor-pointer"
              title="Copy ID"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500 font-medium">
            <span className="flex items-center gap-1 text-[#E6A800] font-bold">
              <Star className="w-3 h-3 fill-[#F5C518] text-[#F5C518]" />
              {driverProfile?.rating || '5.0'}
            </span>
            <span>•</span>
            <span className="font-mono text-[11px] text-zinc-600">
              {driverProfile?.id || riderId}
            </span>
          </div>
        </div>
      </div>

      {/* 2. ACCOUNT STATUS & VERIFICATION SECTION (Required Specification) */}
      <div
        id="driver-account-status-card"
        className={`mt-3 p-4 rounded-3xl border-2 shadow-sm flex flex-col gap-3 ${
          status === 'approved'
            ? 'bg-emerald-50/70 border-emerald-300'
            : status === 'rejected'
            ? 'bg-rose-50/70 border-rose-300'
            : 'bg-amber-50/80 border-amber-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                status === 'approved'
                  ? 'bg-emerald-600 text-white'
                  : status === 'rejected'
                  ? 'bg-rose-600 text-white'
                  : 'bg-[#F5C518] text-black shadow-xs'
              }`}
            >
              {status === 'approved' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : status === 'rejected' ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 block">
                Driver Account Status
              </span>
              <span className="text-sm font-black text-zinc-900 capitalize">
                {status === 'under_review' || status === 'pending'
                  ? 'Pending / Under Review'
                  : status === 'approved'
                  ? 'Approved & Active'
                  : 'Action Required'}
              </span>
            </div>
          </div>

          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
              status === 'approved'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : status === 'rejected'
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-amber-200 text-amber-900 border-amber-300'
            }`}
          >
            {status.replace('_', ' ')}
          </span>
        </div>

        {/* Waiting Message when Pending / Under Review */}
        {isPending && (
          <p className="text-xs text-amber-950 font-semibold leading-relaxed bg-white/90 p-3 rounded-2xl border border-amber-200/80">
            “Your driver verification is still in processing. Please wait. Review usually takes 1–24 hours.”
          </p>
        )}

        {status === 'approved' && (
          <p className="text-xs text-emerald-900 font-semibold leading-relaxed bg-white/90 p-3 rounded-2xl border border-emerald-200">
            Your documents have been verified by our safety team. You can now go online and accept rides.
          </p>
        )}

        {/* Uploaded Documents Grid Preview */}
        <div className="pt-2 border-t border-zinc-200/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-700">
            <span>Submitted Verification Documents</span>
            <span className="text-[10px] font-mono text-zinc-400">
              {driverProfile?.submittedAtFormatted || 'Just now'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* NID Front Preview */}
            <div
              onClick={() =>
                driverProfile?.nidFrontUrl &&
                setPreviewImage({ url: driverProfile.nidFrontUrl, title: 'NID Card — Front Side' })
              }
              className="group relative rounded-xl border border-zinc-300 overflow-hidden bg-zinc-100 cursor-pointer aspect-4/3 flex flex-col items-center justify-center p-1 hover:border-amber-400 transition-colors"
            >
              {driverProfile?.nidFrontUrl ? (
                <img
                  src={driverProfile.nidFrontUrl}
                  alt="NID Front"
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <FileText className="w-5 h-5 text-zinc-400" />
              )}
              <span className="text-[9px] font-bold text-zinc-600 block text-center truncate mt-0.5">
                NID Front
              </span>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
                View
              </div>
            </div>

            {/* NID Back Preview */}
            <div
              onClick={() =>
                driverProfile?.nidBackUrl &&
                setPreviewImage({ url: driverProfile.nidBackUrl, title: 'NID Card — Back Side' })
              }
              className="group relative rounded-xl border border-zinc-300 overflow-hidden bg-zinc-100 cursor-pointer aspect-4/3 flex flex-col items-center justify-center p-1 hover:border-amber-400 transition-colors"
            >
              {driverProfile?.nidBackUrl ? (
                <img
                  src={driverProfile.nidBackUrl}
                  alt="NID Back"
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <FileText className="w-5 h-5 text-zinc-400" />
              )}
              <span className="text-[9px] font-bold text-zinc-600 block text-center truncate mt-0.5">
                NID Back
              </span>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
                View
              </div>
            </div>

            {/* Selfie Preview */}
            <div
              onClick={() =>
                driverProfile?.selfieUrl &&
                setPreviewImage({ url: driverProfile.selfieUrl, title: 'Driver Verified Face Selfie' })
              }
              className="group relative rounded-xl border border-zinc-300 overflow-hidden bg-zinc-100 cursor-pointer aspect-4/3 flex flex-col items-center justify-center p-1 hover:border-amber-400 transition-colors"
            >
              {driverProfile?.selfieUrl ? (
                <img
                  src={driverProfile.selfieUrl}
                  alt="Selfie"
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <User className="w-5 h-5 text-zinc-400" />
              )}
              <span className="text-[9px] font-bold text-zinc-600 block text-center truncate mt-0.5">
                Driver Selfie
              </span>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
                View
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. EARNINGS & WALLET CARD */}
      <div className="mt-3 p-4 rounded-3xl bg-white border border-zinc-200/90 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FFF9E6] border border-[#F5C518]/30 flex items-center justify-center text-[#E6A800]">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Available Balance</span>
              <span className="text-xl font-black text-[#1A1A1A]">৳1,480.00</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowWithdrawModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs transition-all shadow-sm cursor-pointer active:scale-95"
          >
            Withdraw Payout
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 text-xs">
          <div className="p-2 rounded-xl bg-[#F8F9FA] border border-zinc-200">
            <span className="text-[10px] text-zinc-400 block">Today's Cash Collected</span>
            <span className="font-bold text-[#1A1A1A]">৳820</span>
          </div>
          <div className="p-2 rounded-xl bg-[#F8F9FA] border border-zinc-200">
            <span className="text-[10px] text-zinc-400 block">Digital Wallet Credit</span>
            <span className="font-bold text-[#1A1A1A]">৳660</span>
          </div>
        </div>
      </div>

      {/* 3. SWITCH TO PASSENGER PROMO */}
      <div className="mt-3 p-3.5 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F5C518] text-black flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black text-[#1A1A1A] block">Need a Ride Yourself?</span>
            <span className="text-[10px] text-amber-800 block font-medium">Switch to Passenger mode instantly</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onSwitchToPassenger}
          className="px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-[#1A1A1A] hover:bg-zinc-50 transition-colors cursor-pointer active:scale-95"
        >
          Switch
        </button>
      </div>

      {/* 4. DRIVER SPECIFIC OPTIONS (Documents, Vehicle, Payout, Safety, Policies) */}
      <div className="mt-4 flex flex-col gap-1 bg-white rounded-3xl p-2 border border-zinc-200/90 shadow-sm divide-y divide-zinc-100">
        {/* Documents */}
        <button
          type="button"
          onClick={() => handleItemNotice('Driving License & NID Verified')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            <span>Driver Documents</span>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
            Verified
          </span>
        </button>

        {/* Vehicle Details */}
        <button
          type="button"
          onClick={() => handleItemNotice('Vehicle: Voltx Eco Speed (Dhaka Metro-Ha 45-8921)')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <Bike className="w-4 h-4 text-[#E6A800]" />
            <span>Vehicle Details</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono font-medium">
            Dhaka Metro-Ha 45-8921
          </span>
        </button>

        {/* Payout Method */}
        <button
          type="button"
          onClick={() => handleItemNotice('Payout Account: bKash (01712-345678)')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <CreditCard className="w-4 h-4 text-zinc-400" />
            <span>Payout Method</span>
          </div>
          <span className="text-[10px] text-zinc-600 font-bold bg-zinc-100 px-2 py-0.5 rounded-md">
            bKash Linked
          </span>
        </button>

        {/* Battery Swap Pass */}
        <button
          type="button"
          onClick={() => handleItemNotice('Voltx Unlimited Swap Pass: Active')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <Zap className="w-4 h-4 text-[#E6A800]" />
            <span>Battery Swap Pass</span>
          </div>
          <span className="text-[10px] text-[#E6A800] bg-[#FFF9E6] px-2 py-0.5 rounded-md font-bold">
            Unlimited
          </span>
        </button>

        {/* Safety & Emergency */}
        <button
          type="button"
          onClick={() => handleItemNotice('Driver Safety Hotline (999)')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-rose-600">
            <PhoneCall className="w-4 h-4 text-rose-500" />
            <span>Emergency Support (999)</span>
          </div>
          <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md">
            24/7 Hotline
          </span>
        </button>

        {/* Driver Guidelines & Policies */}
        <button
          type="button"
          onClick={() => handleItemNotice('Captain Policies & Terms')}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-zinc-50 rounded-2xl transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <FileText className="w-4 h-4 text-zinc-400" />
            <span>Driver Guidelines & Policies</span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Logout (soft red) */}
        <button
          type="button"
          onClick={() => setShowSignOutConfirm(true)}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-rose-50 rounded-2xl transition-colors cursor-pointer text-left text-rose-600"
        >
          <div className="flex items-center gap-3 text-xs font-bold">
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Logout</span>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-400" />
        </button>
      </div>

      {/* Subtle Footer */}
      <div className="pt-6 text-center text-[11px] text-zinc-400">
        Crafted with love from BeeGo Voltx • Dhaka, Bangladesh
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
          <div className="w-full max-w-[340px] bg-white rounded-3xl p-5 shadow-2xl border border-zinc-200 flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
              <h3 className="text-sm font-black text-[#1A1A1A]">Withdraw Earnings</h3>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {withdrawSuccess ? (
              <div className="p-4 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="text-sm font-black text-[#1A1A1A]">Withdrawal Requested!</h4>
                <p className="text-xs text-zinc-500">৳{withdrawAmount} transferred to your {withdrawMethod} account.</p>
              </div>
            ) : (
              <form onSubmit={handleWithdraw} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Select Channel</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawMethod('bkash')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        withdrawMethod === 'bkash'
                          ? 'border-[#F5C518] bg-[#FFF9E6] text-black shadow-xs'
                          : 'border-zinc-200 bg-white text-zinc-600'
                      }`}
                    >
                      bKash
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithdrawMethod('nagad')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        withdrawMethod === 'nagad'
                          ? 'border-[#F5C518] bg-[#FFF9E6] text-black shadow-xs'
                          : 'border-zinc-200 bg-white text-zinc-600'
                      }`}
                    >
                      Nagad
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Mobile Account</label>
                  <input
                    type="tel"
                    value={withdrawAccount}
                    onChange={(e) => setWithdrawAccount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-zinc-200 text-xs text-[#1A1A1A] font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Amount (BDT)</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    max={1480}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8F9FA] border border-zinc-200 text-xs text-[#1A1A1A] font-mono font-bold"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">Max available: ৳1,480</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs transition-all shadow-md shadow-amber-400/25 cursor-pointer active:scale-95 mt-1"
                >
                  Confirm Payout (Instant)
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
          <div className="w-full max-w-[340px] bg-white rounded-3xl p-5 shadow-2xl border border-zinc-200 flex flex-col gap-3.5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-[#1A1A1A]">Sign Out Driver Session?</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              You will go offline and will not receive passenger trip requests until you log back in.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSignOutConfirm(false);
                  onSignOut();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm shadow-rose-600/20"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-zinc-200">
            <div className="p-3.5 border-b border-zinc-100 flex items-center justify-between">
              <span className="text-xs font-black text-zinc-900">{previewImage.title}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-full hover:bg-zinc-100 text-zinc-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-zinc-950 flex items-center justify-center">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[60vh] max-w-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
