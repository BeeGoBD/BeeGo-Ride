import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Mail,
  User,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Zap,
  Check,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { BeeGoVoltxLogo } from './BeeGoVoltxLogo';
import {
  DescopeUserProfile,
  saveStoredDescopeUser,
  isValidEmail,
  normalizeBangladeshPhone,
  isValidBangladeshPhone,
  dispatchEmailOtp,
  verifyEmailOtp,
  resetPassengerPassword,
} from '../services/descopeService';
import { UserRole } from '../types';

interface DescopeAuthModalProps {
  initialMode?: 'signup' | 'login';
  intendedRole?: UserRole;
  onAuthenticated: (profile: DescopeUserProfile, role?: UserRole) => void;
  onCancel?: () => void;
  isStandalonePage?: boolean;
}

export const DescopeAuthModal: React.FC<DescopeAuthModalProps> = ({
  initialMode = 'signup',
  intendedRole = 'passenger',
  onAuthenticated,
  onCancel,
}) => {
  // Main Tab State: 'signup' | 'signin' | 'forgot'
  const [activeTab, setActiveTab] = useState<'signup' | 'signin' | 'forgot'>(
    initialMode === 'login' ? 'signin' : 'signup'
  );

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // OTP State for Sign Up
  const [signupOtpSent, setSignupOtpSent] = useState(false);
  const [signupEmailVerified, setSignupEmailVerified] = useState(false);
  const [signupOtpCode, setSignupOtpCode] = useState('');
  const [signupActiveDevOtp, setSignupActiveDevOtp] = useState<string | null>(null);
  const [isSendingSignupOtp, setIsSendingSignupOtp] = useState(false);
  const [isVerifyingSignupOtp, setIsVerifyingSignupOtp] = useState(false);

  // OTP State for Sign In
  const [signinOtpSent, setSigninOtpSent] = useState(false);
  const [signinOtpDigits, setSigninOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [signinActiveDevOtp, setSigninActiveDevOtp] = useState<string | null>(null);
  const [isSendingSigninOtp, setIsSendingSigninOtp] = useState(false);
  const [isVerifyingSigninOtp, setIsVerifyingSigninOtp] = useState(false);
  const [signinCooldown, setSigninCooldown] = useState(0);

  // Forgot Password Flow State
  // Step 1: 'request' (enter email) -> Step 2: 'verify' (enter OTP) -> Step 3: 'new_password' (set new password)
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'new_password'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtpDigits, setForgotOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [forgotActiveDevOtp, setForgotActiveDevOtp] = useState<string | null>(null);
  const [isSendingForgotOtp, setIsSendingForgotOtp] = useState(false);
  const [isVerifyingForgotOtp, setIsVerifyingForgotOtp] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);

  // Passwords for Forgot Password Step 3
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // General Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const signinOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const forgotOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sign-in resend timer
  useEffect(() => {
    if (signinCooldown <= 0) return;
    const timer = setInterval(() => {
      setSigninCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [signinCooldown]);

  // Forgot Password resend timer
  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  const handleSuccessfulLogin = (profile: DescopeUserProfile) => {
    saveStoredDescopeUser(profile);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.pathname = '/';
      url.searchParams.delete('login');
      url.searchParams.delete('auth');
      url.searchParams.delete('register');
      window.history.pushState({}, '', url.toString());
    }
    onAuthenticated(profile, intendedRole);
  };

  /**
   * ==========================================
   * 1. SIGN UP FLOW
   * ==========================================
   */
  const handleSendSignupOtp = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage('Please enter your email address to receive the verification code.');
      return;
    }
    if (!isValidEmail(cleanEmail) || !cleanEmail.endsWith('@gmail.com')) {
      setErrorMessage('Only @gmail.com email addresses are supported (e.g. yourname@gmail.com).');
      return;
    }

    setIsSendingSignupOtp(true);
    try {
      const res = await dispatchEmailOtp(cleanEmail, fullName.trim() || undefined);
      if (res.devOtp) {
        setSignupActiveDevOtp(res.devOtp);
      }
      setSignupOtpSent(true);
      setSuccessMessage(`Verification code sent to ${cleanEmail}. Please check your Gmail.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSendingSignupOtp(false);
    }
  };

  const handleVerifySignupOtp = async (codeOverride?: string) => {
    setErrorMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    const code = (codeOverride || signupOtpCode).trim();

    if (code.length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifyingSignupOtp(true);
    try {
      await verifyEmailOtp(cleanEmail, code, fullName.trim() || undefined);
      setSignupEmailVerified(true);
      setSuccessMessage('Email verified successfully! You can now complete your registration.');
    } catch (err: any) {
      setErrorMessage(err.message || 'The verification code you entered is invalid. Please try again.');
    } finally {
      setIsVerifyingSignupOtp(false);
    }
  };

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phoneNumber.trim();

    if (!cleanName) {
      setErrorMessage('Please enter your Full Name.');
      return;
    }

    if (!cleanEmail) {
      setErrorMessage('Please enter your Gmail address.');
      return;
    }

    if (!signupEmailVerified) {
      setErrorMessage('Please verify your email address by clicking "Send OTP" and entering the 6-digit code.');
      return;
    }

    if (!cleanPhone) {
      setErrorMessage('Please enter your phone number so your driver can contact you during rides.');
      return;
    }

    const normalizedPhone = normalizeBangladeshPhone(cleanPhone);
    if (!isValidBangladeshPhone(normalizedPhone)) {
      setErrorMessage('Please enter a valid Bangladesh mobile number (e.g. 01712345678).');
      return;
    }

    setIsLoading(true);
    try {
      const profile: DescopeUserProfile = {
        id: `pax_${Date.now().toString(36)}`,
        name: cleanName,
        email: cleanEmail,
        phone: normalizedPhone,
        role: 'passenger',
        isEmailVerified: true,
        authMethod: 'email_otp',
      };
      handleSuccessfulLogin(profile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ==========================================
   * 2. SIGN IN FLOW
   * ==========================================
   */
  const handleSendSigninOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your registered Gmail address.');
      return;
    }
    if (!isValidEmail(cleanEmail) || !cleanEmail.endsWith('@gmail.com')) {
      setErrorMessage('Only @gmail.com email addresses are supported (e.g. yourname@gmail.com).');
      return;
    }

    setIsSendingSigninOtp(true);
    try {
      const res = await dispatchEmailOtp(cleanEmail);
      if (res.devOtp) {
        setSigninActiveDevOtp(res.devOtp);
      }
      setSigninOtpSent(true);
      setSigninCooldown(45);
      setSuccessMessage(`Verification code sent to ${cleanEmail}. Please enter the 6 digits below.`);
      setTimeout(() => signinOtpRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setIsSendingSigninOtp(false);
    }
  };

  const handleVerifySigninOtp = async (codeOverride?: string) => {
    setErrorMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    const code = codeOverride || signinOtpDigits.join('');

    if (code.length < 6) {
      setErrorMessage('Please enter the complete 6-digit code.');
      return;
    }

    setIsVerifyingSigninOtp(true);
    try {
      const profile = await verifyEmailOtp(cleanEmail, code);
      handleSuccessfulLogin(profile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setIsVerifyingSigninOtp(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const next = [...signinOtpDigits];
    next[index] = cleaned;
    setSigninOtpDigits(next);
    if (cleaned && index < 5) {
      signinOtpRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d.length === 1)) {
      handleVerifySigninOtp(next.join(''));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !signinOtpDigits[index] && index > 0) {
      signinOtpRefs.current[index - 1]?.focus();
    }
  };

  /**
   * ==========================================
   * 3. FORGOT PASSWORD FLOW
   * ==========================================
   */

  // Step 1: Send OTP to email for password reset
  const handleSendForgotOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your registered Gmail address.');
      return;
    }
    if (!isValidEmail(cleanEmail) || !cleanEmail.endsWith('@gmail.com')) {
      setErrorMessage('Only @gmail.com email addresses are supported (e.g. yourname@gmail.com).');
      return;
    }

    setIsSendingForgotOtp(true);
    try {
      const res = await dispatchEmailOtp(cleanEmail);
      if (res.devOtp) {
        setForgotActiveDevOtp(res.devOtp);
      }
      setForgotStep('verify');
      setForgotCooldown(45);
      setSuccessMessage(`Verification code sent to ${cleanEmail}. Enter the 6 digits to verify.`);
      setTimeout(() => forgotOtpRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSendingForgotOtp(false);
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleVerifyForgotOtp = async (codeOverride?: string) => {
    setErrorMessage(null);
    const cleanEmail = forgotEmail.trim().toLowerCase();
    const code = codeOverride || forgotOtpDigits.join('');

    if (code.length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifyingForgotOtp(true);
    try {
      await verifyEmailOtp(cleanEmail, code);
      setForgotStep('new_password');
      setSuccessMessage('Code verified! Please enter your new password.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setIsVerifyingForgotOtp(false);
    }
  };

  const handleForgotDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const next = [...forgotOtpDigits];
    next[index] = cleaned;
    setForgotOtpDigits(next);
    if (cleaned && index < 5) {
      forgotOtpRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d.length === 1)) {
      handleVerifyForgotOtp(next.join(''));
    }
  };

  const handleForgotDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !forgotOtpDigits[index] && index > 0) {
      forgotOtpRefs.current[index - 1]?.focus();
    }
  };

  // Step 3: Save new password and redirect to Sign In
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsResettingPassword(true);
    try {
      await resetPassengerPassword(forgotEmail, newPassword);
      setEmail(forgotEmail);
      setActiveTab('signin');
      setSigninOtpSent(false);
      setSuccessMessage('Password reset successfully! Please log in with your account.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none relative">
      {/* 1. TOP HEADER */}
      <div className="p-4 px-5 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <BeeGoVoltxLogo size="sm" />
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-[#FFF9E6] text-[#E6A800] border border-[#F5C518]/30 px-2 py-0.5 rounded-full">
              Passenger
            </span>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Back to Role Selection"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. SCROLLABLE FORM CONTENT */}
      <div className="p-5 overflow-y-auto no-scrollbar flex-1 flex flex-col gap-4">
        {/* Title */}
        <div className="text-center pt-1 pb-1">
          <h2 className="text-xl font-black text-[#1A1A1A] tracking-tight">
            {activeTab === 'signup'
              ? 'Create Passenger Account'
              : activeTab === 'signin'
              ? 'Sign in to BeeGo Voltx'
              : 'Reset Your Password'}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {activeTab === 'signup'
              ? 'Register with your name, verified email, and phone number'
              : activeTab === 'signin'
              ? 'Enter your verified Gmail to receive a one-time login code'
              : 'Verify your Gmail to set a new account password'}
          </p>
        </div>

        {/* 3. TAB SWITCHER (Shown on Sign Up & Sign In) */}
        {activeTab !== 'forgot' && (
          <div className="p-1 rounded-2xl bg-zinc-100 flex items-center gap-1 border border-zinc-200/80">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'signup'
                  ? 'bg-white text-black shadow-xs font-black'
                  : 'text-zinc-500 hover:text-black font-bold'
              }`}
            >
              <span>Sign Up</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'signin'
                  ? 'bg-white text-black shadow-xs font-black'
                  : 'text-zinc-500 hover:text-black font-bold'
              }`}
            >
              <span>Sign In</span>
            </button>
          </div>
        )}

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1 leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* ========================================================= */}
        {/* OPTION A: SIGN UP FORM                                     */}
        {/* ========================================================= */}
        {activeTab === 'signup' && (
          <form onSubmit={handleCompleteSignup} className="flex flex-col gap-3.5">
            {/* 1. Full Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700 flex items-center justify-between">
                <span>Full Name <span className="text-rose-500">*</span></span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-zinc-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Tanvir Hasan"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none text-xs font-medium text-black transition-colors"
                />
              </div>
            </div>

            {/* 2. Email Address with attached Send OTP Button */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700 flex items-center justify-between">
                <span>Email Address (@gmail.com) <span className="text-rose-500">*</span></span>
                {signupEmailVerified ? (
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" /> Verified
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-600 font-bold">Verification required</span>
                )}
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 flex items-center">
                  <div className="absolute left-3 text-zinc-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (signupEmailVerified) setSignupEmailVerified(false);
                    }}
                    placeholder="name@gmail.com"
                    required
                    disabled={signupEmailVerified}
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none text-xs font-medium text-black transition-colors disabled:opacity-75 disabled:bg-emerald-50/50"
                  />
                </div>

                {!signupEmailVerified && (
                  <button
                    type="button"
                    onClick={handleSendSignupOtp}
                    disabled={isSendingSignupOtp || !email.trim().endsWith('@gmail.com')}
                    className="shrink-0 px-3.5 py-2.5 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
                  >
                    {isSendingSignupOtp ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>{signupOtpSent ? 'Resend' : 'Send OTP'}</span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* INLINE OTP SECTION: Opens downside of email address section after sending OTP */}
            {signupOtpSent && !signupEmailVerified && (
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950">Enter 6-Digit Email Code:</span>
                  <span className="text-[10px] text-amber-700 font-mono">Sent to {email}</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={signupOtpCode}
                    onChange={(e) => setSignupOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-36 py-2 px-3 text-center text-base tracking-widest font-mono font-black rounded-xl bg-white border border-amber-300 focus:border-[#F5C518] focus:outline-none text-black"
                  />

                  <button
                    type="button"
                    onClick={() => handleVerifySignupOtp()}
                    disabled={isVerifyingSignupOtp || signupOtpCode.length < 6}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs flex items-center justify-center gap-1"
                  >
                    {isVerifyingSignupOtp ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Verify Code</span>
                    )}
                  </button>
                </div>

                {/* Instant One-Tap Auto-Verify Option */}
                {signupActiveDevOtp && (
                  <button
                    type="button"
                    onClick={() => {
                      setSignupOtpCode(signupActiveDevOtp);
                      handleVerifySignupOtp(signupActiveDevOtp);
                    }}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <Zap className="w-3 h-3 fill-amber-500 text-amber-900" />
                    <span>Auto-Verify Code (Instant Test Access)</span>
                  </button>
                )}
              </div>
            )}

            {/* 3. Phone Number (Required for Driver Contact) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700 flex items-center justify-between">
                <span>Phone Number <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-zinc-400 font-medium">Captain will call this number</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 flex items-center gap-1 text-zinc-500 font-mono text-xs font-bold">
                  <span>🇧🇩</span>
                  <span>+880</span>
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="1712345678"
                  required
                  className="w-full pl-20 pr-3 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none text-xs font-mono font-medium text-black transition-colors"
                />
              </div>
            </div>

            {/* 4. Complete Registration Button */}
            <button
              type="submit"
              disabled={isLoading || !signupEmailVerified}
              className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Complete Sign Up & Enter BeeGo</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* OPTION B: SIGN IN FORM                                     */}
        {/* ========================================================= */}
        {activeTab === 'signin' && (
          <div className="flex flex-col gap-3.5">
            {/* 1. Email Input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700">Registered Gmail Address</label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  required
                  disabled={signinOtpSent}
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none text-xs font-medium text-black transition-colors disabled:opacity-75"
                />
              </div>
            </div>

            {/* Forgot Password Link Button */}
            <div className="flex items-center justify-end -mt-1">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotStep('request');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setActiveTab('forgot');
                }}
                className="text-xs font-bold text-[#E6A800] hover:text-black transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* 2. Request OTP Button (if not yet sent) */}
            {!signinOtpSent ? (
              <button
                type="button"
                onClick={() => handleSendSigninOtp()}
                disabled={isSendingSigninOtp || !email.trim().endsWith('@gmail.com')}
                className="w-full mt-1 py-3 px-4 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSendingSigninOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Requesting Code...</span>
                  </>
                ) : (
                  <>
                    <span>Request Verification OTP</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            ) : (
              /* 3. OTP verification boxes for Sign In */
              <div className="flex flex-col gap-3 pt-1 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-700">Enter 6-Digit Code</span>
                  <button
                    type="button"
                    onClick={() => setSigninOtpSent(false)}
                    className="text-[#E6A800] hover:text-black font-bold cursor-pointer"
                  >
                    Change Email
                  </button>
                </div>

                <div className="flex items-center justify-between gap-1.5 my-1">
                  {signinOtpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        signinOtpRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-mono font-black rounded-2xl bg-zinc-50 border-2 border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none transition-all shadow-2xs"
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleVerifySigninOtp()}
                  disabled={isVerifyingSigninOtp || signinOtpDigits.some((d) => !d)}
                  className="w-full py-3 px-4 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifyingSigninOtp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Enter Dashboard</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>

                {/* Instant Auto-Verify Option */}
                {signinActiveDevOtp && (
                  <button
                    type="button"
                    onClick={() => {
                      const digits = signinActiveDevOtp.split('').slice(0, 6);
                      setSigninOtpDigits(digits);
                      handleVerifySigninOtp(signinActiveDevOtp);
                    }}
                    className="w-full py-2.5 px-3 rounded-2xl bg-[#FFF9E6] hover:bg-[#F5C518] text-zinc-900 border border-[#F5C518]/50 text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98]"
                  >
                    <Zap className="w-3.5 h-3.5 fill-[#F5C518] text-black" />
                    <span>One-Tap Auto-Verify (Instant Test Access)</span>
                  </button>
                )}

                {/* Resend Cooldown */}
                <div className="text-center text-xs pt-1">
                  {signinCooldown > 0 ? (
                    <span className="text-zinc-400 font-mono">
                      Resend code in {signinCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendSigninOtp()}
                      className="font-bold text-[#E6A800] hover:text-black transition-colors cursor-pointer"
                    >
                      Didn't receive code? Resend OTP
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* OPTION C: FORGOT PASSWORD FLOW                             */}
        {/* ========================================================= */}
        {activeTab === 'forgot' && (
          <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
            {/* Back button to return to Sign In */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="self-start text-xs font-bold text-zinc-500 hover:text-black flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>

            {/* STEP 1: Enter Email & Request Reset Code */}
            {forgotStep === 'request' && (
              <form onSubmit={handleSendForgotOtp} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-700">
                    Registered Gmail Address
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-zinc-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none text-xs font-medium text-black transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingForgotOtp || !forgotEmail.trim().endsWith('@gmail.com')}
                  className="w-full mt-1 py-3 px-4 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSendingForgotOtp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send 6-Digit Reset Code</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: Enter & Verify 6-digit Code */}
            {forgotStep === 'verify' && (
              <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-700">Enter 6-Digit Code</span>
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="text-[#E6A800] hover:text-black font-bold cursor-pointer"
                  >
                    Change Email
                  </button>
                </div>

                <div className="flex items-center justify-between gap-1.5 my-1">
                  {forgotOtpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        forgotOtpRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleForgotDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleForgotDigitKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-mono font-black rounded-2xl bg-zinc-50 border-2 border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none transition-all shadow-2xs"
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleVerifyForgotOtp()}
                  disabled={isVerifyingForgotOtp || forgotOtpDigits.some((d) => !d)}
                  className="w-full py-3 px-4 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifyingForgotOtp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Code & Continue</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>

                {/* Instant Auto-Verify Option */}
                {forgotActiveDevOtp && (
                  <button
                    type="button"
                    onClick={() => {
                      const digits = forgotActiveDevOtp.split('').slice(0, 6);
                      setForgotOtpDigits(digits);
                      handleVerifyForgotOtp(forgotActiveDevOtp);
                    }}
                    className="w-full py-2.5 px-3 rounded-2xl bg-[#FFF9E6] hover:bg-[#F5C518] text-zinc-900 border border-[#F5C518]/50 text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98]"
                  >
                    <Zap className="w-3.5 h-3.5 fill-[#F5C518] text-black" />
                    <span>One-Tap Auto-Verify (Instant Test Access)</span>
                  </button>
                )}

                {/* Resend Cooldown */}
                <div className="text-center text-xs pt-1">
                  {forgotCooldown > 0 ? (
                    <span className="text-zinc-400 font-mono">
                      Resend code in {forgotCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendForgotOtp()}
                      className="font-bold text-[#E6A800] hover:text-black transition-colors cursor-pointer"
                    >
                      Didn't receive code? Resend OTP
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Enter New Password & Confirm Password */}
            {forgotStep === 'new_password' && (
              <form onSubmit={handleSaveNewPassword} className="flex flex-col gap-3.5 animate-in fade-in duration-200">
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#E6A800] shrink-0" />
                  <span>Verified for <strong>{forgotEmail}</strong>. Create your new password:</span>
                </div>

                {/* New Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-700">New Password</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      className="w-full pl-9 pr-10 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none text-xs font-medium text-black transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 text-zinc-400 hover:text-black cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-700">Confirm New Password</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      required
                      className="w-full pl-9 pr-10 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none text-xs font-medium text-black transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 text-zinc-400 hover:text-black cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isResettingPassword || !newPassword || !confirmPassword}
                  className="w-full mt-1 py-3.5 px-4 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isResettingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Save Password & Return to Sign In</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* 4. FOOTER SAFETY BADGE */}
        <div className="pt-3 mt-auto border-t border-zinc-100 flex items-center justify-center gap-1.5 text-[10px] text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted with Descope Cloud Auth • Dhaka, BD</span>
        </div>
      </div>
    </div>
  );
};
