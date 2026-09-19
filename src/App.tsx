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
import {
  getCurrentPassenger,
  logoutPassenger,
  PassengerProfile,
} from './services/passengerAuth';
import './lib/appwrite'; // Ensures client.ping() runs once when the app starts

type AppIntroState = 'splash' | 'onboarding' | 'ready';

export default function App() {
  // Intro splash and slides lifecycle
  const [introState, setIntroState] = useState<AppIntroState>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('skipIntro') === 'true') return 'ready';
      const seen = sessionStorage.getItem('beego_intro_completed') || sessionStorage.getItem('bigo_intro_completed');
      if (seen === 'true') return 'ready';
    }
    return 'splash';
  });

  // Role selection state: null = dashboard shown first!
  const [role, setRole] = useState<UserRole | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paramRole = params.get('role');
      if (paramRole === 'passenger' || paramRole === 'rider') {
        return paramRole as UserRole;
      }
    }
    return null;
  });

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

  // Check for existing active Appwrite passenger session
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

  // Subscribe to real-time ride updates (BroadcastChannel & storage sync)
  useEffect(() => {
    const unsubscribe = subscribeToRideUpdates((ride) => {
      setActiveRide(ride);

      // Only synchronize pickup, dropoff and route if there is an active in-flight ride
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

  const handleSelectRole = (selectedRole: UserRole) => {
    if (selectedRole === 'passenger' && !passengerProfile) {
      setPassengerAuthModalMode('signup');
      return;
    }
    setRole(selectedRole);
    setErrorMessage(null);
  };

  const handleBackToRoles = () => {
    setRole(null);
    setErrorMessage(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('role');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSwitchToPassenger = () => {
    if (!passengerProfile) {
      setPassengerAuthModalMode('signup');
      return;
    }
    setRole('passenger');
    setErrorMessage(null);
  };

  const handleSwitchToRider = () => {
    setRole('rider');
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
      // Direct call to Geoapify Routing API - strictly no mock data
      const route = await calculateRoute(pickup, dropoff, keyToUse);
      setRouteData(route);

      // Dispatch real-time ride request to Rider Dashboard
      requestNewRide(passengerId, pickup, dropoff, route);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to calculate navigation route using Geoapify.');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handleCancelRide = () => {
    cancelRide();
  };

  const handleResetRide = () => {
    clearCurrentRide();
    setPickup(null);
    setDropoff(null);
    setRouteData(null);
    setStage('request');
  };

  // 1. INTRO SPLASH: "Beego written in text, full black color screen, shining bee gold/white" (~2s)
  if (introState === 'splash') {
    return <BeegoIntroSplash onComplete={() => setIntroState('onboarding')} />;
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

  // 3. ROLE SELECTION: "Continue as guest passenger" or "Continue as guest rider"
  if (role === null) {
    content = (
      <RoleSelectDashboard
        onSelectRole={handleSelectRole}
        onOpenPassengerAuth={(mode) => setPassengerAuthModalMode(mode)}
        onReplayIntro={handleReplayIntro}
      />
    );
  } else if (role === 'rider') {
    // 4. RIDER VIEW: The Rider Dashboard or Active Ride Tracking
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
    // 5. PASSENGER VIEW: Live Uber tracking or Passenger App Shell
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
        />
      );
    }
  }

  return (
    <div className="w-full h-full min-h-[100dvh] h-[100dvh] bg-black text-white flex flex-col overflow-hidden relative">
      {content}

      {/* Appwrite Passenger Authentication Modal */}
      {passengerAuthModalMode && (
        <PassengerAuthModal
          initialMode={passengerAuthModalMode}
          onAuthenticated={(profile) => {
            setPassengerProfile(profile);
            setPassengerAuthModalMode(null);
            handleSelectRole('passenger');
          }}
          onCancel={() => setPassengerAuthModalMode(null)}
        />
      )}
    </div>
  );
}
