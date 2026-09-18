import React, { useState } from 'react';
import { QrCode, Flashlight, Shield, Info, Sparkles, RefreshCw } from 'lucide-react';

export const QrScannerSection: React.FC = () => {
  const [flashlightOn, setFlashlightOn] = useState(false);

  return (
    <div
      id="qr-scanner-section"
      className="w-full max-w-xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[70vh] text-center"
    >
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 mb-6">
        <QrCode className="w-3.5 h-3.5 text-emerald-400" />
        <span>Bigo Code Scanner</span>
      </div>

      {/* Main Viewfinder Frame */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shadow-2xl mb-6">
        {/* Animated Laser Scan Bar */}
        <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-laser-scan pointer-events-none" />

        {/* Viewfinder Target Brackets */}
        <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />

        {/* Center Frozen Status Icon */}
        <div className="flex flex-col items-center gap-3 p-4 z-10">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center shadow-inner">
            <QrCode className="w-8 h-8 text-zinc-500" />
          </div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">
            Module Frozen
          </span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setFlashlightOn(!flashlightOn)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
            flashlightOn
              ? 'bg-amber-500 text-black border-amber-400'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          <Flashlight className="w-3.5 h-3.5" />
          <span>{flashlightOn ? 'Torch On' : 'Torch Off'}</span>
        </button>
      </div>

      {/* Notice & Instructions */}
      <div className="max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800/80 p-4 text-left shadow-lg">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-400 leading-relaxed">
            <span className="text-white font-semibold block mb-0.5">
              QR Scanner Integration
            </span>
            This section is intentionally frozen for upcoming release. You will be able to scan Captain QR codes to pair rides instantly or authorize contactless bKash/Nagad payments.
          </div>
        </div>
      </div>
    </div>
  );
};
