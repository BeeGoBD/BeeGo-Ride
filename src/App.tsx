import { useState, useEffect } from 'react';
import { LocationPoint, RouteData, RideStage, UserRole, RideRequest } from './types';
import { getGeoapifyApiKey, saveGeoapifyApiKey, calculateRoute, reverseGeocode } from './services/geoapify';
import {
  subscribeToRideUpdates,
  requestNewRide,
  cancelRide,
  clearCurrentRide,
  generatePassengerId,
  generateRiderId,
} from './services/rideSync';
import { requestLiveCoordinates, getDefaultSpot } from './services/geolocation';
import { BeegoOnboarding } from './components/BeegoOnboarding';
import { RoleSelectDashboard } from './components/RoleSelectDashboard';
import { PassengerAppShell } from './components/PassengerAppShell';
import { RiderAppShell } from './components/RiderAppShell';
import { UberLiveTracking } from './components/UberLiveTracking';
import { DescopeAuthModal } from './components/DescopeAuthModal';
import { DescopeAuthScreen } from './components/DescopeAuthScreen';
import { DriverAuthModal } from './components/DriverAuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminSecretGateModal } from './components/AdminSecretGateModal';
import { getAdminToken, logoutAdmin } from './services/adminService';
import {
  getCurrentPassenger,
  getStoredPassenger,
  logoutPassenger,
  PassengerProfile,
} from './services/passengerAuth';
import { getCurrentDriver, getStoredDrivers, setCurrentDriver, DriverProfile } from './services/driverAuth';
import {
  getStoredDescopeUser,
  extractDescopeProfile,
  saveStoredDescopeUser,
  DescopeUserProfile,
} from './services/descopeService';
import { useSession, useUser, useDescope } from '@descope/react-sdk';
import './lib/appwrite';

type AppIntroState = 'onboarding' | 'ready';

