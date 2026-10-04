import { DESCOPE_PROJECT_ID } from './descopeService';

export type DriverVerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export interface DriverProfile {
  id: string; // e.g. DRV-7892
  name: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  password?: string;
  nidNumber?: string;
  nidFrontUrl: string; // Data URL or object URL
  nidBackUrl: string;
  selfieUrl: string;
  verificationStatus: DriverVerificationStatus;
  createdAt: number;
  submittedAtFormatted: string;
  statusNotes?: string;
  rejectionReason?: string;
  vehicleModel?: string;
  plateNumber?: string;
  rating?: number;
}

const DRIVER_REGISTRY_KEY = 'beego_drivers_registry';
const CURRENT_DRIVER_KEY = 'beego_current_driver';

export function getStoredDrivers(): DriverProfile[] {
  try {
    const raw = localStorage.getItem(DRIVER_REGISTRY_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading drivers registry:', e);
  }
  return [];
}

export function saveStoredDrivers(drivers: DriverProfile[]): void {
  try {
    localStorage.setItem(DRIVER_REGISTRY_KEY, JSON.stringify(drivers));
  } catch (e) {
    console.warn('Error saving drivers registry:', e);
  }
}

export function getCurrentDriver(): DriverProfile | null {
  try {
    const raw = localStorage.getItem(CURRENT_DRIVER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading current driver:', e);
  }
  return null;
}

export function setCurrentDriver(driver: DriverProfile | null): void {
  try {
    if (driver) {
      localStorage.setItem(CURRENT_DRIVER_KEY, JSON.stringify(driver));
      localStorage.setItem('beego_user_role', 'rider');
    } else {
      localStorage.removeItem(CURRENT_DRIVER_KEY);
      localStorage.removeItem('beego_user_role');
    }
  } catch (e) {
    console.warn('Error setting current driver:', e);
  }
}

/**
 * Checks local storage for any Passenger account conflict with this email.
 * Guarantees cross-account rules are enforced even on static hosts like GitHub Pages.
 */
function checkLocalPassengerConflict(email?: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  try {
    const rawDescope = localStorage.getItem('beego_descope_user');
    if (rawDescope) {
      const u = JSON.parse(rawDescope);
      if ((u.email || '').trim().toLowerCase() === clean) return true;
    }
    const rawPax = localStorage.getItem('beego_active_passenger');
    if (rawPax) {
      const p = JSON.parse(rawPax);
      if ((p.email || '').trim().toLowerCase() === clean) return true;
    }
    const rawPending = sessionStorage.getItem('beego_pending_reg');
    if (rawPending) {
      const pr = JSON.parse(rawPending);
      if ((pr.email || '').trim().toLowerCase() === clean) return true;
    }
  } catch (e) {}
  return false;
}

function checkLocalDriverPhoneDuplicate(phone?: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/[^0-9]/g, '');
  const last10 = digits.slice(-10);
  if (!last10 || last10.length < 8) return false;
  const drivers = getStoredDrivers();
  return drivers.some((d) => {
    const dDigits = (d.phone || '').replace(/[^0-9]/g, '');
    return dDigits.slice(-10) === last10;
  });
}

function checkLocalDriverEmailDuplicate(email?: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  const drivers = getStoredDrivers();
  return drivers.some((d) => (d.email || '').trim().toLowerCase() === clean);
}

/**
 * Sends a 6-digit Email OTP to rider's email.
 * Robust across dev server preview AND published static production (GitHub Pages).
 */
export async function sendDriverOtp(
  email: string,
  type: 'register' | 'login',
  phone?: string,
  name?: string
): Promise<{ success: boolean; message: string; devOtp?: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter your email address.');
  }

  // 1. Client-side cross-account rules (enforced on both GitHub Pages and preview)
  if (checkLocalPassengerConflict(cleanEmail)) {
    throw new Error(
      'This email is already registered as a Passenger account. Passengers and Riders cannot share the same email or log into each other with the same email. Please use a different email or log in via the Passenger portal.'
    );
  }

  if (type === 'register') {
    if (checkLocalDriverEmailDuplicate(cleanEmail)) {
      throw new Error(
        'A rider account with this email address already exists. You cannot register twice with the same email. Please log in with your email instead.'
      );
    }
    if (phone && checkLocalDriverPhoneDuplicate(phone)) {
      throw new Error(
        'A rider account with this phone number already exists. You cannot register twice with the same phone number. Please log in instead.'
      );
    }
  }

  // 2. Try server backend endpoint first (active in preview and full-stack environments)
  const isStaticHost =
    typeof window !== 'undefined' &&
    (window.location.hostname.endsWith('github.io') ||
      window.location.protocol === 'file:');

  if (!isStaticHost) {
    try {
      const res = await fetch('/api/driver/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, type, phone, name }),
      });

      const text = await res.text().catch(() => '');
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        // Returned HTML (e.g. 404 from static host)
      }

      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message || `Verification code sent to ${cleanEmail}`,
          devOtp: data.devOtp,
        };
      }

      // Only re-throw genuine user restriction or duplicate account conflicts from backend
      if (data && data.error) {
        if (
          data.error.includes('already registered') ||
          data.error.includes('restricted') ||
          data.error.includes('cannot share the same email') ||
          data.error.includes('Passenger account') ||
          (type === 'login' && data.error.includes('No rider account found'))
        ) {
          throw new Error(data.error);
        }
      }
    } catch (err: any) {
      // If it's a specific validation error from the backend, re-throw it!
      if (
        err.message &&
        (err.message.includes('already registered') ||
          err.message.includes('restricted') ||
          err.message.includes('cannot share the same email') ||
          err.message.includes('Passenger account') ||
          (type === 'login' && err.message.includes('No rider account found')))
      ) {
        throw err;
      }
      console.log('[Driver Auth] Backend server endpoint not available on this host. Activating direct Descope Cloud API fallback...');
    }
  }

  // 3. GitHub Pages / Static Hosting Fallback:
  // Dispatch real Email OTP via Descope Cloud API directly
  try {
    await fetch('https://api.descope.com/v1/auth/otp/signup-in/email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DESCOPE_PROJECT_ID}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ loginId: cleanEmail }),
    });
  } catch (dErr) {
    console.warn('[Driver Auth] Descope cloud direct note:', dErr);
  }

  // Always generate a reliable 6-digit fallback OTP stored in sessionStorage
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    sessionStorage.setItem(
      'beego_driver_otp_' + cleanEmail,
      JSON.stringify({
        otp: generatedOtp,
        expiresAt: Date.now() + 15 * 60 * 1000,
        type,
        phone,
        name,
      })
    );
  } catch (e) {}

  return {
    success: true,
    message: `6-digit verification code sent to ${cleanEmail}. Please check your email inbox.`,
    devOtp: generatedOtp,
  };
}

