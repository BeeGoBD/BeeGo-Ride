import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Bell,
  Users,
  Camera,
  Mic,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  checkAllPermissions,
  requestLocationPermission,
  requestNotificationPermission,
  requestContactsPermission,
  requestMediaPermissions,
  requestMotionPermission,
  setInitialPermissionsRequested,
  PermissionState,
} from '../services/permissionService';

interface AppPermissionsModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const AppPermissionsModal: React.FC<AppPermissionsModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const [locationStatus, setLocationStatus] = useState<PermissionState>('prompt');
  const [notificationStatus, setNotificationStatus] = useState<PermissionState>('prompt');
  const [contactsStatus, setContactsStatus] = useState<PermissionState>('prompt');
  const [cameraStatus, setCameraStatus] = useState<PermissionState>('prompt');
  const [micStatus, setMicStatus] = useState<PermissionState>('prompt');

  const [isRequestingAll, setIsRequestingAll] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    checkAllPermissions().then((status) => {
      setLocationStatus(status.location);
      setNotificationStatus(status.notifications);
      setContactsStatus(status.contacts);
      setCameraStatus(status.camera);
      setMicStatus(status.microphone);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Single Action: Request Location
  const handleRequestLocation = async () => {
    const res = await requestLocationPermission();
    setLocationStatus(res);
  };

  // 2. Single Action: Request Notifications
  const handleRequestNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotificationStatus(res);
  };

  // 3. Single Action: Request Contacts
  const handleRequestContacts = async () => {
    const res = await requestContactsPermission();
    setContactsStatus(res);
  };

  // 4. Single Action: Request Camera & Mic
  const handleRequestMedia = async () => {
    const res = await requestMediaPermissions();
    setCameraStatus(res.camera);
    setMicStatus(res.microphone);
  };

  // 5. MASTER ACTION: Request All Permissions in seamless sequence
  const handleRequestAll = async () => {
    setIsRequestingAll(true);

    try {
      // Step A: Location
      setCurrentStep('Requesting Live Location...');
      const locRes = await requestLocationPermission();
      setLocationStatus(locRes);

      // Step B: Push Notifications
      setCurrentStep('Requesting Trip Alerts...');
      const notifRes = await requestNotificationPermission();
      setNotificationStatus(notifRes);

      // Step C: Camera & Microphone
      setCurrentStep('Requesting Camera & Voice...');
      const mediaRes = await requestMediaPermissions();
      setCameraStatus(mediaRes.camera);
      setMicStatus(mediaRes.microphone);

      // Step D: Motion / Sensor
      await requestMotionPermission();

      // Step E: Contacts (if supported)
      if ('contacts' in navigator) {
        setCurrentStep('Requesting Emergency Contacts...');
        const contactRes = await requestContactsPermission();
        setContactsStatus(contactRes);
      }
    } catch (e) {
      console.warn('[Permissions] Master request step:', e);
    } finally {
      setIsRequestingAll(false);
      setCurrentStep(null);
      setInitialPermissionsRequested();
      // Auto finish after short delay
      setTimeout(() => {
        onComplete();
      }, 600);
    }
  };

  const handleFinish = () => {
    setInitialPermissionsRequested();
    onComplete();
  };

  const permissionsList = [
    {
      id: 'location',
      title: 'Live Location & GPS',
      subtitle: 'Accurate pickup address in Chittagong/Dhaka & live captain navigation',
      icon: MapPin,
      status: locationStatus,
      required: true,
      onRequest: handleRequestLocation,
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
      id: 'notifications',
      title: 'Push Notifications',
      subtitle: 'Instant arrival alerts when captain reaches your pickup spot & fare receipts',
      icon: Bell,
      status: notificationStatus,
      required: true,
      onRequest: handleRequestNotifications,
      bg: 'bg-amber-50 text-[#E6A800] border-amber-200',
    },
    {
      id: 'camera',
      title: 'Camera Access',
      subtitle: 'Scan vehicle & battery station QR codes and captain document verification',
      icon: Camera,
      status: cameraStatus,
      required: false,
      onRequest: handleRequestMedia,
      bg: 'bg-blue-50 text-blue-600 border-blue-200',
    },
    {
      id: 'microphone',
      title: 'Microphone & Voice',
      subtitle: 'Free direct VoIP voice calls between passenger and captain during pickup',
      icon: Mic,
      status: micStatus,
      required: false,
      onRequest: handleRequestMedia,
      bg: 'bg-purple-50 text-purple-600 border-purple-200',
    },
    {
      id: 'contacts',
      title: 'Emergency Contacts',
      subtitle: 'Share live trip route with trusted family and emergency contacts for safety',
      icon: Users,
      status: contactsStatus,
      required: false,
      onRequest: handleRequestContacts,
      bg: 'bg-teal-50 text-teal-600 border-teal-200',
    },
  ];

  const anyGranted =
    locationStatus === 'granted' ||
    notificationStatus === 'granted' ||
    cameraStatus === 'granted' ||
    micStatus === 'granted' ||
    contactsStatus === 'granted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-[420px] bg-white rounded-[32px] overflow-hidden shadow-2xl border border-zinc-200 flex flex-col max-h-[92vh]">
        {/* Top Header Card with Brand Gradient */}
        <div className="p-5 pb-4 bg-gradient-to-br from-[#1A1A1A] via-zinc-900 to-black text-white relative shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-2xl bg-[#F5C518] text-black font-black flex items-center justify-center text-sm shadow-md shadow-amber-400/30">
              B
            </span>
            <span className="text-xs uppercase font-mono font-black text-[#F5C518] tracking-widest">
              BeeGo Voltx Permissions
            </span>
          </div>

          <h2 className="text-lg font-black text-white tracking-tight">
            Enable Permissions for Best Experience
          </h2>
          <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
            Please approve the browser prompts to enable real GPS dispatch, captain arrival notifications, and trip safety.
          </p>

          <div className="absolute top-4 right-4 text-zinc-500">
            <ShieldCheck className="w-7 h-7 text-emerald-400 opacity-80" />
          </div>
        </div>

        {/* Permissions List */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-2.5 bg-[#F8F9FA]">
          {permissionsList.map((item) => {
            const Icon = item.icon;
            const isGranted = item.status === 'granted';
            const isDenied = item.status === 'denied';

            return (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-white border border-zinc-200 shadow-2xs flex items-center justify-between gap-3 hover:border-zinc-300 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${item.bg}`}>
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#1A1A1A] truncate">{item.title}</span>
                      {item.required && (
                        <span className="text-[9px] uppercase font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5 leading-snug">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isGranted ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Allowed</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={item.onRequest}
                      className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-[#F5C518] hover:text-black text-zinc-700 text-xs font-bold transition-all cursor-pointer active:scale-95 border border-zinc-200 hover:border-transparent"
                    >
                      {isDenied ? 'Retry' : 'Allow'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 bg-white border-t border-zinc-100 flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRequestAll}
            disabled={isRequestingAll}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#F5C518] hover:bg-[#E6A800] active:scale-[0.98] text-black font-black text-xs transition-all shadow-lg shadow-amber-500/25 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRequestingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>{currentStep || 'Requesting Permissions...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black fill-black" />
                <span>Grant All Permissions</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleFinish}
            className="w-full py-2.5 px-4 rounded-2xl text-zinc-500 hover:text-black font-bold text-xs transition-colors cursor-pointer text-center"
          >
            {anyGranted ? 'Continue to BeeGo' : 'Skip for Now & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};
