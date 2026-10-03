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

  // 1. ALWAYS save locally first so registration is never lost or blocked
  try {
    const drivers = getStoredDrivers();
    const last10 = newDriver.phone.replace(/[^0-9]/g, '').slice(-10);
    const existingIdx = drivers.findIndex((d) => {
      const dDigits = d.phone.replace(/[^0-9]/g, '');
      return (last10 && dDigits.slice(-10) === last10) || (d.email && d.email === newDriver.email);
    });
    if (existingIdx >= 0) {
      drivers[existingIdx] = { ...drivers[existingIdx], ...newDriver };
    } else {
      drivers.unshift(newDriver);
    }
    saveStoredDrivers(drivers);
  } catch (storageErr) {
    console.warn('[Driver Storage] Storage issue:', storageErr);
  }

  // 2. Sync with backend API
  try {
    const res = await fetch('/api/driver/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDriver),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.driver) {
      Object.assign(newDriver, data.driver);
      // Re-save with updated server ID and properties
      const drivers = getStoredDrivers();
      const idx = drivers.findIndex((d) => d.id === newDriver.id || d.phone.replace(/[^0-9]/g, '').slice(-10) === newDriver.phone.replace(/[^0-9]/g, '').slice(-10));
      if (idx >= 0) {
        drivers[idx] = newDriver;
        saveStoredDrivers(drivers);
      }
    } else if (!res.ok && data.error && !data.error.includes('Failed to submit')) {
      console.warn('Backend validation notice:', data.error);
    }
  } catch (err: any) {
    console.warn('[Driver Registration] Backend sync notice:', err);
  }

  // Registration request is successfully queued with pending status for Admin manual verification!
  return newDriver;
}

export async function loginDriver(phone: string, password?: string): Promise<DriverProfile> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const last10 = cleanPhone.slice(-10);

  // 1. First, check backend API
  let backendDriver: DriverProfile | null = null;
  let backendPending = false;
  let backendError: string | null = null;

  try {
    const res = await fetch('/api/driver/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, password }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.driver) {
      backendDriver = data.driver;
    } else {
      if (data.status === 'pending' || (data.error && data.error.includes('manual review'))) {
        backendPending = true;
      }
      if (data.error) {
        backendError = data.error;
      }
    }
  } catch (err: any) {
    console.warn('[Driver Login] Backend check notice:', err);
  }

  // If backend successfully authenticated and approved the driver
  if (backendDriver) {
    const drivers = getStoredDrivers();
    const idx = drivers.findIndex((d) => d.id === backendDriver!.id || d.phone.replace(/[^0-9]/g, '').slice(-10) === last10);
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
    const dDigits = d.phone.replace(/[^0-9]/g, '');
    return last10 && dDigits.slice(-10) === last10;
  });

  // If driver is found locally and was approved by admin
  if (localDriver) {
    if (localDriver.verificationStatus === 'approved') {
      if (password && localDriver.password && localDriver.password !== password) {
        throw new Error('Incorrect password. Please verify your password and try again.');
      }
      setCurrentDriver(localDriver);
      return localDriver;
    }

    if (localDriver.verificationStatus === 'pending') {
      throw new Error(
        'Your driver registration request is pending manual verification. Please log into the Admin Panel to approve this driver before logging in.'
      );
    }

    if (localDriver.verificationStatus === 'rejected') {
      throw new Error(
        `Your driver application was rejected. ${localDriver.rejectionReason || 'Please contact BeeGo operations admin.'}`
      );
    }
  }

  // If backend reported pending verification
  if (backendPending) {
    throw new Error(
      backendError ||
      'Your driver registration request is pending manual verification. Please log into the Admin Panel to approve this driver before logging in.'
    );
  }

  // If backend reported specific error (like incorrect password)
  if (backendError && backendError !== 'Driver login failed.') {
    throw new Error(backendError);
  }

  throw new Error('No driver account found with this phone number. Please submit a registration request first.');
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
