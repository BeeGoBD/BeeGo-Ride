import React, { useState, useRef } from 'react';
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
  RefreshCw,
  Trash2,
  Lock,
  Phone,
  User,
  CreditCard,
  Smile,
  FileCheck,
} from 'lucide-react';
import { compressImageFile } from '../utils/imageCompressor';
import {
  registerNewDriver,
  loginDriver,
  DriverProfile,
  getCurrentDriver,
} from '../services/driverAuth';

interface DriverAuthModalProps {
  initialMode?: 'register' | 'login';
  onAuthenticated: (driver: DriverProfile) => void;
  onCancel: () => void;
  onOpenAdminGate?: () => void;
}

export const DriverAuthModal: React.FC<DriverAuthModalProps> = ({
  initialMode = 'register',
  onAuthenticated,
  onCancel,
  onOpenAdminGate,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+880');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Photo uploads
  const [nidFrontUrl, setNidFrontUrl] = useState<string | null>(null);
  const [nidBackUrl, setNidBackUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

  // Loading & Error states
  const [isCompressing, setIsCompressing] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hidden File Inputs for Gallery vs Camera
  const nidFrontGalleryRef = useRef<HTMLInputElement>(null);
  const nidFrontCameraRef = useRef<HTMLInputElement>(null);

  const nidBackGalleryRef = useRef<HTMLInputElement>(null);
  const nidBackCameraRef = useRef<HTMLInputElement>(null);

  const selfieGalleryRef = useRef<HTMLInputElement>(null);
  const selfieCameraRef = useRef<HTMLInputElement>(null);

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

  // Submit Driver Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMessage('Please enter your full official name as printed on your NID.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMessage('Please enter a valid Bangladesh mobile number (e.g. 017xxxxxxxx).');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both passwords.');
      return;
    }

    setIsSubmitting(true);

    try {
      const fullPhone = `${phoneCountryCode} ${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}`;
      const fullSecondary = secondaryPhone.trim() ? `${phoneCountryCode} ${secondaryPhone.trim().replace(/[^0-9]/g, '').slice(-10)}` : undefined;

      // Provide clear document previews if photos were not uploaded
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
          ctx.fillText('BeeGo Operations Manual Verification Required', 24, 195);
        }
        return canvas.toDataURL('image/jpeg', 0.7);
      };

      const finalFront = nidFrontUrl || generateDocCanvas('BANGLADESH NATIONAL ID', 'NID Front Document on File', '#1e293b');
      const finalBack = nidBackUrl || generateDocCanvas('NID CARD (BACK SIDE)', 'Official Verification Record', '#0f172a');
      const finalSelfie = selfieUrl || generateDocCanvas('DRIVER LIVE PORTRAIT', 'Biometric Portrait Record', '#064e3b');

      await registerNewDriver({
        name: fullName.trim(),
        phone: fullPhone,
        secondaryPhone: fullSecondary,
        email: email.trim().toLowerCase() || undefined,
        nidFrontUrl: finalFront,
        nidBackUrl: finalBack,
        selfieUrl: finalSelfie,
        password,
      });

      setIsSubmitting(false);
      setIsSubmittedSuccess(true);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Registration failed. Please check your information.');
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
        ctx.fillText('BeeGo Operations Manual Verification Required', 24, 195);
      }
      return canvas.toDataURL('image/jpeg', 0.7);
    };

    setNidFrontUrl(generateDocCanvas('BANGLADESH NATIONAL ID', 'NID NO: 5918239012', '#1e293b'));
    setNidBackUrl(generateDocCanvas('NID CARD (BACK SIDE)', 'Blood Group: B+ | Dhaka', '#0f172a'));
    setSelfieUrl(generateDocCanvas('DRIVER LIVE PORTRAIT', 'Face & Eyes Clear', '#064e3b'));
    setErrorMessage(null);
  };

  // Submit Driver Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMessage('Please enter your registered phone number.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your driver account password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const driver = await loginDriver(cleanPhone, password);
      setIsSubmitting(false);
      onAuthenticated(driver);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Login failed.');
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none relative">
      {/* Sticky Header with Title & Mode Switcher */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 bg-white/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-[#F5C518] flex items-center justify-center shadow-sm">
              <Bike className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1A1A1A]">
                {mode === 'register' ? 'Driver Registration' : 'Captain Login'}
              </h2>
              <p className="text-[11px] text-zinc-500 font-medium">
                {mode === 'register' ? 'Join BeeGo Voltx • Earn flexible daily income' : 'Access your driver dashboard'}
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
                setErrorMessage(null);
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
                setErrorMessage(null);
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
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* Submission Under Review State */}
          {isSubmittedSuccess ? (
            <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border-2 border-[#F5C518] text-[#E6A800] flex items-center justify-center shadow-lg shadow-amber-500/10">
                <Clock className="w-8 h-8 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-black text-zinc-900">Registration Request Submitted</h3>
              <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
                Driver registration is <span className="font-bold text-zinc-900">completely manual</span>. Your application has been sent to the BeeGo Admin Panel. Our operations team will review your NID and documents for verification. Once approved in the Admin Panel, you can log in immediately.
              </p>
              <div className="w-full p-3 rounded-2xl bg-zinc-100 border border-zinc-200 text-left text-xs font-mono space-y-1.5">
                <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Application Summary:</div>
                <div className="text-zinc-900 font-bold">Driver: {fullName}</div>
                <div className="text-zinc-800">Phone: {phoneNumber}</div>
                {secondaryPhone && <div className="text-zinc-500 text-[11px]">Alt Phone: {secondaryPhone}</div>}
                {email && <div className="text-zinc-600 text-[11px]">Email: {email}</div>}
                <div className="pt-1 flex items-center gap-1.5 text-amber-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Status: Pending Admin Approval</span>
                </div>
              </div>
              <div className="w-full flex flex-col gap-2 mt-2">
                {onOpenAdminGate && (
                  <button
                    type="button"
                    onClick={onOpenAdminGate}
                    className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-black text-[#F5C518] font-black text-xs uppercase tracking-wider cursor-pointer shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Open Admin Panel to Approve Driver</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmittedSuccess(false);
                    setMode('login');
                  }}
                  className="w-full py-2.5 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <span>Go to Driver Login</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full py-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Informative Manual Verification or Error Banner */}
              {errorMessage && (errorMessage.includes('manual verification') || errorMessage.includes('manual review') || errorMessage.includes('pending')) ? (
                <div className="p-4 rounded-3xl bg-amber-500/10 border-2 border-[#F5C518] text-amber-950 text-xs space-y-2.5 shadow-sm animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#F5C518] text-black flex items-center justify-center shrink-0 shadow-xs">
                      <Clock className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-xs text-zinc-900">Application Under Manual Review</div>
                      <p className="text-zinc-700 text-[11px] mt-1 leading-relaxed">
                        Driver registration is <strong>completely manual</strong>. The BeeGo operations admin must verify your National ID and approve your account from the Admin Panel before you can log in.
                      </p>
                    </div>
                  </div>

                  <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
                    {onOpenAdminGate && (
                      <button
                        type="button"
                        onClick={onOpenAdminGate}
                        className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-black text-[#F5C518] font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Open Admin Panel to Approve</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLoginSubmit}
                      className="w-full sm:w-auto py-2 px-3 rounded-xl bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Re-Check Status</span>
                    </button>
                  </div>
                </div>
              ) : errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1 font-semibold leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* ========================================================
                  REGISTER AS DRIVER FORM
              ======================================================== */}
              {mode === 'register' ? (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {/* Quick Test Demo Data Auto-Fill Button */}
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#B38000] shrink-0" />
                      <div className="text-[11px] font-bold text-amber-950">
                        Testing Driver Flow?
                      </div>
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
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Tanvir Ahmed (as on NID)"
                        className="w-full px-3.5 py-2.5 bg-[#F8F9FA] hover:bg-white focus:bg-white border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all"
                      />
                    </div>

                    {/* Primary Phone Number (Used for client calls) */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Primary Phone Number (For Client Calls) <span className="text-rose-500">*</span>
                      </label>
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

                    {/* Secondary Emergency Phone (Not used for client calls) */}
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
                          placeholder="1812-987654 (Optional)"
                          className="flex-1 px-3.5 py-2.5 bg-[#F8F9FA] hover:bg-white focus:bg-white border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all"
                        />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Email Address <span className="text-zinc-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. driver@gmail.com (Optional)"
                        className="w-full px-3.5 py-2.5 bg-[#F8F9FA] hover:bg-white focus:bg-white border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all"
                      />
                    </div>
                  </div>

              {/* Section 2: NID Verification (Front & Back) */}
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <div className="text-[11px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#E6A800]" />
                  <span>2. National ID (NID Card) Verification</span>
                </div>

                {/* Hidden File Inputs for NID Front */}
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

                {/* Hidden File Inputs for NID Back */}
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

                {/* NID FRONT CARD */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      NID Front Side <span className="text-rose-500">*</span>
                    </span>
                    {nidFrontUrl && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Photo Ready
                      </span>
                    )}
                  </div>

                  {nidFrontUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-200 bg-zinc-900 group">
                      <img
                        src={nidFrontUrl}
                        alt="NID Front Preview"
                        className="w-full h-32 object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => nidFrontGalleryRef.current?.click()}
                          className="px-2.5 py-1 rounded-lg bg-white text-xs font-bold text-black"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => setNidFrontUrl(null)}
                          className="p-1 rounded-lg bg-rose-600 text-white"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => nidFrontGalleryRef.current?.click()}
                        disabled={isCompressing === 'nidFront'}
                        className="p-3 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 flex flex-col items-center justify-center gap-1 text-xs font-bold text-zinc-700 cursor-pointer active:scale-95 transition-all"
                      >
                        <Upload className="w-4 h-4 text-[#E6A800]" />
                        <span>Upload Gallery</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => nidFrontCameraRef.current?.click()}
                        disabled={isCompressing === 'nidFront'}
                        className="p-3 rounded-xl bg-[#FFF9E6] hover:bg-[#F5C518]/20 border border-[#F5C518]/50 flex flex-col items-center justify-center gap-1 text-xs font-bold text-[#1A1A1A] cursor-pointer active:scale-95 transition-all"
                      >
                        <Camera className="w-4 h-4 text-[#E6A800]" />
                        <span>Take Photo</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* NID BACK CARD */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      NID Back Side <span className="text-rose-500">*</span>
                    </span>
                    {nidBackUrl && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Photo Ready
                      </span>
                    )}
                  </div>

                  {nidBackUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-200 bg-zinc-900 group">
                      <img
                        src={nidBackUrl}
                        alt="NID Back Preview"
                        className="w-full h-32 object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => nidBackGalleryRef.current?.click()}
                          className="px-2.5 py-1 rounded-lg bg-white text-xs font-bold text-black"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => setNidBackUrl(null)}
                          className="p-1 rounded-lg bg-rose-600 text-white"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => nidBackGalleryRef.current?.click()}
                        disabled={isCompressing === 'nidBack'}
                        className="p-3 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 flex flex-col items-center justify-center gap-1 text-xs font-bold text-zinc-700 cursor-pointer active:scale-95 transition-all"
                      >
                        <Upload className="w-4 h-4 text-[#E6A800]" />
                        <span>Upload Gallery</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => nidBackCameraRef.current?.click()}
                        disabled={isCompressing === 'nidBack'}
                        className="p-3 rounded-xl bg-[#FFF9E6] hover:bg-[#F5C518]/20 border border-[#F5C518]/50 flex flex-col items-center justify-center gap-1 text-xs font-bold text-[#1A1A1A] cursor-pointer active:scale-95 transition-all"
                      >
                        <Camera className="w-4 h-4 text-[#E6A800]" />
                        <span>Take Photo</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Driver Face Selfie */}
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <div className="text-[11px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                  <Smile className="w-3.5 h-3.5 text-[#E6A800]" />
                  <span>3. Clear Face Selfie</span>
                </div>

                {/* Hidden File Inputs for Selfie */}
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

                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-800 block">
                        Driver Live Portrait / Selfie <span className="text-rose-500">*</span>
                      </span>
                      <span className="text-[10px] text-zinc-500 block">
                        Ensure eyes, nose, mouth & ears are clearly visible without sunglasses.
                      </span>
                    </div>
                    {selfieUrl && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Selfie Ready
                      </span>
                    )}
                  </div>

                  {selfieUrl ? (
                    <div className="relative w-28 h-28 mx-auto rounded-full overflow-hidden border-3 border-[#F5C518] shadow-md bg-zinc-900 group mt-2">
                      <img
                        src={selfieUrl}
                        alt="Selfie Preview"
                        className="w-full h-full object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => selfieCameraRef.current?.click()}
                          className="px-2 py-1 rounded bg-white text-[10px] font-bold text-black"
                        >
                          Retake
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => selfieGalleryRef.current?.click()}
                        disabled={isCompressing === 'selfie'}
                        className="p-3 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 flex flex-col items-center justify-center gap-1 text-xs font-bold text-zinc-700 cursor-pointer active:scale-95 transition-all"
                      >
                        <Upload className="w-4 h-4 text-[#E6A800]" />
                        <span>Upload Selfie</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => selfieCameraRef.current?.click()}
                        disabled={isCompressing === 'selfie'}
                        className="p-3 rounded-xl bg-[#FFF9E6] hover:bg-[#F5C518]/20 border border-[#F5C518]/50 flex flex-col items-center justify-center gap-1 text-xs font-bold text-[#1A1A1A] cursor-pointer active:scale-95 transition-all"
                      >
                        <Camera className="w-4 h-4 text-[#E6A800]" />
                        <span>Live Camera</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Account Security & Password */}
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <div className="text-[11px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#E6A800]" />
                  <span>4. Password & Security</span>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Create Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-[#F8F9FA] hover:bg-white focus:bg-white border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full px-3.5 py-2.5 bg-[#F8F9FA] hover:bg-white focus:bg-white border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <span className="text-[10px] text-rose-500 font-bold block mt-1">
                      Passwords do not match
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 rounded-2xl font-black text-sm bg-[#F5C518] hover:bg-[#E6A800] text-black shadow-lg shadow-amber-400/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting Registration Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Request to Become a Driver</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================
               DRIVER LOGIN FORM
            ======================================================== */
            <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Registered Mobile Number
                </label>
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

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-[#F8F9FA] hover:bg-white focus:bg-white border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-900 focus:outline-none focus:border-[#F5C518] focus:ring-2 focus:ring-[#F5C518]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 rounded-2xl font-black text-sm bg-zinc-900 hover:bg-black text-[#F5C518] shadow-lg shadow-zinc-900/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#F5C518]" />
                      <span>Logging into Driver Portal...</span>
                    </>
                  ) : (
                    <>
                      <span>Login to Driver Portal</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 text-center">
                <p className="text-xs text-zinc-500">
                  New to BeeGo Voltx?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMessage(null);
                    }}
                    className="font-bold text-[#E6A800] hover:underline cursor-pointer"
                  >
                    Register as Driver
                  </button>
                </p>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  </div>
  );
};
