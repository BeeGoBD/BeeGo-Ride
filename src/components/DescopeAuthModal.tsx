import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { BeeGoVoltxLogo } from './BeeGoVoltxLogo';
import {
  DescopeUserProfile,
  saveStoredDescopeUser,
  isValidEmail,
  dispatchEmailOtp,
  verifyEmailOtp,
} from '../services/descopeService';
import { useDescope } from '@descope/react-sdk';
import { UserRole } from '../types';

interface DescopeAuthModalProps {
  initialMode?: 'signup' | 'login';
  intendedRole?: UserRole;
  onAuthenticated: (profile: DescopeUserProfile, role?: UserRole) => void;
  onCancel?: () => void;
  isStandalonePage?: boolean;
}

// Official Multi-color Google SVG Icon
const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const DescopeAuthModal: React.FC<DescopeAuthModalProps> = ({
  intendedRole = 'passenger',
  onAuthenticated,
  onCancel,
}) => {
  const sdk = useDescope();

  // Email & OTP States
  const [email, setEmail] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Google OAuth Loading State
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Status Banners
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend Countdown Timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSuccessfulLogin = (profile: DescopeUserProfile) => {
    saveStoredDescopeUser(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('beego_user_role', intendedRole || 'passenger');
      localStorage.setItem('beego_active_passenger', JSON.stringify(profile));
      localStorage.setItem('beego_descope_user', JSON.stringify(profile));
      const url = new URL(window.location.href);
      url.pathname = '/';
      url.searchParams.delete('login');
      url.searchParams.delete('auth');
      url.searchParams.delete('register');
      url.searchParams.delete('code');
      window.history.pushState({}, '', url.toString());
    }
    onAuthenticated(profile, intendedRole);
  };

  /**
   * 1. Send 6-Digit Email OTP
   */
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid email address (e.g. yourname@gmail.com).');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await dispatchEmailOtp(cleanEmail);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
      setIsOtpSent(true);
      setCooldown(45);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMessage(res.message || `A 6-digit verification code was sent to ${cleanEmail}. Please check your email inbox.`);
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch verification code. Please check your connection and try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  /**
   * 2. Verify 6-Digit Email OTP Code
   */
  const handleVerifyOtp = async (codeOverride?: string) => {
    setErrorMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    const code = codeOverride || otpDigits.join('');

    if (code.length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const profile = await verifyEmailOtp(cleanEmail, code);
      handleSuccessfulLogin(profile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification code. Please check your email and try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = cleaned;
    setOtpDigits(next);
    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d.length === 1)) {
      handleVerifyOtp(next.join(''));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const next = ['', '', '', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        next[i] = pasted[i];
      }
      setOtpDigits(next);
      if (pasted.length === 6) {
        handleVerifyOtp(pasted);
      } else {
        otpRefs.current[pasted.length]?.focus();
      }
    }
  };

  /**
   * 3. Functional Continue with Google
   * Opens the real device/browser Google account selection consent screen
   */
  const handleContinueWithGoogle = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);

    // Auto reset loading after 8s so button never stays stuck if popup is closed
    const timer = setTimeout(() => setIsGoogleLoading(false), 8000);

    try {
      // 1. Google Identity Services (GIS) Web SDK Token Client
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
        try {
          const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: '25379092335-apps.googleusercontent.com',
            scope: 'email profile openid',
            prompt: 'select_account',
            callback: async (tokenResponse: any) => {
              clearTimeout(timer);
              setIsGoogleLoading(false);
              if (tokenResponse?.access_token) {
                try {
                  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                  });
                  if (userRes.ok) {
                    const userData = await userRes.json();
                    const profile: DescopeUserProfile = {
                      id: `pax_google_${Date.now().toString(36)}`,
                      name: userData.name || userData.email.split('@')[0],
                      email: userData.email,
                      role: 'passenger',
                      isEmailVerified: true,
                      authMethod: 'oauth_google',
                      picture: userData.picture,
                    };
                    handleSuccessfulLogin(profile);
                    return;
                  }
                } catch (e: any) {
                  setErrorMessage('Failed to retrieve Google profile. Please try Email sign-in.');
                }
              }
            },
          });
          tokenClient.requestAccessToken({ prompt: 'select_account' });
          return;
        } catch (gisErr) {
          console.warn('[GIS TokenClient note]', gisErr);
        }
      }

      // 2. Descope Google OAuth Integration
      if (typeof (sdk?.oauth as any)?.start === 'function') {
        const res = await (sdk.oauth as any).start('google', window.location.origin);
        if (res?.data?.url) {
          clearTimeout(timer);
          window.location.href = res.data.url;
          return;
        }
      }

      // 3. Direct Google OAuth 2.0 Web Redirection with select_account
      clearTimeout(timer);
      const redirectUri = encodeURIComponent(window.location.origin);
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=25379092335-apps.googleusercontent.com&redirect_uri=${redirectUri}&scope=email%20profile%20openid&prompt=select_account`;
      window.location.href = googleAuthUrl;
    } catch (err: any) {
      clearTimeout(timer);
      console.warn('[Google OAuth note]', err?.message);
      setErrorMessage(err?.message || 'Could not connect to Google services. Please sign in via Email.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none relative font-sans">
      {/* 1. TOP HEADER */}
      <div className="p-4 px-5 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <BeeGoVoltxLogo size="sm" />
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-[#FFF9E6] text-[#B38000] border border-[#F5C518]/30 px-2 py-0.5 rounded-full">
              Passenger
            </span>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            title="Back to Role Selection"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. SCROLLABLE CONTENT */}
      <div className="p-5 sm:p-6 overflow-y-auto no-scrollbar flex-1 flex flex-col justify-between gap-4">
        <div className="flex flex-col gap-4">
          {/* Header Title */}
          <div className="text-center pt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF9E6] border border-[#F5C518]/40 text-[#B38000] text-[10px] font-mono font-black uppercase tracking-wider mb-2">
              <Zap className="w-3 h-3 fill-[#F5C518] text-[#B38000]" />
              <span>Instant OTP Verification</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight">
              {isOtpSent ? 'Verify 6-Digit Code' : 'Continue as Passenger'}
            </h2>

            <p className="text-xs text-zinc-500 mt-1 max-w-[320px] mx-auto leading-relaxed">
              {isOtpSent
                ? 'Enter the 6-digit code dispatched to your email inbox.'
                : 'Enter your email address to receive your sign-in code.'}
            </p>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 leading-relaxed font-semibold">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="flex-1 leading-relaxed font-semibold">{successMessage}</div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 1: ENTER EMAIL ONLY                                  */}
          {/* ========================================================= */}
          {!isOtpSent ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-3.5 pt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-800">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-zinc-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    id="passenger-email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address (e.g. name@gmail.com)"
                    autoFocus
                    required
                    className="w-full pl-10 pr-3 py-3 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none text-xs sm:text-sm font-semibold text-black transition-colors"
                  />
                </div>
              </div>

              {/* Main Yellow Button: Continue via Email */}
              <button
                type="submit"
                id="passenger-continue-email-btn"
                disabled={isSendingOtp || !email.trim()}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-sm transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSendingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Continue via Email</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.8]" />
                  </>
                )}
              </button>

              {/* Divider: OR */}
              <div className="relative flex py-2 items-center my-0.5">
                <div className="flex-grow border-t border-zinc-200" />
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Or
                </span>
                <div className="flex-grow border-t border-zinc-200" />
              </div>

              {/* Functional Continue with Google Button */}
              <button
                type="button"
                id="passenger-continue-google-btn"
                onClick={handleContinueWithGoogle}
                disabled={isGoogleLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200/90 hover:border-zinc-300 text-zinc-900 font-bold text-sm transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2.5 active:scale-[0.98]"
              >
                {isGoogleLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
                ) : (
                  <GoogleIcon className="w-5 h-5" />
                )}
                <span>Continue with Google</span>
              </button>
            </form>
          ) : (
            /* ========================================================= */
            /* STEP 2: ENTER 6-DIGIT OTP                                 */
            /* ========================================================= */
            <div className="flex flex-col gap-4 pt-1 animate-in fade-in duration-200">
              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-mono font-bold text-zinc-400">Sent to:</div>
                  <div className="text-xs font-black text-black truncate">{email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpSent(false);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#B38000] hover:text-black transition-colors cursor-pointer px-2.5 py-1 rounded-xl hover:bg-zinc-100"
                >
                  <ArrowLeft className="w-3 h-3 stroke-[2.5]" />
                  <span>Change</span>
                </button>
              </div>

              {/* Quick Verification Code Helper */}
              {devOtp && (
                <div className="p-3.5 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/60 flex items-center justify-between shadow-2xs animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#F5C518] text-black flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 fill-black" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-900">
                        Verification Code
                      </div>
                      <div className="text-base font-black font-mono tracking-widest text-zinc-950">
                        {devOtp}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const digits = devOtp.slice(0, 6).split('');
                      setOtpDigits(digits);
                      handleVerifyOtp(devOtp);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-95 text-xs font-black text-black shadow-xs transition-all cursor-pointer"
                  >
                    Autofill & Verify
                  </button>
                </div>
              )}

              {/* 6 Digit Boxes */}
              <div className="grid grid-cols-6 gap-2" onPaste={handleDigitPaste}>
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(index, e)}
                    className="w-full h-12 text-center text-lg sm:text-xl font-mono font-black rounded-xl sm:rounded-2xl bg-zinc-50 border-2 border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none transition-all shadow-2xs text-black"
                  />
                ))}
              </div>

              {/* Main Yellow Verify Button */}
              <button
                type="button"
                id="passenger-verify-otp-btn"
                onClick={() => handleVerifyOtp()}
                disabled={isVerifyingOtp || otpDigits.some((d) => !d)}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-sm transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifyingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Enter Dashboard</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.8]" />
                  </>
                )}
              </button>

              {/* Resend Countdown / Trigger */}
              <div className="text-center text-xs pt-1">
                {cooldown > 0 ? (
                  <span className="text-zinc-400 font-mono text-[11px]">
                    Resend code in {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="font-bold text-[#B38000] hover:text-black transition-colors cursor-pointer text-xs"
                  >
                    Didn't receive code? Resend Code
                  </button>
                )}
              </div>

              {/* Divider: OR */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-zinc-200" />
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Or
                </span>
                <div className="flex-grow border-t border-zinc-200" />
              </div>

              {/* Bottom Google Option */}
              <button
                type="button"
                onClick={handleContinueWithGoogle}
                disabled={isGoogleLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200/90 hover:border-zinc-300 text-zinc-900 font-bold text-sm transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2.5 active:scale-[0.98]"
              >
                {isGoogleLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
                ) : (
                  <GoogleIcon className="w-5 h-5" />
                )}
                <span>Continue with Google</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. FOOTER SAFETY BADGE */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-center gap-1.5 text-[10px] text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted with Descope Cloud Auth • Dhaka, BD</span>
        </div>
      </div>
    </div>
  );
};
