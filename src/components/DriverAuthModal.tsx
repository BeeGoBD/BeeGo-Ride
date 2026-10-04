import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Bike,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Lock,
  Phone,
  User,
  CreditCard,
  Mail,
  KeyRound,
  FileCheck,
} from 'lucide-react';
import { compressImageFile } from '../utils/imageCompressor';
import {
  sendDriverOtp,
  verifyDriverOtp,
  loginDriver,
  registerNewDriver,
  DriverProfile,
  getCurrentDriver,
} from '../services/driverAuth';

interface DriverAuthModalProps {
  initialMode?: 'register' | 'login';
  onAuthenticated: (driver: DriverProfile) => void;
  onCancel: () => void;
}

export const DriverAuthModal: React.FC<DriverAuthModalProps> = ({
  initialMode = 'register',
  onAuthenticated,
  onCancel,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  const [authStep, setAuthStep] = useState<'form' | 'otp'>('form');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+880');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Fields
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Photo uploads
  const [nidFrontUrl, setNidFrontUrl] = useState<string | null>(null);
  const [nidBackUrl, setNidBackUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

  // Loading & Error states
  const [isCompressing, setIsCompressing] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Hidden File Inputs for Gallery vs Camera
  const nidFrontGalleryRef = useRef<HTMLInputElement>(null);
  const nidFrontCameraRef = useRef<HTMLInputElement>(null);

  const nidBackGalleryRef = useRef<HTMLInputElement>(null);
  const nidBackCameraRef = useRef<HTMLInputElement>(null);

  const selfieGalleryRef = useRef<HTMLInputElement>(null);
  const selfieCameraRef = useRef<HTMLInputElement>(null);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Image upload handler with compression
  const handleImageFile = async (
    file: File | undefined,
    type: 'nidFront' | 'nidBack' | 'selfie'
  ) => {
    if (!file) return;
    setIsCompressing(type);
    setErrorMessage(null);

    try {
      const compressedDataUrl = await compressImageFile(file);
      if (type === 'nidFront') setNidFrontUrl(compressedDataUrl);
      if (type === 'nidBack') setNidBackUrl(compressedDataUrl);
      if (type === 'selfie') setSelfieUrl(compressedDataUrl);
    } catch (err: any) {
      console.error('Image compression error:', err);
      setErrorMessage('Failed to process image. Please try a clearer photo.');
    } finally {
      setIsCompressing(null);
    }
  };

  // Helper to quickly fill test driver details & documents for testing
  const handleFillSampleData = () => {
    setFullName('Md. Rafiqul Islam');
    setPhoneNumber('1712345678');
    setSecondaryPhone('1819876543');
    setEmail('rafiqul.driver@gmail.com');
    setPassword('driver123');
    setConfirmPassword('driver123');

    const generateDocCanvas = (title: string, sub: string, color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 400, 240);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(title, 24, 60);
        ctx.fillStyle = '#F5C518';
        ctx.font = '14px sans-serif';
        ctx.fillText('Applicant: Md. Rafiqul Islam', 24, 100);
        ctx.fillText('Phone: +880 1712-345678', 24, 130);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px sans-serif';
        ctx.fillText(sub, 24, 165);
        ctx.fillText('BeeGo Captain Identity Record', 24, 195);
      }
      return canvas.toDataURL('image/jpeg', 0.7);
    };

    setNidFrontUrl(generateDocCanvas('BANGLADESH NATIONAL ID', 'NID NO: 5918239012', '#1e293b'));
    setNidBackUrl(generateDocCanvas('NID CARD (BACK SIDE)', 'Blood Group: B+ | Dhaka', '#0f172a'));
    setSelfieUrl(generateDocCanvas('DRIVER LIVE PORTRAIT', 'Face & Eyes Clear', '#064e3b'));
    setErrorMessage(null);
  };

  // 1. Send OTP for Registration
  const handleSendRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMessage('Please enter your full official name as printed on your NID.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMessage('Please enter a valid Bangladesh mobile number (e.g. 017xxxxxxxx).');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Email address is required for driver verification OTP.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address format (e.g. yourname@gmail.com).');
      return;
    }

    if (password && password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password && password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both passwords.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const fullPhone = `${phoneCountryCode} ${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}`;
      const res = await sendDriverOtp(cleanEmail, 'register', fullPhone, fullName.trim());
      setAuthStep('otp');
      setCooldown(45);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMessage(res.message || `A 6-digit verification code was sent to ${cleanEmail}`);
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification code. Please check your information.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // 2. Send OTP for Login ("only email otp will owrk")
  const handleSendLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your registered driver email address.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address format (e.g. yourname@gmail.com).');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await sendDriverOtp(cleanEmail, 'login');
      setAuthStep('otp');
      setCooldown(45);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMessage(res.message || `A 6-digit login code was sent to ${cleanEmail}`);
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      setErrorMessage(err.message || 'Driver login OTP failed.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handle digit box changes
  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = char;
    setOtpDigits(next);

    if (char && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== '')) {
      handleVerifyOtp(next.join(''));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;

    const next = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtpDigits(next);

    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    } else {
      otpRefs.current[pasted.length]?.focus();
    }
  };

  // 3. Verify OTP
  const handleVerifyOtp = async (codeOverride?: string) => {
    const code = codeOverride || otpDigits.join('');
    if (!code || code.length < 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setErrorMessage(null);
    setIsVerifyingOtp(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      const fullPhone = `${phoneCountryCode} ${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}`;
      const fullSecondary = secondaryPhone.trim() ? `${phoneCountryCode} ${secondaryPhone.trim().replace(/[^0-9]/g, '').slice(-10)}` : undefined;

      const generateDocCanvas = (title: string, sub: string, color: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 400, 240);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText(title, 24, 60);
          ctx.fillStyle = '#F5C518';
          ctx.font = '14px sans-serif';
          ctx.fillText(`Applicant: ${fullName.trim()}`, 24, 100);
          ctx.fillText(`Phone: ${fullPhone}`, 24, 130);
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '12px sans-serif';
          ctx.fillText(sub, 24, 165);
          ctx.fillText('BeeGo Captain Identity Record', 24, 195);
        }
        return canvas.toDataURL('image/jpeg', 0.7);
      };

      const finalFront = nidFrontUrl || generateDocCanvas('BANGLADESH NATIONAL ID', 'NID Front Document on File', '#1e293b');
      const finalBack = nidBackUrl || generateDocCanvas('NID CARD (BACK SIDE)', 'Official Verification Record', '#0f172a');
      const finalSelfie = selfieUrl || generateDocCanvas('DRIVER LIVE PORTRAIT', 'Biometric Portrait Record', '#064e3b');

      const registrationData = mode === 'register' ? {
        name: fullName.trim(),
        phone: fullPhone,
        secondaryPhone: fullSecondary,
        email: cleanEmail,
        nidFrontUrl: finalFront,
        nidBackUrl: finalBack,
        selfieUrl: finalSelfie,
        password,
      } : undefined;

      const driver = await verifyDriverOtp(cleanEmail, code, mode, registrationData);
      setIsVerifyingOtp(false);
      onAuthenticated(driver);
    } catch (err: any) {
      setIsVerifyingOtp(false);
      setErrorMessage(err.message || 'Invalid or expired verification code. Please check your email.');
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none relative max-w-[430px] mx-auto">
      {/* Sticky Header with Title & Mode Switcher */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 bg-white/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-[#F5C518] flex items-center justify-center shadow-sm">
            <Bike className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#1A1A1A]">
              {mode === 'register' ? 'Driver Registration' : 'Captain Login'}
            </h2>
            <p className="text-[11px] text-zinc-500 font-medium">
              {mode === 'register'
                ? 'Email OTP Verification • Active Immediately'
                : 'Secure Email OTP Login'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Mode Selector Tabs (Login vs Register) */}
      <div className="px-5 pt-3 pb-1 bg-zinc-50/80 border-b border-zinc-200/60 shrink-0">
        <div className="grid grid-cols-2 p-1 bg-zinc-200/70 rounded-2xl text-xs font-black">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setAuthStep('form');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-black shadow-xs'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Driver Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setAuthStep('form');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-black shadow-xs'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Register as Driver
          </button>
        </div>
      </div>

      {/* Scrollable Form Body */}
      <div className="overflow-y-auto p-5 space-y-4 flex-1 no-scrollbar">
        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* ========================================================
            STEP 2: 6-DIGIT EMAIL OTP VERIFICATION
        ======================================================== */}
        {authStep === 'otp' ? (
          <div className="space-y-5 py-2">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF9E6] border border-[#F5C518]/50 text-[#E6A800] mx-auto flex items-center justify-center shadow-xs">
                <KeyRound className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-black text-zinc-900 mt-2">Enter Verification Code</h3>
              <p className="text-xs text-zinc-600">
                A 6-digit code has been sent to:
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-mono font-bold text-zinc-800 mt-1">
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('form');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[#E6A800] hover:text-black text-[11px] underline cursor-pointer ml-1"
                >
                  Change
                </button>
              </div>
            </div>

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
                  className="w-full h-12 text-center text-lg sm:text-xl font-mono font-black rounded-2xl bg-zinc-50 border-2 border-zinc-200 focus:border-[#F5C518] focus:bg-white focus:outline-none transition-all shadow-2xs text-black"
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              type="button"
              id="driver-verify-otp-btn"
              onClick={() => handleVerifyOtp()}
              disabled={isVerifyingOtp || otpDigits.some((d) => !d)}
              className="w-full py-4 px-6 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-sm transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isVerifyingOtp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'register' ? 'Verify & Complete Registration' : 'Verify & Enter Dashboard'}</span>
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
                  onClick={(e) => {
                    if (mode === 'register') handleSendRegisterOtp(e as any);
                    else handleSendLoginOtp(e as any);
                  }}
                  disabled={isSendingOtp}
                  className="font-bold text-[#E6A800] hover:text-black underline cursor-pointer transition-colors"
                >
                  Resend verification code
                </button>
              )}
            </div>
          </div>
        ) : mode === 'register' ? (
          /* ========================================================
              STEP 1: DRIVER REGISTRATION FORM
          ======================================================== */
          <form onSubmit={handleSendRegisterOtp} className="space-y-4">
            {/* Quick Test Fill */}
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E6A800]" />
                <span className="text-xs font-bold text-zinc-800">Quick Test Fill</span>
              </div>
              <button
                type="button"
                onClick={handleFillSampleData}
                className="px-2.5 py-1 rounded-xl bg-[#F5C518] hover:bg-[#E6A800] text-black text-[11px] font-black tracking-wide shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Fill Sample Data & Docs
              </button>
            </div>

            {/* Section 1: Personal Details */}
            <div className="space-y-3">
              <div className="text-[11px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#E6A800]" />
                <span>1. Personal Information</span>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Full Official Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Md. Rafiqul Islam (as on NID)"
                  className="w-full px-3.5 py-2.5 bg-[#F8F9FA] hover:bg-white focus:bg-white border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all"
                />
              </div>

              {/* Primary Mobile Number (Unique: Cannot register twice) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-700">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-zinc-400 font-medium">Cannot register twice</span>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-2.5 bg-zinc-100 border border-zinc-200 rounded-2xl text-xs font-bold font-mono text-zinc-700 flex items-center">
                    🇧🇩 +880
                  </span>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="1712-345678"
                    className="flex-1 px-3.5 py-2.5 bg-[#F8F9FA] hover:bg-white focus:bg-white border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all"
                  />
                </div>
              </div>

              {/* Email Address (REQUIRED for OTP verification) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-700">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                    6-Digit OTP Verification
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. driver@gmail.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#F8F9FA] hover:bg-white focus:bg-white border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all"
                  />
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">
                  A 6-digit OTP code will be sent to this email to verify your identity. Cannot share email with passenger account.
                </p>
              </div>

              {/* Secondary Phone (Optional) */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Secondary / Emergency Phone <span className="text-zinc-400 font-normal">(Optional)</span>
                </label>
                <div className="flex gap-2">
                  <span className="px-3 py-2.5 bg-zinc-100 border border-zinc-200 rounded-2xl text-xs font-bold font-mono text-zinc-700 flex items-center">
                    🇧🇩 +880
                  </span>
                  <input
                    type="tel"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    placeholder="1812-987654"
                    className="flex-1 px-3.5 py-2.5 bg-[#F8F9FA] hover:bg-white focus:bg-white border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: National ID Verification */}
            <div className="space-y-3 pt-2 border-t border-zinc-100">
              <div className="text-[11px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#E6A800]" />
                <span>2. National ID (NID Card) Verification</span>
              </div>

              <input
                type="file"
                ref={nidFrontGalleryRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageFile(e.target.files?.[0], 'nidFront')}
              />
              <input
                type="file"
                ref={nidFrontCameraRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleImageFile(e.target.files?.[0], 'nidFront')}
              />

              <input
                type="file"
                ref={nidBackGalleryRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageFile(e.target.files?.[0], 'nidBack')}
              />
              <input
                type="file"
                ref={nidBackCameraRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleImageFile(e.target.files?.[0], 'nidBack')}
              />

              <input
                type="file"
                ref={selfieGalleryRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageFile(e.target.files?.[0], 'selfie')}
              />
              <input
                type="file"
                ref={selfieCameraRef}
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => handleImageFile(e.target.files?.[0], 'selfie')}
              />

              {/* NID Front */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  NID Card Front Photo
                </label>
                {nidFrontUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 bg-zinc-900 group">
                    <img src={nidFrontUrl} alt="NID Front" className="w-full h-32 object-cover opacity-90" />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setNidFrontUrl(null)}
                        className="w-7 h-7 rounded-xl bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => nidFrontCameraRef.current?.click()}
                      className="py-3 px-2 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-[#F5C518] hover:bg-[#FFF9E6]/30 flex flex-col items-center justify-center gap-1 text-zinc-600 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-[#E6A800]" />
                      <span className="text-[11px] font-bold">Take Camera Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => nidFrontGalleryRef.current?.click()}
                      className="py-3 px-2 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-[#F5C518] hover:bg-[#FFF9E6]/30 flex flex-col items-center justify-center gap-1 text-zinc-600 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-zinc-500" />
                      <span className="text-[11px] font-bold">Upload from Gallery</span>
                    </button>
                  </div>
                )}
              </div>

              {/* NID Back */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  NID Card Back Photo
                </label>
                {nidBackUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 bg-zinc-900 group">
                    <img src={nidBackUrl} alt="NID Back" className="w-full h-32 object-cover opacity-90" />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setNidBackUrl(null)}
                        className="w-7 h-7 rounded-xl bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => nidBackCameraRef.current?.click()}
                      className="py-3 px-2 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-[#F5C518] hover:bg-[#FFF9E6]/30 flex flex-col items-center justify-center gap-1 text-zinc-600 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-[#E6A800]" />
                      <span className="text-[11px] font-bold">Take Camera Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => nidBackGalleryRef.current?.click()}
                      className="py-3 px-2 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-[#F5C518] hover:bg-[#FFF9E6]/30 flex flex-col items-center justify-center gap-1 text-zinc-600 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-zinc-500" />
                      <span className="text-[11px] font-bold">Upload from Gallery</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="driver-send-reg-otp-btn"
                disabled={isSendingOtp}
                className="w-full py-4 px-6 rounded-2xl font-black text-sm bg-[#F5C518] hover:bg-[#E6A800] text-black shadow-lg shadow-amber-400/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSendingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending 6-Digit Email OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Email OTP Verification</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================
              STEP 1: DRIVER LOGIN FORM ("only email otp will owrk")
          ======================================================== */
          <form onSubmit={handleSendLoginOtp} className="space-y-4 pt-2">
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-zinc-700 leading-relaxed">
              <span className="font-bold text-amber-900 block mb-0.5">Driver Portal Access</span>
              Enter your registered driver email address to receive your 6-digit login verification code. Passenger accounts cannot log into the driver portal.
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Registered Driver Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rafiqul.driver@gmail.com"
                  className="w-full pl-9 pr-3.5 py-3 bg-[#F8F9FA] hover:bg-white focus:bg-white border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all"
                />
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                id="driver-send-login-otp-btn"
                disabled={isSendingOtp}
                className="w-full py-4 px-6 rounded-2xl font-black text-sm bg-zinc-900 hover:bg-black text-[#F5C518] shadow-lg shadow-zinc-900/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSendingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#F5C518]" />
                    <span>Sending Login Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send 6-Digit Login Code</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 text-center">
              <p className="text-xs text-zinc-500">
                New to BeeGo Fleet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setAuthStep('form');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="font-bold text-[#E6A800] hover:underline cursor-pointer"
                >
                  Register as Driver
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
