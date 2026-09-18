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
import { BigoIntroSplash } from './components/BigoIntroSplash';
import { BigoOnboarding } from './components/BigoOnboarding';
import { RoleSelectDashboard } from './components/RoleSelectDashboard';
import { PassengerAppShell } from './components/PassengerAppShell';
import { RiderAppShell } from './components/RiderAppShell';
import { NavigationMap } from './components/NavigationMap';
import { UberLiveTracking } from './components/UberLiveTracking';

type AppIntroState = 'splash' | 'onboarding' | 'ready';

export default function App() {
  // Intro splash and slides lifecycle
  const [introState, setIntroState] = useState<AppIntroState>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('skipIntro') === 'true') return 'ready';
      const seen = sessionStorage.getItem('bigo_intro_completed');
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
    setRole('passenger');
    setErrorMessage(null);
  };

  const handleSwitchToRider = () => {
    setRole('rider');
    setErrorMessage(null);
  };

  const handleReplayIntro = () => {
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

  // 1. INTRO SPLASH: "Bigo written in text, full black color screen, shining white like Uber intro" (~2s)
  if (introState === 'splash') {
    return <BigoIntroSplash onComplete={() => setIntroState('onboarding')} />;
  }

  // 2. ONBOARDING SLIDES: 4 slides with next/back buttons
  if (introState === 'onboarding') {
    return (
      <BigoOnboarding
        onFinish={() => {
          sessionStorage.setItem('bigo_intro_completed', 'true');
          setIntroState('ready');
        }}
      />
    );
  }

  // 3. ROLE SELECTION: "Continue as guest passenger" or "Continue as guest rider"
  if (role === null) {
    return (
      <RoleSelectDashboard
        onSelectRole={handleSelectRole}
        onReplayIntro={handleReplayIntro}
      />
    );
  }

  // 4. RIDER VIEW: The Rider Dashboard
  if (role === 'rider') {
    if (
      activeRide &&
      (activeRide.status === 'accepted' ||
        activeRide.status === 'arrived_at_pickup' ||
        activeRide.status === 'in_transit' ||
        activeRide.status === 'completed')
    ) {
      return (
        <UberLiveTracking
          role="rider"
          activeRide={activeRide}
          apiKey={apiKey}
          onBackToRoles={handleBackToRoles}
          onSwitchRole={handleSwitchToPassenger}
          onResetRide={handleResetRide}
        />
      );
    }

    return (
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

  // 5. PASSENGER VIEW: If ride in flight, show live Uber tracking
  if (
    activeRide &&
    (activeRide.status === 'accepted' ||
      activeRide.status === 'arrived_at_pickup' ||
      activeRide.status === 'in_transit' ||
      activeRide.status === 'completed')
  ) {
    return (
      <UberLiveTracking
        role="passenger"
        activeRide={activeRide}
        apiKey={apiKey}
        onBackToRoles={handleBackToRoles}
        onSwitchRole={handleSwitchToRider}
        onResetRide={handleResetRide}
      />
    );
  }

  // 6. PASSENGER VIEW: Full Passenger App Shell with fixed bottom bar, 4 swipeable sections
  return (
    <PassengerAppShell
      apiKey={apiKey}
      onApiKeyChange={handleApiKeyChange}
      passengerId={passengerId}
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
