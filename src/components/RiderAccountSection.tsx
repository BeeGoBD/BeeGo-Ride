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
} from 'lucide-react';
import { RATE_PER_KM_TAKA } from '../services/rideSync';

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
  const [copied, setCopied] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [withdrawAccount, setWithdrawAccount] = useState('01712-345678');
  const [withdrawAmount, setWithdrawAmount] = useState('1640');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

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
    }, 2000);
  };

  return (
    <div id="rider-account-section" className="w-full max-w-2xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4 p-5 rounded-3xl bg-zinc-950 border border-zinc-800/90 shadow-xl mb-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg">
            <div className="w-full h-full rounded-[14px] bg-black flex items-center justify-center">
              <Bike className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center">
            <Check className="w-3 h-3 text-black stroke-[3]" />
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white truncate">Captain Tanvir (You)</h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-3 h-3" />
              Verified
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-zinc-400 font-mono">{riderId}</span>
            <button
              type="button"
              onClick={handleCopyId}
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              title="Copy Captain ID"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              4.98
            </span>
            <span>•</span>
            <span>342 Rides</span>
            <span>•</span>
            <span className="text-emerald-400 font-medium">99% Acceptance</span>
          </div>
        </div>
      </div>

      {/* Rider Wallet & Payout Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-zinc-800 shadow-xl mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Rider Earnings Balance</div>
              <div className="text-2xl font-black text-white tracking-tight">৳1,640 Taka</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowWithdrawModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Cash Out</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-800/80 text-xs text-zinc-400">
          <div>
            <span className="text-zinc-500 block text-[11px]">Today&apos;s Payout</span>
            <span className="text-white font-bold">৳1,141 Taka</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px]">Fare Rate</span>
            <span className="text-emerald-400 font-bold">৳{RATE_PER_KM_TAKA}/km (85% Captain share)</span>
          </div>
        </div>
      </div>

      {/* Registered Vehicle & Documents */}
      <div className="p-5 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-lg mb-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-3">
          <div className="flex items-center gap-2">
            <Bike className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Active Registered Bike
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Road Ready
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-zinc-900/60">
            <span className="text-zinc-400">Motorbike Model:</span>
            <span className="text-white font-semibold">Yamaha FZ-S FI (150cc)</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-zinc-900/60">
            <span className="text-zinc-400">License Plate:</span>
            <span className="font-mono text-emerald-400 font-bold">Dhaka Metro-HA 52-8910</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-zinc-900/60">
            <span className="text-zinc-400">Helmets for Ride:</span>
            <span className="text-white font-semibold">2 Certified Helmets on Bike</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-400">BRTA Driving License:</span>
            <span className="text-zinc-300 font-mono">DL-BD-0982-2029 (Valid)</span>
          </div>
        </div>
      </div>

      {/* Quick Menu Options */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 overflow-hidden divide-y divide-zinc-900 mb-5">
        {/* Switch to Passenger Mode */}
        <button
          type="button"
          onClick={onSwitchToPassenger}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-900/60 transition-colors text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Passenger Mode</div>
              <div className="text-[11px] text-zinc-500">Switch to book rides across Bangladesh</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
        </button>

        {/* Emergency SOS */}
        <a
          href="tel:999"
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-red-950/20 transition-colors text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-950/40 border border-red-900/60 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-red-400">Emergency Helpline 999</div>
              <div className="text-[11px] text-zinc-500">24/7 Police, Ambulance & Safety</div>
            </div>
          </div>
          <PhoneCall className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
        </a>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={() => setShowSignOutConfirm(true)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-red-950/20 transition-colors text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-950/40 border border-red-900/60 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-red-400">Exit Captain Mode</div>
              <div className="text-[11px] text-zinc-500">Go offline & return to role selector</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-red-400 transition-colors" />
        </button>
      </div>

      {/* SIGN OUT CONFIRMATION MODAL */}
      {showSignOutConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowSignOutConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1.5">Sign out of Captain Mode?</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              You will go offline from the dispatch radar and return to the main role selection screen.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSignOutConfirm(false);
                  onSignOut();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {showWithdrawModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowWithdrawModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Cash Out Earnings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {withdrawSuccess ? (
              <div className="py-8 text-center animate-in fade-in zoom-in duration-200">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div className="text-base font-bold text-white">Payout Initiated!</div>
                <div className="text-xs text-zinc-400 mt-1">
                  ৳{withdrawAmount} Taka will arrive in your {withdrawMethod.toUpperCase()} wallet within 5 minutes.
                </div>
              </div>
            ) : (
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Transfer Destination</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawMethod('bkash')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        withdrawMethod === 'bkash'
                          ? 'bg-pink-600/20 border-pink-500 text-pink-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <span>bKash Personal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithdrawMethod('nagad')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        withdrawMethod === 'nagad'
                          ? 'bg-orange-600/20 border-orange-500 text-orange-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <span>Nagad Wallet</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={withdrawAccount}
                    onChange={(e) => setWithdrawAccount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Amount in Taka (৳)</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    max={1640}
                    min={50}
                    required
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Available balance: ৳1,640 Taka
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold cursor-pointer"
                  >
                    Confirm Payout
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
