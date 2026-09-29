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
    } else {
      localStorage.removeItem(CURRENT_DRIVER_KEY);
    }
  } catch (e) {
    console.warn('Error setting current driver:', e);
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
  const driverId = `DRV-${Math.floor(1000 + Math.random() * 9000)}`;
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
    name: params.name.trim(),
    phone: params.phone.trim(),
    secondaryPhone: params.secondaryPhone?.trim(),
    email: params.email?.trim().toLowerCase(),
    password: params.password,
    nidNumber: params.nidNumber,
    nidFrontUrl: params.nidFrontUrl,
    nidBackUrl: params.nidBackUrl,
    selfieUrl: params.selfieUrl,
    verificationStatus: 'pending', // Must wait for admin approval
    createdAt: now,
    submittedAtFormatted: dateStr,
    statusNotes: 'Verification is in processing. BeeGo operations team will review documents.',
    vehicleModel: 'Voltx Eco Speed Bike (Electric)',
    plateNumber: 'Dhaka Metro-Ha 45-8921',
    rating: 5.0,
  };

  // Sync with backend API
  try {
    const res = await fetch('/api/driver/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDriver),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register driver.');
    }
    if (data.driver) {
      Object.assign(newDriver, data.driver);
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
  }

  // Update local storage
  const drivers = getStoredDrivers();
  const existingIdx = drivers.findIndex((d) => d.phone === newDriver.phone || d.email === newDriver.email);
  if (existingIdx >= 0) {
    drivers[existingIdx] = newDriver;
  } else {
    drivers.unshift(newDriver);
  }
  saveStoredDrivers(drivers);

  return newDriver;
}

export async function loginDriver(phone: string, password?: string): Promise<DriverProfile> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  // Attempt backend login first
  try {
    const res = await fetch('/api/driver/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Driver login failed.');
    }
    if (data.driver) {
      setCurrentDriver(data.driver);
      return data.driver;
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
  }

  // Fallback to local check
  const drivers = getStoredDrivers();
  const found = drivers.find((d) => {
    const dPhone = d.phone.replace(/[^0-9]/g, '');
    return dPhone.includes(cleanPhone) || cleanPhone.includes(dPhone);
  });

  if (!found) {
    throw new Error('No driver account found with this phone number. Please register first.');
  }

  if (found.verificationStatus === 'pending') {
    throw new Error('Your driver application is under review. Our team will verify your details and approve your account shortly.');
  }

  if (found.verificationStatus === 'rejected') {
    throw new Error(`Your driver application was rejected. ${found.rejectionReason || 'Please contact BeeGo support.'}`);
  }

  if (password && found.password && found.password !== password) {
    throw new Error('Incorrect password. Please verify and try again.');
  }

  setCurrentDriver(found);
  return found;
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
