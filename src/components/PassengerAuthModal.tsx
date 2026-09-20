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

export type AuthMode = 'signup' | 'login' | 'otp_verify' | 'forgot_password' | 'reset_otp';

interface PassengerAuthModalProps {
  initialMode?: 'signup' | 'login';
  onAuthenticated: (profile: PassengerProfile) => void;
  onCancel: () => void;
}

export const PassengerAuthModal: React.FC<PassengerAuthModalProps> = ({
  initialMode = 'signup',
  onAuthenticated,
  onCancel,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
      const res = await sendPassengerRegistrationOtp(name, email, password);
      setStatusMessage(res.message);
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
      setStatusMessage('Verification successful! Welcome to Beego.');
      setTimeout(() => {
        onAuthenticated(profile);
      }, 600);
    } catch (err: any) {
      // If OTP is wrong, it stays on the OTP screen with error
      setErrorMessage(err?.message || 'Invalid verification code. Please check and try again.');
      // Highlight and reset OTP inputs
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
        onAuthenticated(profile);
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
      setStatusMessage('Password updated successfully!');
      setTimeout(() => {
        onAuthenticated(profile);
      }, 600);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid code or password reset failed.');
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="passenger-auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl p-6 text-white flex flex-col gap-5">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black text-sm shadow-md shadow-amber-400/20">
              B
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-base tracking-tight text-white">BEEGO</span>
              <span className="text-[10px] font-semibold text-amber-400">PASSENGER</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher for Sign In / Sign Up */}
        {(mode === 'signup' || mode === 'login') && (
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-900 border border-zinc-800/80">
            <button
              type="button"
              id="tab-signup"
              onClick={() => switchMode('signup')}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              id="tab-login"
              onClick={() => switchMode('login')}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sign In
            </button>
          </div>
        )}

        {/* Messages */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {statusMessage && !errorMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="leading-snug">{statusMessage}</span>
          </div>
        )}

        {/* ================= MODE: SIGN UP ================= */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">Create an account</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Enter your details to receive a verification code
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-zinc-300">Full Name</label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-zinc-500" />
                  <input
                    id="signup-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jobaer Alam"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-zinc-300">Gmail Address</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 w-4 h-4 text-zinc-500" />
                  <input
                    id="signup-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-zinc-300">Password</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 w-4 h-4 text-zinc-500" />
                  <input
                    id="signup-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              id="signup-submit-button"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/10 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ================= MODE: OTP VERIFICATION (6 DIGITS) ================= */}
        {mode === 'otp_verify' && (
          <form onSubmit={handleVerifyOtpSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-zinc-800"
                title="Back to Sign Up"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg font-black tracking-tight text-white">Verify your email</h2>
                <p className="text-xs text-zinc-400 truncate">
                  Code sent to <span className="text-amber-400 font-semibold">{email}</span>
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 text-xs text-zinc-400 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <p className="leading-relaxed text-[11px]">
                Please open your Gmail inbox to find the 6-digit verification code sent by Appwrite. Enter the code below to complete sign up.
              </p>
            </div>

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
                  className="w-11 h-12 text-center text-xl font-black rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>

            <p className="text-[11px] text-zinc-500 text-center">
              Didn't see the email? Please check your Spam or Updates folder.
            </p>

            <button
              id="otp-verify-submit-button"
              type="submit"
              disabled={isLoading || isSuccess}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/10 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying with Appwrite...</span>
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
                  disabled={isLoading}
                  className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Resend Code
                </button>
              )}
            </div>
          </form>
        )}

        {/* ================= MODE: SIGN IN ================= */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">Welcome back</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Sign in with your email and password
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-zinc-300">Gmail Address</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 w-4 h-4 text-zinc-500" />
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-300">Password</label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot_password')}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 w-4 h-4 text-zinc-500" />
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              id="login-submit-button"
              type="submit"
              disabled={isLoading || isSuccess}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/10 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Success!</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            {/* Passwordless OTP Login Alternative */}
            <div className="relative flex items-center justify-center my-0.5">
              <div className="border-t border-zinc-800/80 w-full" />
              <span className="bg-zinc-950 px-2.5 text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                Or
              </span>
            </div>

            <button
              id="login-with-otp-button"
              type="button"
              onClick={handleLoginWithOtpClick}
              disabled={isLoading || isSuccess}
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 text-zinc-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign in with 6-digit email code</span>
            </button>
          </form>
        )}

        {/* ================= MODE: FORGOT PASSWORD ================= */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white">Reset Password</h2>
                <p className="text-xs text-zinc-400">
                  We will send a 6-digit verification code
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-300">Gmail Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/10 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
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
                className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white">Enter code & new password</h2>
                <p className="text-xs text-zinc-400">
                  Code sent to <span className="text-amber-400 font-semibold">{email}</span>
                </p>
              </div>
            </div>

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
                  className="w-11 h-12 text-center text-xl font-black rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>

            {/* New Password */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-300">New Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/10 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Success!</span>
                </>
              ) : (
                <>
                  <span>Reset & Sign In</span>
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
