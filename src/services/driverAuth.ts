export type DriverVerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export interface DriverProfile {
  id: string; // e.g. DRIVER-7892
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

  const res = await fetch('/api/driver/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanEmail, type, phone, name }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send driver verification code.');
  }

  return {
    success: true,
    message: data.message || `Verification code sent to ${cleanEmail}`,
    devOtp: data.devOtp,
  };
}

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

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.driver) {
    throw new Error(data.error || 'Invalid or expired verification code.');
  }

  const driver: DriverProfile = {
    ...data.driver,
    verificationStatus: 'approved',
  };

  // Save locally
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

  // 1. Submit directly to backend API to validate uniqueness
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to complete rider registration.');
  }

  const driverId = data.driver?.id || `DRV-${Math.floor(1000 + Math.random() * 9000)}`;
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
    verificationStatus: 'approved', // Active immediately
    createdAt: now,
    submittedAtFormatted: dateStr,
    statusNotes: 'Driver account active.',
    vehicleModel: data.driver?.vehicleModel || 'Voltx Eco Speed Bike (Electric)',
    plateNumber: data.driver?.plateNumber || 'Dhaka Metro-Ha 45-8921',
    rating: 5.0,
    ...data.driver,
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

  // 1. First, check backend API
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
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.driver) {
      backendDriver = { ...data.driver, verificationStatus: 'approved' };
    } else {
      if (data.error) {
        backendError = data.error;
      }
    }
  } catch (err: any) {
    console.warn('[Driver Login] Backend check notice:', err);
  }

  // If backend reported specific error (e.g. registered as passenger, wrong password, restricted)
  if (backendError) {
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

  // 2. Also check local drivers registry
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