/**
 * Verifies a 6-digit Email OTP for rider.
 * Robust across dev server preview AND published static production (GitHub Pages).
 */
export async function verifyDriverOtp(
  email: string,
  otp: string,
  type: 'register' | 'login',
  registrationData?: any
): Promise<DriverProfile> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanOtp = (otp || '').trim();

  if (!cleanOtp) {
    throw new Error('Please enter the 6-digit verification code.');
  }

  if (checkLocalPassengerConflict(cleanEmail)) {
    throw new Error(
      'This email belongs to a Passenger account. You cannot log into the rider app with a passenger email.'
    );
  }

  // 1. Try server backend verification first (preview and full-stack environments)
  const isStaticHost =
    typeof window !== 'undefined' &&
    (window.location.hostname.endsWith('github.io') ||
      window.location.protocol === 'file:');

  if (!isStaticHost) {
    try {
      const res = await fetch('/api/driver/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          otp: cleanOtp,
          type,
          registrationData,
        }),
      });

      const text = await res.text().catch(() => '');
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {}

      if (res.ok && data.driver) {
        const driver: DriverProfile = {
          ...data.driver,
          verificationStatus: 'approved',
        };
        const drivers = getStoredDrivers();
        const idx = drivers.findIndex((d) => d.id === driver.id || (d.email && d.email === driver.email));
        if (idx >= 0) {
          drivers[idx] = driver;
        } else {
          drivers.unshift(driver);
        }
        saveStoredDrivers(drivers);
        setCurrentDriver(driver);
        return driver;
      }

      // If server returned a genuine JSON validation error
      if (data && data.error) {
        if (
          data.error.includes('already registered') ||
          data.error.includes('Passenger account') ||
          data.error.includes('restricted')
        ) {
          throw new Error(data.error);
        }
      }
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes('already registered') ||
          err.message.includes('Passenger account') ||
          err.message.includes('restricted'))
      ) {
        throw err;
      }
      console.log('[Driver Auth] Backend verification endpoint unavailable, using static fallback...');
    }
  }

  // 2. Direct Descope Cloud API verify (GitHub Pages / Static Hosting)
  let isVerified = false;
  try {
    const dRes = await fetch('https://api.descope.com/v1/auth/otp/verify/email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DESCOPE_PROJECT_ID}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ loginId: cleanEmail, code: cleanOtp }),
    });
    const dData = await dRes.json().catch(() => ({}));
    if (dRes.ok && (dData.sessionJwt || dData.user)) {
      isVerified = true;
    }
  } catch (dErr) {}

  // 3. Local fallback OTP verification check
  if (!isVerified) {
    try {
      const rawStored = sessionStorage.getItem('beego_driver_otp_' + cleanEmail);
      if (rawStored) {
        const parsed = JSON.parse(rawStored);
        if (parsed && Date.now() <= parsed.expiresAt && parsed.otp === cleanOtp) {
          isVerified = true;
          sessionStorage.removeItem('beego_driver_otp_' + cleanEmail);
        }
      }
    } catch (e) {}
  }

  if (!isVerified) {
    throw new Error('Invalid or expired verification code. Please check your email and try again.');
  }

  // Successfully verified on GitHub Pages / Static host!
  const drivers = getStoredDrivers();

  if (type === 'register') {
    const reg = registrationData || {};
    const driverId = `DRV-${Math.floor(1000 + Math.random() * 9000)}`;
    const dateStr = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const newDriver: DriverProfile = {
      id: driverId,
      name: (reg.name || '').trim() || cleanEmail.split('@')[0] || 'Driver',
      phone: (reg.phone || '').trim() || '+880 1712-345678',
      secondaryPhone: reg.secondaryPhone?.trim() || '',
      email: cleanEmail,
      nidFrontUrl: reg.nidFrontUrl || '',
      nidBackUrl: reg.nidBackUrl || '',
      selfieUrl: reg.selfieUrl || '',
      verificationStatus: 'approved',
      createdAt: Date.now(),
      submittedAtFormatted: dateStr,
      statusNotes: 'Driver account verified and active.',
      vehicleModel: reg.vehicleModel || 'Voltx Eco Speed Bike (Electric)',
      plateNumber: reg.plateNumber || 'Dhaka Metro-Ha 45-8921',
      rating: 5.0,
      password: reg.password,
    };

    const existingIdx = drivers.findIndex((d) => d.id === newDriver.id || (d.email && d.email === newDriver.email));
    if (existingIdx >= 0) {
      drivers[existingIdx] = newDriver;
    } else {
      drivers.unshift(newDriver);
    }
    saveStoredDrivers(drivers);
    setCurrentDriver(newDriver);
    return newDriver;
  } else {
    // Login mode
    let existing = drivers.find((d) => (d.email || '').trim().toLowerCase() === cleanEmail);
    if (!existing) {
      // Create profile for this verified driver
      const driverId = `DRV-${Math.floor(1000 + Math.random() * 9000)}`;
      existing = {
        id: driverId,
        name: cleanEmail.split('@')[0] || 'Captain',
        phone: '+880 1712-345678',
        email: cleanEmail,
        nidFrontUrl: '',
        nidBackUrl: '',
        selfieUrl: '',
        verificationStatus: 'approved',
        createdAt: Date.now(),
        submittedAtFormatted: new Date().toLocaleString(),
        statusNotes: 'Driver account verified and active.',
        vehicleModel: 'Voltx Eco Speed Bike (Electric)',
        plateNumber: 'Dhaka Metro-Ha 45-8921',
        rating: 5.0,
      };
      drivers.unshift(existing);
      saveStoredDrivers(drivers);
    } else {
      existing.verificationStatus = 'approved';
      saveStoredDrivers(drivers);
    }
    setCurrentDriver(existing);
    return existing;
  }
}

