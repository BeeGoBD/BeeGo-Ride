import React from 'react';
import { Banknote, Check, ChevronDown, Lock, Wallet } from 'lucide-react';
import { PaymentMethod } from '../types';

export interface PaymentOption {
  id: PaymentMethod;
  name: string;
  subtext: string;
  badge: string;
  active: boolean;
}

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'cash',
    name: 'Cash Payment',
    subtext: 'Pay in Taka directly to captain upon arrival',
    badge: 'Active',
    active: true,
  },
  {
    id: 'bkash',
    name: 'bKash MFS',
    subtext: 'Direct bKash digital wallet payment',
    badge: 'Coming Soon',
    active: false,
  },
  {
    id: 'nagad',
    name: 'Nagad MFS',
    subtext: 'Bangladesh Post Office gateway',
    badge: 'Coming Soon',
    active: false,
  },
  {
    id: 'rocket',
    name: 'Rocket / Cards',
    subtext: 'Dutch-Bangla Bank & Visa/Mastercard',
    badge: 'Coming Soon',
    active: false,
  },
];

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  className?: string;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onSelectMethod,
  className = '',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const currentOption = PAYMENT_OPTIONS.find((o) => o.id === selectedMethod) || PAYMENT_OPTIONS[0];

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 rounded-2xl bg-[#F8F9FA] hover:bg-white border border-zinc-200/90 hover:border-[#F5C518] shadow-xs flex items-center justify-between transition-all cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-center text-[#E6A800]">
            <Banknote className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-[#1A1A1A]">{currentOption.name}</span>
              <span className="text-[9px] font-mono font-bold bg-[#F5C518] text-black px-1.5 py-0.2 rounded-full">
                Active
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">{currentOption.subtext}</p>
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 right-0 z-30 bg-white rounded-2xl p-2 shadow-xl border border-zinc-200 flex flex-col gap-1">
          <div className="px-2 py-1 text-[10px] uppercase font-mono font-bold text-zinc-400">
            Payment Options
          </div>
          {PAYMENT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={!opt.active}
              onClick={() => {
                if (opt.active) {
                  onSelectMethod(opt.id);
                  setIsOpen(false);
                }
              }}
              className={`p-2.5 rounded-xl flex items-center justify-between text-left transition-colors ${
                opt.active
                  ? selectedMethod === opt.id
                    ? 'bg-[#FFF9E6] border border-[#F5C518]/50 text-[#1A1A1A] cursor-pointer'
                    : 'hover:bg-zinc-50 text-[#1A1A1A] cursor-pointer'
                  : 'opacity-50 cursor-not-allowed bg-zinc-50/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    opt.active
                      ? 'bg-[#FFF9E6] text-[#E6A800]'
                      : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  {opt.id === 'cash' ? (
                    <Banknote className="w-4 h-4" />
                  ) : (
                    <Wallet className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1A1A1A]">{opt.name}</div>
                  <div className="text-[10px] text-zinc-500">{opt.subtext}</div>
                </div>
              </div>

              {opt.active ? (
                selectedMethod === opt.id && (
                  <Check className="w-4 h-4 text-[#E6A800] stroke-[2.5]" />
                )
              ) : (
                <span className="text-[9px] font-mono font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Coming Soon
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
