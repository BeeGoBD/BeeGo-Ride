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
  MessageSquare,
  PhoneCall,
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
  loginWithPassword,
  resetPassengerPassword,
  requestSupportCallback,
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

// Google SVG Multi-color Icon
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
  initialMode = 'signup',
  intendedRole = 'passenger',
  onAuthenticated,
  onCancel,
}) => {
  const sdk = useDescope();

  // Navigation Tabs: 'signup' | 'signin' | 'forgot' | 'support'
  const [activeTab, setActiveTab] = useState<'signup' | 'signin' | 'forgot' | 'support'>(
    initialMode === 'login' ? 'signin' : 'signup'
  );

  // Sign In Mode: 'otp' (default) vs 'password'
  const [signinMode, setSigninMode] = useState<'password' | 'otp'>('otp');

  // Common Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up: Password setup
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Sign Up: Email OTP State
  const [signupOtpSent, setSignupOtpSent] = useState(false);
  const [signupEmailVerified, setSignupEmailVerified] = useState(false);
  const [signupOtpCode, setSignupOtpCode] = useState('');
  const [isSendingSignupOtp, setIsSendingSignupOtp] = useState(false);
  const [isVerifyingSignupOtp, setIsVerifyingSignupOtp] = useState(false);

  // Sign In: Email OTP State
  const [signinOtpSent, setSigninOtpSent] = useState(false);
  const [signinOtpDigits, setSigninOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isSendingSigninOtp, setIsSendingSigninOtp] = useState(false);
  const [isVerifyingSigninOtp, setIsVerifyingSigninOtp] = useState(false);
  const [signinCooldown, setSigninCooldown] = useState(0);

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'new_password'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtpDigits, setForgotOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isSendingForgotOtp, setIsSendingForgotOtp] = useState(false);
  const [isVerifyingForgotOtp, setIsVerifyingForgotOtp] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Support / Callback Request State ("I don't have my email")
  const [callbackName, setCallbackName] = useState('');
  const [callbackPhone, setCallbackPhone] = useState('');
  const [callbackEmail, setCallbackEmail] = useState('');
  const [hasForgottenEmail, setHasForgottenEmail] = useState(false);
  const [isSubmittingCallback, setIsSubmittingCallback] = useState(false);
  const [callbackSuccess, setCallbackSuccess] = useState(false);

  // Google Account Selector State (Fallback helper)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGooglePicker, setShowGooglePicker] = useState(false);

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
   * 1. GOOGLE OAUTH CONTINUATION
   * ==========================================
   */
  const handleContinueWithGoogle = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);

    try {
      if (typeof (sdk?.oauth as any)?.start === 'function') {
        const res = await (sdk.oauth as any).start('google');
        if (res?.data?.url) {
          window.location.href = res.data.url;
        } else {
          setShowGooglePicker(true);
        }
      } else {
        setShowGooglePicker(true);
      }
    } catch (err: any) {
      console.warn('[Google OAuth note]', err?.message);
      // Show Google Account selector sheet
      setShowGooglePicker(true);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSelectGoogleAccount = (googleEmail: string, name: string) => {
    const profile: DescopeUserProfile = {
      id: `pax_google_${Date.now().toString(36)}`,
      name,
      email: googleEmail,
      role: 'passenger',
      isEmailVerified: true,
      authMethod: 'oauth_google',
    };
    setShowGooglePicker(false);
    handleSuccessfulLogin(profile);
  };

  /**
   * ==========================================
   * 2. SIGN IN: ID & PASSWORD LOGIN
   * ==========================================
   */
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const profile = await loginWithPassword(cleanEmail, password);
      handleSuccessfulLogin(profile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ==========================================
   * 3. SIGN IN: EMAIL OTP LOGIN
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
      await dispatchEmailOtp(cleanEmail);
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
   * 4. SIGN UP FLOW (NO PHONE NUMBER)
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
      await dispatchEmailOtp(cleanEmail, fullName.trim() || undefined);
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
      setSuccessMessage('Email verified successfully! Now set your password to finish.');
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

    if (signupPassword.length < 6) {
      setErrorMessage('Please create a password with at least 6 characters.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      // Save password for future login
      await resetPassengerPassword(cleanEmail, signupPassword);

      const profile: DescopeUserProfile = {
        id: `pax_${Date.now().toString(36)}`,
        name: cleanName,
        email: cleanEmail,
        role: 'passenger',
        isEmailVerified: true,
        authMethod: 'password',
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
   * 5. FORGOT PASSWORD FLOW
   * ==========================================
   */
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
      await dispatchEmailOtp(cleanEmail);
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
      setSigninMode('password');
      setSuccessMessage('Password reset successfully! Please sign in with your new password.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  /**
   * ==========================================
   * 6. SUPPORT & CALLBACK REQUEST FLOW
   * ==========================================
   */
  const handleSubmitCallback = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = callbackName.trim();
    const cleanPhone = callbackPhone.trim();
    const cleanEmail = callbackEmail.trim().toLowerCase();

    if (!cleanName) {
      setErrorMessage('Please enter your name.');
      return;
    }

    if (!cleanPhone) {
      setErrorMessage('Please enter your contact phone number.');
      return;
    }

    const normalizedPhone = normalizeBangladeshPhone(cleanPhone);
    if (!isValidBangladeshPhone(normalizedPhone)) {
      setErrorMessage('Please enter a valid Bangladesh phone number (e.g. 01712345678).');
      return;
    }

    setIsSubmittingCallback(true);
    try {
      await requestSupportCallback({
        name: cleanName,
        phone: normalizedPhone,
        email: hasForgottenEmail ? undefined : cleanEmail,
        forgotEmail: hasForgottenEmail,
      });
      setCallbackSuccess(true);
      setSuccessMessage('Callback request received! Our support agent will call you shortly.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit callback request.');
    } finally {
      setIsSubmittingCallback(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none relative font-sans">
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

      {/* 2. SCROLLABLE CONTENT */}
      <div className="p-5 overflow-y-auto no-scrollbar flex-1 flex flex-col gap-4">
        {/* Title */}
        <div className="text-center pt-1 pb-1">
          <h2 className="text-xl font-black text-[#1A1A1A] tracking-tight">
            {activeTab === 'signup'
              ? 'Create Passenger Account'
              : activeTab === 'signin'
              ? 'Sign in to BeeGo Voltx'
              : activeTab === 'forgot'
              ? 'Reset Your Password'
              : 'Account Support & Callback'}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {activeTab === 'signup'
              ? 'Sign up with your verified Gmail and password'
              : activeTab === 'signin'
              ? signinMode === 'password'
                ? 'Sign in with your Email ID and Password'
                : 'Enter your Gmail to receive a one-time verification code'
              : activeTab === 'forgot'
              ? 'Verify your Gmail to set a new password'
              : 'Get help via WhatsApp or request an immediate phone callback'}
          </p>
        </div>

        {/* 3. SIGN UP / SIGN IN TAB SWITCHER */}
        {(activeTab === 'signup' || activeTab === 'signin') && (
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
        {/* OPTION A: SIGN UP FORM (NO PHONE NUMBER)                   */}
        {/* ========================================================= */}
        {activeTab === 'signup' && (
          <form onSubmit={handleCompleteSignup} className="flex flex-col gap-3.5">
            {/* 1. Full Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700">Full Name <span className="text-rose-500">*</span></label>
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

            {/* INLINE OTP SECTION */}
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
              </div>
            )}

            {/* 3. Create Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700">Create Password <span className="text-rose-500">*</span></label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none text-xs font-medium text-black transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3 text-zinc-400 hover:text-black cursor-pointer"
                >
                  {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 4. Confirm Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700">Confirm Password <span className="text-rose-500">*</span></label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none text-xs font-medium text-black transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !signupEmailVerified}
              className="w-full mt-1 py-3.5 px-4 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Enter BeeGo</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-200" />
              <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                Or Continue With
              </span>
              <div className="flex-grow border-t border-zinc-200" />
            </div>

            {/* Continue with Google Button */}
            <button
              type="button"
              onClick={handleContinueWithGoogle}
              disabled={isGoogleLoading}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 font-bold text-xs transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2.5 active:scale-[0.98]"
            >
              {isGoogleLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
              ) : (
                <GoogleIcon className="w-4 h-4" />
              )}
              <span>Continue with Google</span>
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* OPTION B: SIGN IN FORM (ID & PASSWORD + OTP OPTION)        */}
        {/* ========================================================= */}
        {activeTab === 'signin' && (
          <div className="flex flex-col gap-3.5">
            {/* MODE 1: PASSWORD LOGIN (DEFAULT) */}
            {signinMode === 'password' && (
              <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-3">
                {/* Email Address */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-700">Email Address (ID)</label>
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
                      className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none text-xs font-medium text-black transition-colors"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-700">Password</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full pl-9 pr-10 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none text-xs font-medium text-black transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-zinc-400 hover:text-black cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password & I don't have my email row */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotStep('request');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setActiveTab('forgot');
                    }}
                    className="font-bold text-[#E6A800] hover:text-black transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCallbackEmail(email);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setCallbackSuccess(false);
                      setActiveTab('support');
                    }}
                    className="font-semibold text-zinc-500 hover:text-black transition-colors cursor-pointer"
                  >
                    I don't have my email
                  </button>
                </div>

                {/* Submit Password Login Button */}
                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full mt-1 py-3 px-4 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In with Password</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>

                {/* Switch to OTP Verification */}
                <button
                  type="button"
                  onClick={() => {
                    setSigninMode('otp');
                    setSigninOtpSent(false);
                    setErrorMessage(null);
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Sign In with One-Time Email Code (OTP)</span>
                </button>

                {/* Divider */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-zinc-200" />
                  <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Or Continue With
                  </span>
                  <div className="flex-grow border-t border-zinc-200" />
                </div>

                {/* Continue with Google Button */}
                <button
                  type="button"
                  onClick={handleContinueWithGoogle}
                  disabled={isGoogleLoading}
                  className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 font-bold text-xs transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2.5 active:scale-[0.98]"
                >
                  {isGoogleLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
                  ) : (
                    <GoogleIcon className="w-4 h-4" />
                  )}
                  <span>Continue with Google</span>
                </button>
              </form>
            )}

            {/* MODE 2: EMAIL OTP LOGIN */}
            {signinMode === 'otp' && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700">
                  <span>Sign In via Email OTP</span>
                  <button
                    type="button"
                    onClick={() => setSigninMode('password')}
                    className="text-[#E6A800] hover:text-black font-bold cursor-pointer"
                  >
                    Use Password instead
                  </button>
                </div>

                {/* Email Input */}
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

                {!signinOtpSent ? (
                  <button
                    type="button"
                    onClick={() => handleSendSigninOtp()}
                    disabled={isSendingSigninOtp || !email.trim().endsWith('@gmail.com')}
                    className="w-full py-3 px-4 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSendingSigninOtp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Send 6-Digit Code</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex flex-col gap-3 pt-1">
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

                {/* Option to continue with ID and Password (Before Google) */}
                <button
                  type="button"
                  onClick={() => {
                    setSigninMode('password');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <KeyRound className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Continue with ID and Password</span>
                </button>

                {/* Divider */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-zinc-200" />
                  <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Or Continue With
                  </span>
                  <div className="flex-grow border-t border-zinc-200" />
                </div>

                {/* Continue with Google */}
                <div className="pt-0">
                  <button
                    type="button"
                    onClick={handleContinueWithGoogle}
                    disabled={isGoogleLoading}
                    className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 font-bold text-xs transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2.5 active:scale-[0.98]"
                  >
                    <GoogleIcon className="w-4 h-4" />
                    <span>Continue with Google</span>
                  </button>
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

            {/* STEP 1: Enter Email */}
            {forgotStep === 'request' && (
              <form onSubmit={handleSendForgotOtp} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-700">Registered Gmail Address</label>
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
                      <span>Sending Code...</span>
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

            {/* STEP 2: Verify Code */}
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

            {/* STEP 3: Set New Password */}
            {forgotStep === 'new_password' && (
              <form onSubmit={handleSaveNewPassword} className="flex flex-col gap-3.5 animate-in fade-in duration-200">
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#E6A800] shrink-0" />
                  <span>Set a new password for <strong>{forgotEmail}</strong>:</span>
                </div>

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

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-700">Confirm New Password</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none text-xs font-medium text-black transition-colors"
                    />
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

        {/* ========================================================= */}
        {/* OPTION D: SUPPORT & CALLBACK ("I don't have my email")     */}
        {/* ========================================================= */}
        {activeTab === 'support' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
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

            {/* 1. WHATSAPP INSTANT CHAT CARD */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-emerald-950 font-black text-xs">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Option 1: Chat with Support on WhatsApp</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                Our customer desk is active on WhatsApp to help recover accounts immediately.
              </p>
              <a
                href="https://wa.me/8801700000000?text=Hello%20BeeGo%20Support,%20I%20lost%20access%20to%20my%20email%20account%20and%20need%20assistance."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                <span>Open WhatsApp Support Chat</span>
              </a>
            </div>

            {/* 2. REQUEST CALLBACK FORM */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-zinc-900 font-black text-xs">
                <PhoneCall className="w-4 h-4 text-[#E6A800]" />
                <span>Option 2: Request a Callback by Phone</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Enter your details below and an agent will call your phone number directly to verify your account.
              </p>

              {callbackSuccess ? (
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Request registered! We will call you within 15-30 minutes.</span>
                </div>
              ) : (
                <form onSubmit={handleSubmitCallback} className="flex flex-col gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-700 block mb-1">Your Full Name</label>
                    <input
                      type="text"
                      value={callbackName}
                      onChange={(e) => setCallbackName(e.target.value)}
                      placeholder="e.g. Tanvir Hasan"
                      required
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-black focus:outline-none focus:border-[#F5C518]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-700 block mb-1">Contact Phone Number</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 flex items-center gap-1 text-zinc-500 font-mono text-xs font-bold">
                        <span>🇧🇩</span>
                        <span>+880</span>
                      </div>
                      <input
                        type="tel"
                        value={callbackPhone}
                        onChange={(e) => setCallbackPhone(e.target.value)}
                        placeholder="1712345678"
                        required
                        className="w-full pl-20 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-mono font-medium text-black focus:outline-none focus:border-[#F5C518]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-zinc-700">Email Address</label>
                      <label className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasForgottenEmail}
                          onChange={(e) => setHasForgottenEmail(e.target.checked)}
                          className="rounded text-[#F5C518] focus:ring-0 cursor-pointer"
                        />
                        <span>I have forgotten my email address</span>
                      </label>
                    </div>

                    {!hasForgottenEmail && (
                      <input
                        type="email"
                        value={callbackEmail}
                        onChange={(e) => setCallbackEmail(e.target.value)}
                        placeholder="name@gmail.com"
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-black focus:outline-none focus:border-[#F5C518]"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingCallback}
                    className="w-full mt-1 py-2.5 px-4 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingCallback ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PhoneCall className="w-3.5 h-3.5" />
                    )}
                    <span>Submit Callback Request</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* 4. FOOTER SAFETY BADGE */}
        <div className="pt-3 mt-auto border-t border-zinc-100 flex items-center justify-center gap-1.5 text-[10px] text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted with Descope Cloud Auth • Dhaka, BD</span>
        </div>
      </div>

      {/* 5. GOOGLE ACCOUNT SELECTOR SHEET (Fallback) */}
      {showGooglePicker && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-3 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <GoogleIcon className="w-5 h-5" />
                <span className="text-sm font-black text-black">Sign in with Google</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGooglePicker(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 font-medium">
              Choose an active Google account to instantly enter BeeGo Voltx:
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleSelectGoogleAccount('jobaerulalam2026@gmail.com', 'Jobaerul Alam')}
                className="p-3 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 flex items-center gap-3 text-left transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  J
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-black truncate">Jobaerul Alam</div>
                  <div className="text-[11px] text-zinc-500 font-mono truncate">jobaerulalam2026@gmail.com</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectGoogleAccount('passenger@gmail.com', 'BeeGo Passenger')}
                className="p-3 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 flex items-center gap-3 text-left transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-amber-500 text-black font-black text-sm flex items-center justify-center shadow-xs">
                  P
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-black truncate">BeeGo Passenger</div>
                  <div className="text-[11px] text-zinc-500 font-mono truncate">passenger@gmail.com</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
