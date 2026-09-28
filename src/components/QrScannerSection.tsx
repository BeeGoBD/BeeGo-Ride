import React from 'react';
import {
  QrCode,
  Zap,
  ArrowLeft,
  AlertCircle,
  Camera,
  Flashlight,
  Image as ImageIcon,
} from 'lucide-react';

interface QrScannerSectionProps {
  onBack?: () => void;
}

export const QrScannerSection: React.FC<QrScannerSectionProps> = ({ onBack }) => {
  return (
    <div className="w-full h-full min-h-screen bg-[#F8F9FA] text-[#1A1A1A] flex flex-col justify-between p-5 select-none relative max-w-[430px] mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 pt-1 border-b border-zinc-200">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-white hover:bg-zinc-100 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer border border-zinc-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-base font-black text-[#1A1A1A]">Scan Battery QR</h1>
            <p className="text-[11px] text-zinc-500">Voltx Swappable Power Network</p>
          </div>
        </div>

        <div className="w-7 h-7 rounded-xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-center text-[#E6A800]">
          <Zap className="w-4 h-4 fill-[#F5C518]" />
        </div>
      </div>

      {/* Main Viewfinder Section */}
      <div className="my-auto flex flex-col items-center gap-5 py-4">
        {/* Viewfinder frame */}
        <div className="relative w-64 h-64 bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-white flex items-center justify-center">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Corner Guides */}
          <div className="absolute top-4 left-4 w-7 h-7 border-t-4 border-l-4 border-[#F5C518] rounded-tl-xl" />
          <div className="absolute top-4 right-4 w-7 h-7 border-t-4 border-r-4 border-[#F5C518] rounded-tr-xl" />
          <div className="absolute bottom-4 left-4 w-7 h-7 border-b-4 border-l-4 border-[#F5C518] rounded-bl-xl" />
          <div className="absolute bottom-4 right-4 w-7 h-7 border-b-4 border-r-4 border-[#F5C518] rounded-br-xl" />

          {/* Laser scanning beam */}
          <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-[#F5C518] to-transparent shadow-[0_0_12px_#F5C518] animate-scan-laser" />

          {/* Center icon */}
          <div className="flex flex-col items-center gap-2 text-zinc-400 z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-sm">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-medium text-zinc-300">Point at station QR</span>
          </div>
        </div>

        {/* Maintenance notice per prompt */}
        <div className="w-full max-w-xs p-3.5 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/50 flex items-start gap-3 shadow-sm text-left">
          <div className="w-6 h-6 rounded-full bg-[#F5C518]/30 flex items-center justify-center shrink-0 mt-0.5 text-amber-900">
            <AlertCircle className="w-4 h-4 text-[#E6A800]" />
          </div>
          <div>
            <h3 className="text-xs font-black text-amber-900">Scanner Notice</h3>
            <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5 font-medium">
              Battery scan is currently under maintenance. Coming soon.
            </p>
          </div>
        </div>

        {/* Controls Bar (Visual dummy toggles) */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-zinc-400 opacity-60 cursor-not-allowed"
          >
            <Flashlight className="w-3.5 h-3.5" />
            <span>Flashlight</span>
          </button>
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-zinc-400 opacity-60 cursor-not-allowed"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="pb-6 text-center">
        <p className="text-[11px] text-zinc-400">
          Powered by BeeGo Voltx Smart Energy Grid
        </p>
      </div>
    </div>
  );
};
