import React from 'react';
import { Banknote, Check, ChevronDown } from 'lucide-react';
import { PaymentMethod } from '../types';

export interface PaymentOption {
  id: PaymentMethod;
  name: string;
  subtext: string;
  badge: string;
  color: string;
}

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'cash',
    name: 'Cash Payment',
    subtext: 'Pay in Taka directly to captain upon arrival',
    badge: 'Cash',
    color: '#10B981',
  },
  {
    id: 'bkash',
    name: 'bKash',
    subtext: 'Instant digital MFS payment via bKash',
    badge: 'MFS',
    color: '#E2136E',
  },
  {
    id: 'nagad',
    name: 'Nagad',
    subtext: 'Bangladesh Post Office MFS gateway',
    badge: 'Post MFS',
    color: '#F7941D',
  },
  {
    id: 'rocket',
    name: 'Rocket',
    subtext: 'Dutch-Bangla Bank mobile banking',
    badge: 'DBBL',
    color: '#8C1D84',
  },
];

export const PaymentIcon: React.FC<{ method: PaymentMethod; className?: string }> = ({
  method,
  className = 'w-5 h-5',
}) => {
  if (method === 'cash') {
    return (
      <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
        <Banknote className="w-4 h-4" />
      </div>
    );
  }

  if (method === 'bkash') {
    return (
      <div className="w-7 h-7 rounded-lg bg-[#E2136E]/20 border border-[#E2136E]/40 flex items-center justify-center shrink-0">
        {/* Authentic bKash origami bird icon */}
        <svg viewBox="0 0 100 100" fill="none" className="w-4 h-4">
          <path
            d="M50 10 L85 45 L50 80 L35 65 L60 45 L35 30 Z"
            fill="#E2136E"
          />
          <path
            d="M15 45 L35 30 L35 65 Z"
            fill="#C0105E"
          />
        </svg>
      </div>
    );
  }

  if (method === 'nagad') {
    return (
      <div className="w-7 h-7 rounded-lg bg-[#F7941D]/20 border border-[#F7941D]/40 flex items-center justify-center shrink-0">
        {/* Authentic Nagad flame/curve icon */}
        <svg viewBox="0 0 100 100" fill="none" className="w-4 h-4">
          <circle cx="50" cy="50" r="40" fill="#EA1C24" />
          <path
            d="M35 70 C35 50 65 45 65 30 C65 45 45 55 45 70 Z"
            fill="#F7941D"
          />
          <circle cx="58" cy="32" r="7" fill="#FFF" />
        </svg>
      </div>
    );
  }

  if (method === 'rocket') {
    return (
      <div className="w-7 h-7 rounded-lg bg-[#8C1D84]/20 border border-[#8C1D84]/40 flex items-center justify-center shrink-0">
        {/* Authentic DBBL Rocket icon */}
        <svg viewBox="0 0 100 100" fill="none" className="w-4 h-4">
          <path
            d="M50 15 C65 25 70 50 65 75 L50 65 L35 75 C30 50 35 25 50 15 Z"
            fill="#8C1D84"
          />
          <circle cx="50" cy="45" r="8" fill="#FFF" />
          <path d="M45 70 L50 85 L55 70 Z" fill="#F7941D" />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
      <Banknote className="w-4 h-4" />
    </div>
  );
};

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  requiredError?: boolean;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onSelectMethod,
  isOpen,
  onToggleOpen,
  requiredError = false,
}) => {
  const currentOption = PAYMENT_OPTIONS.find((opt) => opt.id === selectedMethod);

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>Payment Method</span>
          <span className="text-red-400 font-bold">*</span>
        </label>
        <span className="text-[11px] font-mono text-zinc-500">
          {selectedMethod ? 'Selected' : 'Required to request'}
        </span>
      </div>

      {/* Main Selector Box */}
      <button
        type="button"
        id="payment-method-selector-box"
        onClick={onToggleOpen}
        className={`w-full p-3 rounded-xl bg-black/90 border transition-all text-left flex items-center justify-between cursor-pointer ${
          requiredError && !selectedMethod
            ? 'border-red-500 ring-2 ring-red-500/20 shadow-lg shadow-red-500/10'
            : selectedMethod
            ? 'border-zinc-700 hover:border-amber-500/80 bg-zinc-950'
            : 'border-zinc-800 hover:border-zinc-700'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {selectedMethod ? (
            <>
              <PaymentIcon method={selectedMethod} />
              <div className="min-w-0">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{currentOption?.name}</span>
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded uppercase"
                    style={{
                      backgroundColor: `${currentOption?.color}20`,
                      color: currentOption?.color,
                      border: `1px solid ${currentOption?.color}40`,
                    }}
                  >
                    {currentOption?.badge}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                  {currentOption?.subtext}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 text-zinc-400">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-300">
                  Select payment method
                </div>
                <div className="text-[11px] text-zinc-500">
                  Cash, bKash, Nagad, or Rocket
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-2">
          <ChevronDown
            className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-white' : ''
            }`}
          />
        </div>
      </button>

      {/* Validation Message */}
      {requiredError && !selectedMethod && (
        <div className="text-[11px] text-red-400 mt-1 font-medium flex items-center gap-1">
          <span>Please select Cash, bKash, Nagad, or Rocket to request your ride.</span>
        </div>
      )}

      {/* Dropdown Options List */}
      {isOpen && (
        <div
          id="payment-method-dropdown-menu"
          className="absolute z-50 left-0 right-0 mt-2 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-1.5 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-mono text-zinc-500 border-b border-zinc-900 flex items-center justify-between">
            <span>Payment Options</span>
            <span className="text-amber-400 font-bold">Bangladesh Currency (৳)</span>
          </div>

          {PAYMENT_OPTIONS.map((opt) => {
            const isSelected = selectedMethod === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                id={`payment-opt-${opt.id}`}
                onClick={() => {
                  onSelectMethod(opt.id);
                  onToggleOpen();
                }}
                className={`w-full p-3 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-900/90 border border-zinc-700 text-white'
                    : 'hover:bg-zinc-900/60 border border-transparent text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PaymentIcon method={opt.id} />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold flex items-center gap-2">
                      <span className={isSelected ? 'text-white' : 'text-zinc-200'}>
                        {opt.name}
                      </span>
                      <span
                        className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase"
                        style={{
                          backgroundColor: `${opt.color}20`,
                          color: opt.color,
                          border: `1px solid ${opt.color}40`,
                        }}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {opt.subtext}
                    </div>
                  </div>
                </div>

                <div className="pl-3 shrink-0">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-zinc-700" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
