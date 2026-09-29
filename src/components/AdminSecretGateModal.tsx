import React, { useState } from 'react';
import { ShieldAlert, Lock, KeyRound, ArrowRight, X, AlertCircle, Loader2 } from 'lucide-react';
import { loginAdmin } from '../services/adminService';

interface AdminSecretGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export const AdminSecretGateModal: React.FC<AdminSecretGateModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
}) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!adminId.trim()) {
      setErrorMessage('Please enter the Admin ID.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter the secret password.');
      return;
    }

    setIsLoading(true);
    try {
      await loginAdmin(adminId.trim(), password);
      onAuthenticated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Access Denied: Incorrect Admin Credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-[380px] bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-white relative flex flex-col gap-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Secret Shield */}
        <div className="flex flex-col items-center text-center pt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/30 text-[#F5C518] flex items-center justify-center mb-3 shadow-lg shadow-amber-500/10">
            <ShieldAlert className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Security Gate
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Restricted operations terminal. Please enter authorization credentials.
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Empty Box 1: Admin ID */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider pl-1">
              Admin Identifier
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck="false"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-[#F5C518] focus:outline-hidden text-sm text-white placeholder:text-zinc-600 font-mono transition-colors"
              />
            </div>
          </div>

          {/* Empty Box 2: Password */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider pl-1">
              Security Key
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
              <input
                type="password"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="new-password"
                spellCheck="false"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-[#F5C518] focus:outline-hidden text-sm text-white placeholder:text-zinc-600 font-mono transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Authorizing...</span>
              </>
            ) : (
              <>
                <span>Access Console</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-zinc-500 hover:text-zinc-300 font-semibold transition-colors cursor-pointer"
          >
            Cancel and Return
          </button>
        </div>
      </div>
    </div>
  );
};
