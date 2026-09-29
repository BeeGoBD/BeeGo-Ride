import { useState, useEffect } from 'react';
import { LocationPoint, RouteData, RideStage, UserRole, RideRequest } from './types';
import { getGeoapifyApiKey, saveGeoapifyApiKey, calculateRoute } from './services/geoapify';
import {
  subscribeToRideUpdates,
  requestNewRide,
  cancelRide,
  clearCurrentRide,
  generatePassengerId,
  generateRiderId,
} from './services/rideSync';
import { BeegoIntroSplash } from './components/BeegoIntroSplash';
import { BeegoOnboarding } from './components/BeegoOnboarding';
import { RoleSelectDashboard } from './components/RoleSelectDashboard';
import { PassengerAppShell } from './components/PassengerAppShell';
import { RiderAppShell } from './components/RiderAppShell';
import { UberLiveTracking } from './components/UberLiveTracking';
import { PassengerAuthModal } from './components/PassengerAuthModal';
import { DriverAuthModal } from './components/DriverAuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminSecretGateModal } from './components/AdminSecretGateModal';
import { getAdminToken, logoutAdmin } from './services/adminService';
import {
  getCurrentPassenger,
  logoutPassenger,
  PassengerProfile,
} from './services/passengerAuth';
import { getCurrentDriver, DriverProfile } from './services/driverAuth';
import './lib/appwrite';

type AppIntroState = 'splash' | 'onboarding' | 'ready';

