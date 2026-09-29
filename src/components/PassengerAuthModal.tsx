import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  Sparkles,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import {
  validateGmailAddress,
  sendPassengerRegistrationOtp,
  sendPassengerLoginOtp,
  verifyPassengerOtp,
  loginPassengerWithPassword,
  sendPasswordResetOtp,
  resetPasswordWithOtp,
  PassengerProfile,
} from '../services/passengerAuth';
import { BeeGoVoltxLogo } from './BeeGoVoltxLogo';
import { UserRole } from '../types';

export type AuthMode = 'signup' | 'login' | 'otp_verify' | 'forgot_password' | 'reset_otp';

interface PassengerAuthModalProps {
  initialMode?: 'signup' | 'login';
  intendedRole?: UserRole;
  onAuthenticated: (profile: PassengerProfile, role?: UserRole) => void;
  onCancel: () => void;
}

export const PassengerAuthModal: React.FC<PassengerAuthModalProps> = ({
  initialMode = 'signup',
  intendedRole = 'passenger',
  onAuthenticated,
  onCancel,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 6-digit OTP fields
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // State
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Resend Timer
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (resendCooldown > 0) {
      timerRef.current = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resendCooldown]);

  // Focus first OTP input when entering otp_verify mode
  useEffect(() => {
    if (mode === 'otp_verify' || mode === 'reset_otp') {
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [mode]);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSuccess(false);
  };

  // Handle individual OTP digit typing
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);
    setErrorMessage(null);

    // Auto-advance to next input
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation in OTP
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting full 6-digit code
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setOtpDigits(updated);
    setErrorMessage(null);

    const nextIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // 1. SIGN UP: Send 6-digit OTP to email
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const check = validateGmailAddress(email);
    if (!check.isValid) {
      setErrorMessage(check.error || 'Please enter a valid @gmail.com address.');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendPassengerRegistrationOtp(name, email, password, phone);
      setStatusMessage(res.message);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
      setResendCooldown(45);
      switchMode('otp_verify');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Direct Send OTP button clicked next to email input
  const handleSendOtpDirectly = async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    const check = validateGmailAddress(email);
    if (!check.isValid) {
      setErrorMessage(check.error || 'Please enter a valid @gmail.com address.');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Please enter your full name first.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendPassengerRegistrationOtp(name, email, password || 'TempPass123!', phone);
      setStatusMessage(res.message);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
      setResendCooldown(45);
      switchMode('otp_verify');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. VERIFY OTP: Strictly check 6 digits before approving
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const profile = await verifyPassengerOtp(email, fullCode, name, password);
      setIsSuccess(true);
      setStatusMessage('Verification successful! Welcome to BeeGo Voltx.');
      setTimeout(() => {
        onAuthenticated(profile, intendedRole);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid verification code. Please check and try again.');
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await sendPassengerRegistrationOtp(name, email, password);
      setStatusMessage(res.message);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
      setResendCooldown(45);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. SIGN IN: Direct login with email and password
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const check = validateGmailAddress(email);
    if (!check.isValid) {
      setErrorMessage(check.error || 'Please enter a valid @gmail.com address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const profile = await loginPassengerWithPassword(email, password);
      setIsSuccess(true);
      setStatusMessage('Signed in successfully!');
      setTimeout(() => {
        onAuthenticated(profile, intendedRole);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Incorrect password or email.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3b. SIGN IN WITH OTP: Send 6-digit code to Gmail instead of password
  const handleLoginWithOtpClick = async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    const check = validateGmailAddress(email);
    if (!check.isValid) {
      setErrorMessage(check.error || 'Please enter your @gmail.com address above first.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendPassengerLoginOtp(email);
      setStatusMessage(res.message);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
      setResendCooldown(45);
      switchMode('otp_verify');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. FORGOT PASSWORD: Send reset OTP
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const check = validateGmailAddress(email);
    if (!check.isValid) {
      setErrorMessage(check.error || 'Please enter a valid @gmail.com address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendPasswordResetOtp(email);
      setStatusMessage(res.message);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
      setResendCooldown(45);
      switchMode('reset_otp');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. RESET PASSWORD: Submit new password with OTP
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const profile = await resetPasswordWithOtp(email, fullCode, newPassword);
      setIsSuccess(true);
      setStatusMessage('Password updated successfully! Welcome back.');
      setTimeout(() => {
        onAuthenticated(profile, intendedRole);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to reset password. Please check your verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
      <div
        className="w-full max-w-[420px] bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-zinc-200 flex flex-col gap-5 relative overflow-hidden"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Logo Top Center */}
        <div className="flex flex-col items-center justify-center pt-2">
          <BeeGoVoltxLogo size="lg" />
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFF9E6] text-[#E6A800] border border-[#F5C518]/30 uppercase tracking-wider">
              {intendedRole === 'rider' ? 'Driver / Captain Portal' : 'Passenger Portal'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 font-medium">
            Fast electric mobility & swappable battery network
          </p>
        </div>

        {/* Status / Error Toast Banners */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {statusMessage && !errorMessage && (
          <div className="p-3 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/40 text-xs text-amber-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#E6A800] shrink-0 mt-0.5" />
            <span className="leading-relaxed">{statusMessage}</span>
          </div>
        )}

        {/* ================= MODE: SIGN UP ================= */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-[#1A1A1A]">Create Account</h2>
                <p className="text-xs text-zinc-500">Sign up with your Gmail address</p>
              </div>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs font-bold text-[#E6A800] hover:underline cursor-pointer"
              >
                Sign In instead
              </button>
            </div>

            {/* Full Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700">Full Name</label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-4 h-4 text-zinc-400" />
                <input
                  id="signup-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tanvir Ahmed"
                  className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-[#F8F9FA] border border-zinc-200 text-sm text-[#1A1A1A] placeholder-zinc-400 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Email Address with Send OTP */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-700">Gmail Address</label>
                <span className="text-[10px] text-zinc-400 font-medium">OTP dispatched to Gmail</span>
              </div>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
                <input
                  id="signup-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full pl-10 pr-26 py-3 rounded-2xl bg-[#F8F9FA] border border-zinc-200 text-sm text-[#1A1A1A] placeholder-zinc-400 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all font-medium"
                />
                <button
                  type="button"
                  disabled={isLoading || !email.includes('@')}
                  onClick={handleSendOtpDirectly}
                  className="absolute right-1.5 px-3 py-1.5 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95 shrink-0"
                >
                  {isLoading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </div>

            {/* Mobile Number */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700">Mobile Number</label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
                <input
                  id="signup-phone-input"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-[#F8F9FA] border border-zinc-200 text-sm text-[#1A1A1A] placeholder-zinc-400 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all font-medium font-mono"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-zinc-400" />
                <input
                  id="signup-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#F8F9FA] border border-zinc-200 text-sm text-[#1A1A1A] placeholder-zinc-400 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary Submit Button: Continue with Email */}
            <button
              id="signup-submit-button"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 mt-1"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <span>Continue with Email</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ================= MODE: LOGIN ================= */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-[#1A1A1A]">Sign In</h2>
                <p className="text-xs text-zinc-500">Welcome back to BeeGo Voltx</p>
              </div>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-xs font-bold text-[#E6A800] hover:underline cursor-pointer"
              >
                Create Account
              </button>
            </div>

            {/* Email Address */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700">Gmail Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-zinc-400" />
                <input
                  id="login-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-[#F8F9FA] border border-zinc-200 text-sm text-[#1A1A1A] placeholder-zinc-400 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-700">Password</label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot_password')}
                  className="text-xs font-semibold text-[#E6A800] hover:underline cursor-pointer"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-zinc-400" />
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#F8F9FA] border border-zinc-200 text-sm text-[#1A1A1A] placeholder-zinc-400 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary Submit: Sign In */}
            <button
              id="login-submit-button"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 mt-1"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            {/* Instant Login with OTP */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleLoginWithOtpClick}
                className="text-xs font-bold text-zinc-600 hover:text-[#E6A800] transition-colors py-1 cursor-pointer"
              >
                Or sign in with 6-digit email code
              </button>
            </div>
          </form>
        )}

        {/* ================= MODE: OTP VERIFICATION (6 DIGITS) ================= */}
        {mode === 'otp_verify' && (
          <form onSubmit={handleVerifyOtpSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Back to Sign Up"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg font-black tracking-tight text-[#1A1A1A]">Verify your email</h2>
                <p className="text-xs text-zinc-500 truncate">
                  Code sent to <span className="text-[#E6A800] font-bold">{email}</span>
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-zinc-200 text-xs text-zinc-600 flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#FFF9E6] text-[#E6A800] flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <p className="leading-relaxed text-[11px]">
                Enter the 6-digit verification code sent to your Gmail inbox to activate your BeeGo Voltx account.
              </p>
            </div>

            {/* Instant Auto-fill code helper banner */}
            {devOtp && (
              <div className="p-3 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#F5C518]/30 text-[#E6A800] flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-zinc-600 text-[10px] block">Verification Code:</span>
                    <span className="font-mono font-black text-[#E6A800] text-sm tracking-widest">{devOtp}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const digits = devOtp.split('').slice(0, 6);
                    setOtpDigits(digits);
                    setErrorMessage(null);
                    setTimeout(() => {
                      otpInputRefs.current[5]?.focus();
                    }, 50);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-[11px] transition-colors cursor-pointer shadow-sm"
                >
                  Auto-fill
                </button>
              </div>
            )}

            {/* 6 Square Digit Inputs */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpInputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={index === 0 ? handleOtpPaste : undefined}
                  className="w-11 h-12 text-center text-xl font-black rounded-2xl bg-[#F8F9FA] border border-zinc-200 text-[#1A1A1A] focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/25 transition-all"
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>

            <button
              id="otp-verify-submit-button"
              type="submit"
              disabled={isLoading || isSuccess}
              className="w-full py-3.5 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified!</span>
                </>
              ) : (
                <>
                  <span>Verify & Continue</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            {/* Resend Action */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-zinc-500">Didn't receive email?</span>
              {resendCooldown > 0 ? (
                <span className="text-zinc-400 font-mono text-[11px]">
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="font-bold text-[#E6A800] hover:underline cursor-pointer"
                >
                  Resend Code
                </button>
              )}
            </div>
          </form>
        )}

        {/* ================= MODE: FORGOT PASSWORD ================= */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg font-black text-[#1A1A1A]">Reset Password</h2>
                <p className="text-xs text-zinc-500">Enter your Gmail to receive a 6-digit code</p>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700">Gmail Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-[#F8F9FA] border border-zinc-200 text-sm text-[#1A1A1A] placeholder-zinc-400 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Code</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ================= MODE: RESET PASSWORD WITH OTP ================= */}
        {mode === 'reset_otp' && (
          <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => switchMode('forgot_password')}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg font-black text-[#1A1A1A]">Enter Code & New Password</h2>
                <p className="text-xs text-zinc-500">
                  Code sent to <span className="text-[#E6A800] font-bold">{email}</span>
                </p>
              </div>
            </div>

            {devOtp && (
              <div className="p-3 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#F5C518]/30 text-[#E6A800] flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-zinc-600 text-[10px] block">Verification Code:</span>
                    <span className="font-mono font-black text-[#E6A800] text-sm tracking-widest">{devOtp}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const digits = devOtp.split('').slice(0, 6);
                    setOtpDigits(digits);
                    setErrorMessage(null);
                    setTimeout(() => {
                      otpInputRefs.current[5]?.focus();
                    }, 50);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-[11px] transition-colors cursor-pointer"
                >
                  Auto-fill
                </button>
              </div>
            )}

            {/* 6 Square Digit Inputs */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpInputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={index === 0 ? handleOtpPaste : undefined}
                  className="w-11 h-12 text-center text-xl font-black rounded-2xl bg-[#F8F9FA] border border-zinc-200 text-[#1A1A1A] focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/25 transition-all"
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>

            {/* New Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700">New Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#F8F9FA] border border-zinc-200 text-sm text-[#1A1A1A] placeholder-zinc-400 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="w-full py-3.5 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Updated!</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