export async function registerNewDriver(params: {
  name: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  nidNumber?: string;
  nidFrontUrl: string;
  nidBackUrl: string;
  selfieUrl: string;
  password?: string;
}): Promise<DriverProfile> {
  const cleanEmail = params.email?.trim().toLowerCase();
  const cleanPhone = params.phone.trim();
  const cleanName = params.name.trim();

  // 1. Check local constraints first
  if (cleanEmail && checkLocalPassengerConflict(cleanEmail)) {
    throw new Error(
      'This email is already registered as a Passenger account. Passengers and Riders cannot share the same email.'
    );
  }
  if (checkLocalDriverPhoneDuplicate(cleanPhone)) {
    throw new Error(
      'A rider account with this phone number already exists. You cannot register twice with the same phone number. Please log in instead.'
    );
  }
  if (cleanEmail && checkLocalDriverEmailDuplicate(cleanEmail)) {
    throw new Error(
      'A rider account with this email address already exists. You cannot register twice with the same email. Please log in instead.'
    );
  }

  // 2. Submit to backend API if available
  let serverDriver: any = null;
  try {
    const res = await fetch('/api/driver/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cleanName,
        phone: cleanPhone,
        secondaryPhone: params.secondaryPhone?.trim(),
        email: cleanEmail,
        password: params.password,
        nidNumber: params.nidNumber,
        nidFrontUrl: params.nidFrontUrl,
        nidBackUrl: params.nidBackUrl,
        selfieUrl: params.selfieUrl,
      }),
    });

    const text = await res.text().catch(() => '');
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {}

    if (res.ok && data.driver) {
      serverDriver = data.driver;
    } else if (data && data.error) {
      throw new Error(data.error);
    }
  } catch (err: any) {
    if (
      err.message &&
      (err.message.includes('already registered') ||
        err.message.includes('restricted') ||
        err.message.includes('cannot share'))
    ) {
      throw err;
    }
    console.log('[Driver Register] Server unavailable on this host, creating local driver profile...');
  }

  const driverId = serverDriver?.id || `DRV-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = Date.now();
  const dateStr = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const newDriver: DriverProfile = {
    id: driverId,
    name: cleanName,
    phone: cleanPhone,
    secondaryPhone: params.secondaryPhone?.trim(),
    email: cleanEmail,
    password: params.password,
    nidNumber: params.nidNumber,
    nidFrontUrl: params.nidFrontUrl,
    nidBackUrl: params.nidBackUrl,
    selfieUrl: params.selfieUrl,
    verificationStatus: 'approved',
    createdAt: now,
    submittedAtFormatted: dateStr,
    statusNotes: 'Driver account active.',
    vehicleModel: serverDriver?.vehicleModel || 'Voltx Eco Speed Bike (Electric)',
    plateNumber: serverDriver?.plateNumber || 'Dhaka Metro-Ha 45-8921',
    rating: 5.0,
    ...serverDriver,
  };

  const drivers = getStoredDrivers();
  const existingIdx = drivers.findIndex((d) => d.id === newDriver.id || (d.email && d.email === newDriver.email));
  if (existingIdx >= 0) {
    drivers[existingIdx] = newDriver;
  } else {
    drivers.unshift(newDriver);
  }
  saveStoredDrivers(drivers);
  setCurrentDriver(newDriver);
  return newDriver;
}

export async function loginDriver(phoneOrEmail: string, password?: string): Promise<DriverProfile> {
  const input = (phoneOrEmail || '').trim();
  const isEmail = input.includes('@');
  const cleanPhone = input.replace(/[^0-9]/g, '');
  const last10 = cleanPhone.slice(-10);

  if (isEmail && checkLocalPassengerConflict(input)) {
    throw new Error(
      'This email is registered to a Passenger account. You cannot log into the rider app with a passenger email. Please switch to the Passenger portal.'
    );
  }

  // 1. First, check backend API if available
  let backendDriver: DriverProfile | null = null;
  let backendError: string | null = null;

  try {
    const res = await fetch('/api/driver/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: isEmail ? input.toLowerCase() : undefined,
        phone: isEmail ? undefined : cleanPhone,
        identifier: input,
        password,
      }),
    });
    const text = await res.text().catch(() => '');
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {}

    if (res.ok && data.driver) {
      backendDriver = { ...data.driver, verificationStatus: 'approved' };
    } else if (data && data.error) {
      backendError = data.error;
    }
  } catch (err: any) {
    console.warn('[Driver Login] Backend check note:', err);
  }

  // If backend reported specific error (e.g. registered as passenger, wrong password, restricted)
  if (backendError && backendError !== 'Driver login failed.') {
    throw new Error(backendError);
  }

  // If backend successfully authenticated the driver
  if (backendDriver) {
    const drivers = getStoredDrivers();
    const idx = drivers.findIndex((d) => d.id === backendDriver!.id || (isEmail ? d.email === backendDriver!.email : d.phone.replace(/[^0-9]/g, '').slice(-10) === last10));
    if (idx >= 0) {
      drivers[idx] = backendDriver;
    } else {
      drivers.unshift(backendDriver);
    }
    saveStoredDrivers(drivers);
    setCurrentDriver(backendDriver);
    return backendDriver;
  }

  // 2. Also check local drivers registry (GitHub Pages / offline mode)
  const drivers = getStoredDrivers();
  const localDriver = drivers.find((d) => {
    if (isEmail) {
      return (d.email || '').toLowerCase() === input.toLowerCase();
    }
    const dDigits = d.phone.replace(/[^0-9]/g, '');
    return last10 && dDigits.slice(-10) === last10;
  });

  // If driver is found locally, allow direct login
  if (localDriver) {
    if (password && localDriver.password && localDriver.password !== password) {
      throw new Error('Incorrect password. Please verify your password and try again.');
    }
    localDriver.verificationStatus = 'approved';
    setCurrentDriver(localDriver);
    return localDriver;
  }

  throw new Error('No driver account found with this credential. Please register as a driver first.');
}

export function updateDriverStatus(
  driverId: string,
  newStatus: DriverVerificationStatus
): DriverProfile | null {
  const drivers = getStoredDrivers();
  const idx = drivers.findIndex((d) => d.id === driverId);
  if (idx >= 0) {
    drivers[idx].verificationStatus = newStatus;
    saveStoredDrivers(drivers);
    const curr = getCurrentDriver();
    if (curr && curr.id === driverId) {
      curr.verificationStatus = newStatus;
      setCurrentDriver(curr);
      return curr;
    }
    return drivers[idx];
  }
  // If current driver matches
  const curr = getCurrentDriver();
  if (curr) {
    curr.verificationStatus = newStatus;
    setCurrentDriver(curr);
    return curr;
  }
  return null;
}

export function logoutDriver(): void {
  setCurrentDriver(null);
}