export default function App() {
  const sdk = useDescope();

  // One-time cleanup of legacy mock/demo user data on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const legacyKeys = [
          'beego_demo_users',
          'beego_mock_passengers',
          'beego_old_accounts',
          'beego_local_passwords',
        ];
        legacyKeys.forEach((k) => localStorage.removeItem(k));

        // Wipe empty-email dummy passengers
        const rawPax = localStorage.getItem('beego_active_passenger');
        if (rawPax) {
          const parsed = JSON.parse(rawPax);
          if (!parsed?.email || typeof parsed.email !== 'string' || !parsed.email.trim()) {
            localStorage.removeItem('beego_active_passenger');
            localStorage.removeItem('beego_descope_user');
            if (localStorage.getItem('beego_user_role') === 'passenger') {
              localStorage.removeItem('beego_user_role');
            }
          }
        }
      } catch (e) {}
    }
  }, []);

  // PERSISTENT LOGIN SESSION:
  // Once logged in (as passenger, driver, or admin), refreshing the app keeps the user logged in
  // until they explicitly log out by themselves!
  const [role, setRole] = useState<UserRole | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paramRole = params.get('role') as UserRole | null;
      const storedRole = localStorage.getItem('beego_user_role') as UserRole | null;

      // 1. Explicitly stored role has top priority to prevent refreshing from kicking users out
      if (storedRole === 'rider') {
        return 'rider';
      }
      if (storedRole === 'passenger') {
        const storedPassenger = getStoredDescopeUser() || getStoredPassenger();
        if (storedPassenger && storedPassenger.email) {
          return 'passenger';
        }
      }
      if (storedRole === 'admin') {
        return 'admin';
      }

      // 2. URL search param fallback
      if (paramRole === 'rider' || paramRole === 'passenger' || paramRole === 'admin') {
        localStorage.setItem('beego_user_role', paramRole);
        return paramRole;
      }

      // 3. Check existing persistent sessions
      const activeDriver = getCurrentDriver();
      if (activeDriver) {
        localStorage.setItem('beego_user_role', 'rider');
        return 'rider';
      }

      const storedPassenger = getStoredDescopeUser() || getStoredPassenger();
      if (storedPassenger && storedPassenger.email) {
        localStorage.setItem('beego_user_role', 'passenger');
        return 'passenger';
      }

      const adminTok = getAdminToken();
      if (adminTok) {
        localStorage.setItem('beego_user_role', 'admin');
        return 'admin';
      }
    }
    return null;
  });

  // Skip splash on refresh if user is already authenticated or returning
  const [introState, setIntroState] = useState<AppIntroState>(() => {
    if (typeof window !== 'undefined') {
      const isAlreadyLoggedIn =
        localStorage.getItem('beego_user_role') !== null ||
        !!getCurrentDriver() ||
        !!(getStoredDescopeUser()?.email) ||
        !!(getStoredPassenger()?.email) ||
        !!getAdminToken() ||
        localStorage.getItem('beego_intro_completed') === 'true' ||
        sessionStorage.getItem('beego_intro_completed') === 'true';

      if (isAlreadyLoggedIn) return 'ready';
    }
    return 'onboarding';
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

  const [passengerProfile, setPassengerProfile] = useState<PassengerProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = getStoredDescopeUser() || getStoredPassenger();
      if (stored && stored.email) return stored;
    }
    return null;
  });
  const [passengerAuthModalMode, setPassengerAuthModalMode] = useState<'signup' | 'login' | null>(null);

  // Descope React SDK Hooks
  const { isAuthenticated } = useSession();
  const { user: descopeUser } = useUser();

  const [currentPath, setCurrentPath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen for Google OAuth redirect callback (token in hash or code in query)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Google OAuth Token in URL Hash (#access_token=...)
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
            .then((r) => r.json())
            .then((userData) => {
              if (userData && userData.email) {
                const profile: DescopeUserProfile = {
                  id: `pax_google_${Date.now().toString(36)}`,
                  name: userData.name || userData.email.split('@')[0],
                  email: userData.email,
                  role: 'passenger',
                  isEmailVerified: true,
                  authMethod: 'oauth_google',
                  picture: userData.picture,
                };
                saveStoredDescopeUser(profile);
                setPassengerProfile(profile);
                setRole('passenger');
                localStorage.setItem('beego_user_role', 'passenger');
                window.history.replaceState({}, '', window.location.pathname);
              }
            })
            .catch((e) => console.warn('[Google OAuth note]', e));
        }
      } catch (e) {}
    }

    // 2. Descope OAuth Code in query (?code=...)
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && (sdk?.oauth as any)?.exchange) {
      (sdk.oauth as any)
        .exchange(code)
        .then((res: any) => {
          if (res?.data?.user) {
            const profile = extractDescopeProfile(res.data.user);
            saveStoredDescopeUser(profile);
            setPassengerProfile(profile);
            setRole('passenger');
            localStorage.setItem('beego_user_role', 'passenger');
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('code');
            window.history.replaceState({}, '', cleanUrl.toString());
          }
        })
        .catch((err: any) => {
          console.warn('[OAuth code exchange note]', err);
        });
    }
  }, [sdk]);

  // Sync Descope user profile into passengerProfile
  useEffect(() => {
    if (descopeUser) {
      const profile = extractDescopeProfile(descopeUser);
      setPassengerProfile(profile);
      saveStoredDescopeUser(profile);
    } else {
      const stored = getStoredDescopeUser() || getStoredPassenger();
      if (stored && stored.email) {
        setPassengerProfile(stored);
      }
    }
  }, [descopeUser, isAuthenticated]);

  // Driver profile & auth modal state
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const driver = getCurrentDriver();
      if (driver) return driver;
      if (localStorage.getItem('beego_user_role') === 'rider') {
        const registry = getStoredDrivers();
        if (registry && registry.length > 0) {
          const lastDriver = registry[0];
          setCurrentDriver(lastDriver);
          return lastDriver;
        }
      }
    }
    return null;
  });
  const [driverAuthModalMode, setDriverAuthModalMode] = useState<'register' | 'login' | null>(null);

  // Check for existing active passenger session fallback
  useEffect(() => {
    if (!passengerProfile) {
      getCurrentPassenger()
        .then((profile) => {
          if (profile) {
            setPassengerProfile(profile);
          }
        })
        .catch(() => {});
    }
  }, [passengerProfile]);

  const [stage, setStage] = useState<RideStage>('request');
  const [apiKey, setApiKey] = useState<string>(() => getGeoapifyApiKey());
  
  // Pure real GPS location - NEVER pre-filled with random fake spots
  const [pickup, setPickup] = useState<LocationPoint | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('beego_cached_pickup_spot'); // Purge stale demo fallback
        const cached = localStorage.getItem('beego_real_gps_pickup');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.lat && parsed.lon) return parsed;
        }
      } catch {}
    }
    return null;
  });

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
        setPickup(null);
        setDropoff(null);
        setRouteData(null);
        if (stage === 'navigation') {
          setStage('request');
        }
      }
    });

    return () => unsubscribe();
  }, [stage]);

  // Request location permission & immediately resolve passenger live coordinates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      requestLiveCoordinates()
        .then(async (res) => {
          if (res.isRealGps && res.lat !== 0 && res.lon !== 0) {
            try {
              const keyToUse = apiKey.trim() || getGeoapifyApiKey();
              const point = await reverseGeocode(res.lat, res.lon, keyToUse);
              setPickup(point);
              try {
                localStorage.setItem('beego_real_gps_pickup', JSON.stringify(point));
              } catch {}
            } catch (e) {
              console.warn('Initial reverse geocode notice:', e);
            }
          }
        })
        .catch((err) => {
          console.warn('Initial GPS permission request:', err);
        });
    }
  }, [apiKey]);

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
    try {
      logoutPassenger();
    } catch (e) {}
    setPassengerProfile(null);
    setDriverProfile(null);
    setRole(null);
    setErrorMessage(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('beego_user_role');
      localStorage.removeItem('beego_active_passenger');
      localStorage.removeItem('beego_descope_user');
      localStorage.removeItem('beego_current_driver');
      sessionStorage.removeItem('geoapify_guest_pax_id');
      const url = new URL(window.location.href);
      url.searchParams.delete('role');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Drivers/passengers must log out to change roles
  const handleSwitchToPassenger = () => {
    handleBackToRoles();
  };

  const handleSwitchToRider = () => {
    handleBackToRoles();
  };

  const handleReplayIntro = () => {
    localStorage.removeItem('beego_intro_completed');
    sessionStorage.removeItem('beego_intro_completed');
    sessionStorage.removeItem('bigo_intro_completed');
    setIntroState('onboarding');
  };

  // Passenger clicks "Request for Ride"
  const handleRequestRide = async () => {
    // Require authenticated passenger
    if (!passengerProfile && !isAuthenticated) {
      const stored = getStoredDescopeUser() || getStoredPassenger();
      if (stored && stored.email) {
        setPassengerProfile(stored);
      } else {
        setPendingRoleForAuth('passenger');
        setPassengerAuthModalMode('login');
        setErrorMessage('Please continue as passenger to request an electric ride.');
        return;
      }
    }

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
      const user = getStoredDescopeUser();
      const phoneToUse = user?.phone || (passengerProfile as any)?.phone;
      requestNewRide(passengerId, pickup, dropoff, route, 'cash', phoneToUse);
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

  // 3 MOCK ONBOARDING SLIDES: Fast electric rides, 30s battery swap, zero-surge fares
  if (introState === 'onboarding') {
    return (
      <BeegoOnboarding
        onFinish={() => {
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('beego_intro_completed', 'true');
              sessionStorage.setItem('beego_intro_completed', 'true');
            } catch {}
          }
          setIntroState('ready');
        }}
      />
    );
  }

  // Check standalone auth route (e.g. /login, /register, /auth)
  const isAuthRoute =
    currentPath === '/login' ||
    currentPath === '/register' ||
    currentPath === '/auth' ||
    (typeof window !== 'undefined' &&
      (new URLSearchParams(window.location.search).has('login') ||
        new URLSearchParams(window.location.search).has('auth')));

  if (isAuthRoute) {
    return (
      <DescopeAuthScreen
        intendedRole={pendingRoleForAuth}
        onAuthenticated={(profile, authedRole) => {
          setPassengerProfile(profile);
          const targetRole = authedRole || pendingRoleForAuth || 'passenger';
          setRole(targetRole);
          if (typeof window !== 'undefined') {
            localStorage.setItem('beego_user_role', targetRole);
            const url = new URL(window.location.href);
            url.pathname = '/';
            url.searchParams.delete('login');
            url.searchParams.delete('auth');
            url.searchParams.delete('register');
            window.history.pushState({}, '', url.toString());
            setCurrentPath('/');
          }
        }}
        onClose={() => {
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/');
            setCurrentPath('/');
          }
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

  // 3. ROLE SELECTION, PASSENGER AUTH, OR DRIVER AUTH (No hovering overlay)
  if (passengerAuthModalMode) {
    content = (
      <DescopeAuthModal
        initialMode={passengerAuthModalMode}
        intendedRole={pendingRoleForAuth}
        onAuthenticated={(profile, authedRole) => {
          setPassengerProfile(profile);
          setPassengerAuthModalMode(null);
          const targetRole = authedRole || pendingRoleForAuth || 'passenger';
          setRole(targetRole);
          if (typeof window !== 'undefined') {
            localStorage.setItem('beego_user_role', targetRole);
            const url = new URL(window.location.href);
            url.pathname = '/';
            url.searchParams.delete('login');
            url.searchParams.delete('auth');
            url.searchParams.delete('register');
            window.history.pushState({}, '', url.toString());
            setCurrentPath('/');
          }
        }}
        onCancel={() => setPassengerAuthModalMode(null)}
      />
    );
  } else if (driverAuthModalMode) {
    content = (
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
    );
  } else if (role === null) {
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
    // 4. RIDER VIEW (Captain stays in unified dashboard with map & dispatch)
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