export default function App() {
  // Intro splash: 2-second clean B logo & BeeGo text intro, then immediately starts the app
  const [introState, setIntroState] = useState<AppIntroState>('splash');

  // Role selection state: default to 'passenger' so the main dashboard with bottom navigation is shown immediately in first eye
  const [role, setRole] = useState<UserRole | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paramRole = params.get('role');
      if (paramRole === 'passenger' || paramRole === 'rider' || paramRole === 'admin') {
        return paramRole as UserRole;
      }
      const storedRole = localStorage.getItem('beego_user_role');
      if (storedRole === 'passenger' || storedRole === 'rider' || storedRole === 'admin') {
        return storedRole as UserRole;
      }
    }
    return 'passenger';
  });

  const [pendingRoleForAuth, setPendingRoleForAuth] = useState<UserRole>('passenger');
  const [isAdminGateOpen, setIsAdminGateOpen] = useState(false);

  // Generated Guest IDs
  const [passengerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('geoapify_guest_pax_id');
      if (stored) return stored;
      const newId = generatePassengerId();
      sessionStorage.setItem('geoapify_guest_pax_id', newId);
      return newId;
    }
    return generatePassengerId();
  });

  const [riderId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('geoapify_guest_rider_id');
      if (stored) return stored;
      const newId = generateRiderId();
      sessionStorage.setItem('geoapify_guest_rider_id', newId);
      return newId;
    }
    return generateRiderId();
  });

  const [passengerProfile, setPassengerProfile] = useState<PassengerProfile | null>(null);
  const [passengerAuthModalMode, setPassengerAuthModalMode] = useState<'signup' | 'login' | null>(null);

  // Driver profile & auth modal state
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(() => getCurrentDriver());
  const [driverAuthModalMode, setDriverAuthModalMode] = useState<'register' | 'login' | null>(null);

  // Check for existing active passenger session
  useEffect(() => {
    getCurrentPassenger()
      .then((profile) => {
        if (profile) {
          setPassengerProfile(profile);
        }
      })
      .catch(() => {});
  }, []);

  const [stage, setStage] = useState<RideStage>('request');
  const [apiKey, setApiKey] = useState<string>(() => getGeoapifyApiKey());
  const [pickup, setPickup] = useState<LocationPoint | null>(null);
  const [dropoff, setDropoff] = useState<LocationPoint | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronized active ride state across all components and tabs
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);

  // Subscribe to real-time ride updates
  useEffect(() => {
    const unsubscribe = subscribeToRideUpdates((ride) => {
      setActiveRide(ride);

      const isInFlight =
        ride &&
        (ride.status === 'requested' ||
          ride.status === 'accepted' ||
          ride.status === 'arrived_at_pickup' ||
          ride.status === 'in_transit');

      if (isInFlight) {
        setPickup(ride.pickup);
        setDropoff(ride.dropoff);
        if (ride.routeData) setRouteData(ride.routeData);

        if (ride.status === 'in_transit' && ride.routeData) {
          setStage('navigation');
        }
      } else if (!ride || ride.status === 'completed' || ride.status === 'cancelled' || ride.status === 'declined') {
        if (ride?.status === 'cancelled' || ride?.status === 'declined') {
          setPickup(null);
          setDropoff(null);
          setRouteData(null);
        }
        if (stage === 'navigation') {
          setStage('request');
        }
      }
    });

    return () => unsubscribe();
  }, [stage]);

  const handleApiKeyChange = (newKey: string) => {
    setApiKey(newKey);
    saveGeoapifyApiKey(newKey);
  };

  // User chooses role after onboarding
  const handleSelectRole = (selectedRole: UserRole) => {
    setPendingRoleForAuth(selectedRole);
    if (selectedRole === 'rider') {
      const activeDriver = getCurrentDriver();
      if (!activeDriver) {
        setDriverAuthModalMode('register');
        return;
      }
      setDriverProfile(activeDriver);
      setRole('rider');
      if (typeof window !== 'undefined') {
        localStorage.setItem('beego_user_role', 'rider');
      }
      setErrorMessage(null);
      return;
    }

    if (!passengerProfile) {
      setPassengerAuthModalMode('signup');
      return;
    }
    setRole(selectedRole);
    if (typeof window !== 'undefined') {
      localStorage.setItem('beego_user_role', selectedRole);
    }
    setErrorMessage(null);
  };

  const handleBackToRoles = () => {
    setRole(null);
    setErrorMessage(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('beego_user_role');
      const url = new URL(window.location.href);
      url.searchParams.delete('role');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSwitchToPassenger = () => {
    setPendingRoleForAuth('passenger');
    if (!passengerProfile) {
      setPassengerAuthModalMode('signup');
      return;
    }
    setRole('passenger');
    if (typeof window !== 'undefined') {
      localStorage.setItem('beego_user_role', 'passenger');
    }
    setErrorMessage(null);
  };

  const handleSwitchToRider = () => {
    setPendingRoleForAuth('rider');
    const activeDriver = getCurrentDriver();
    if (!activeDriver) {
      setDriverAuthModalMode('register');
      return;
    }
    setDriverProfile(activeDriver);
    setRole('rider');
    if (typeof window !== 'undefined') {
      localStorage.setItem('beego_user_role', 'rider');
    }
    setErrorMessage(null);
  };

  const handleReplayIntro = () => {
    sessionStorage.removeItem('beego_intro_completed');
    sessionStorage.removeItem('bigo_intro_completed');
    setIntroState('splash');
  };

  // Passenger clicks "Request for Ride"
  const handleRequestRide = async () => {
    if (!pickup || !dropoff) {
      setErrorMessage('Please select both pickup and drop-off spots.');
      return;
    }

    const keyToUse = apiKey.trim() || getGeoapifyApiKey();
    if (!keyToUse) {
      setErrorMessage('Please enter your Geoapify API key to calculate the route.');
      return;
    }

    setIsLoadingRoute(true);
    setErrorMessage(null);

    try {
      const route = await calculateRoute(pickup, dropoff, keyToUse);
      setRouteData(route);
      requestNewRide(passengerId, pickup, dropoff, route);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to calculate navigation route using Geoapify.');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handleCancelRide = () => {
    cancelRide();
    clearCurrentRide();
    setPickup(null);
    setDropoff(null);
    setRouteData(null);
    setStage('request');
  };

  const handleResetRide = () => {
    clearCurrentRide();
    setPickup(null);
    setDropoff(null);
    setRouteData(null);
    setStage('request');
  };

  // 1. INTRO SPLASH: 2-second clean B logo & BeeGo text, then app starts directly
  if (introState === 'splash') {
    return <BeegoIntroSplash onComplete={() => setIntroState('ready')} />;
  }

  // 2. ONBOARDING SLIDES: 4 slides with next/back buttons
  if (introState === 'onboarding') {
    return (
      <BeegoOnboarding
        onFinish={() => {
          sessionStorage.setItem('beego_intro_completed', 'true');
          setIntroState('ready');
        }}
      />
    );
  }

  // Render content based on current route/role
  let content: React.ReactNode = null;

  // DEDICATED SEPARATE PAGE: SECURE ADMIN OPERATIONS PANEL
  if (role === 'admin') {
    return (
      <div className="w-full h-[100dvh] bg-zinc-950 text-white overflow-hidden flex flex-col font-sans select-none">
        <AdminDashboard
          onExit={() => {
            logoutAdmin();
            setRole(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('beego_user_role');
              const url = new URL(window.location.href);
              url.searchParams.delete('role');
              window.history.replaceState({}, '', url.toString());
            }
          }}
        />
      </div>
    );
  }

  // 3. ROLE SELECTION: "Continue as Passenger" or "Continue as Rider"
  if (role === null) {
    content = (
      <RoleSelectDashboard
        onSelectRole={handleSelectRole}
        onOpenPassengerAuth={(mode) => {
          setPendingRoleForAuth('passenger');
          setPassengerAuthModalMode(mode);
        }}
        onOpenDriverAuth={(driverMode) => {
          setDriverAuthModalMode(driverMode);
        }}
        onOpenAdminGate={() => setIsAdminGateOpen(true)}
      />
    );
  } else if (role === 'rider') {
    // 4. RIDER VIEW
    if (
      activeRide &&
      (activeRide.status === 'accepted' ||
        activeRide.status === 'arrived_at_pickup' ||
        activeRide.status === 'in_transit' ||
        activeRide.status === 'completed')
    ) {
      content = (
        <UberLiveTracking
          role="rider"
          activeRide={activeRide}
          apiKey={apiKey}
          onBackToRoles={handleBackToRoles}
          onSwitchRole={handleSwitchToPassenger}
          onResetRide={handleResetRide}
        />
      );
    } else {
      content = (
        <RiderAppShell
          riderId={riderId}
          activeRide={activeRide}
          apiKey={apiKey}
          onApiKeyChange={handleApiKeyChange}
          onBackToRoles={handleBackToRoles}
          onSwitchToPassenger={handleSwitchToPassenger}
          onReplayIntro={handleReplayIntro}
        />
      );
    }
  } else {
    // 5. PASSENGER VIEW
    if (
      activeRide &&
      (activeRide.status === 'accepted' ||
        activeRide.status === 'arrived_at_pickup' ||
        activeRide.status === 'in_transit' ||
        activeRide.status === 'completed')
    ) {
      content = (
        <UberLiveTracking
          role="passenger"
          activeRide={activeRide}
          apiKey={apiKey}
          onBackToRoles={handleBackToRoles}
          onSwitchRole={handleSwitchToRider}
          onResetRide={handleResetRide}
        />
      );
    } else {
      content = (
        <PassengerAppShell
          apiKey={apiKey}
          onApiKeyChange={handleApiKeyChange}
          passengerId={passengerProfile?.name || passengerId}
          passengerProfile={passengerProfile}
          pickup={pickup}
          setPickup={setPickup}
          dropoff={dropoff}
          setDropoff={setDropoff}
          routeData={routeData}
          onRequestRide={handleRequestRide}
          isLoadingRoute={isLoadingRoute}
          errorMessage={errorMessage}
          setErrorMessage={setErrorMessage}
          activeRide={activeRide}
          onCancelRide={handleCancelRide}
          onResetRide={handleResetRide}
          onBackToRoles={handleBackToRoles}
          onSwitchToRider={handleSwitchToRider}
          onReplayIntro={handleReplayIntro}
          onOpenAuthModal={() => {
            setPendingRoleForAuth('passenger');
            setPassengerAuthModalMode('login');
          }}
        />
      );
    }
  }

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] bg-[#F1F3F5] flex items-center justify-center p-0 sm:p-2 sm:py-3 overflow-hidden font-sans text-[#1A1A1A]">
      <div className="w-full max-w-[430px] h-full sm:h-full sm:max-h-[880px] sm:rounded-[32px] bg-[#FFFFFF] shadow-2xl flex flex-col overflow-hidden relative border border-zinc-200/80">
        {content}

        {/* Passenger Login / Signup Modal */}
        {passengerAuthModalMode && (
          <PassengerAuthModal
            initialMode={passengerAuthModalMode}
            intendedRole={pendingRoleForAuth}
            onAuthenticated={(profile, authedRole) => {
              setPassengerProfile(profile);
              setPassengerAuthModalMode(null);
              const targetRole = authedRole || pendingRoleForAuth || 'passenger';
              setRole(targetRole);
              if (typeof window !== 'undefined') {
                localStorage.setItem('beego_user_role', targetRole);
              }
            }}
            onCancel={() => setPassengerAuthModalMode(null)}
          />
        )}

        {/* Driver Login / Register Modal */}
        {driverAuthModalMode && (
          <DriverAuthModal
            initialMode={driverAuthModalMode}
            onAuthenticated={(driver) => {
              setDriverProfile(driver);
              setDriverAuthModalMode(null);
              setRole('rider');
              if (typeof window !== 'undefined') {
                localStorage.setItem('beego_user_role', 'rider');
              }
            }}
            onCancel={() => setDriverAuthModalMode(null)}
          />
        )}

        {/* Secret Admin Security Gate (Triggered by 10 taps on BeeGo Logo) */}
        <AdminSecretGateModal
          isOpen={isAdminGateOpen}
          onClose={() => setIsAdminGateOpen(false)}
          onAuthenticated={() => {
            setIsAdminGateOpen(false);
            setRole('admin');
            if (typeof window !== 'undefined') {
              localStorage.setItem('beego_user_role', 'admin');
            }
          }}
        />
      </div>
    </div>
  );
}
