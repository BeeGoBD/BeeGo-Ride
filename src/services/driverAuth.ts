export type DriverVerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export interface DriverProfile {
  id: string; // e.g. DRIVER-7892
  name: string;
  phone: string;
  password?: string;
  nidFrontUrl: string; // Data URL or object URL
  nidBackUrl: string;
  selfieUrl: string;
  verificationStatus: DriverVerificationStatus;
  createdAt: number;
  submittedAtFormatted: string;
  statusNotes?: string;
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

export function registerNewDriver(params: {
  name: string;
  phone: string;
  nidFrontUrl: string;
  nidBackUrl: string;
  selfieUrl: string;
  password?: string;
}): DriverProfile {
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
    password: params.password,
    nidFrontUrl: params.nidFrontUrl,
    nidBackUrl: params.nidBackUrl,
    selfieUrl: params.selfieUrl,
    verificationStatus: 'under_review',
    createdAt: now,
    submittedAtFormatted: dateStr,
    statusNotes: 'Verification is currently in processing. Documents undergoing verification.',
    vehicleModel: 'Voltx Eco Speed Bike (Yellow)',
    plateNumber: 'Dhaka Metro-Ha 45-8921',
    rating: 5.0,
  };

  const drivers = getStoredDrivers();
  const existingIdx = drivers.findIndex((d) => d.phone === newDriver.phone);
  if (existingIdx >= 0) {
    drivers[existingIdx] = newDriver;
  } else {
    drivers.unshift(newDriver);
  }
  saveStoredDrivers(drivers);
  setCurrentDriver(newDriver);

  return newDriver;
}

export function loginDriver(phone: string, password?: string): DriverProfile | null {
  const drivers = getStoredDrivers();
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const found = drivers.find((d) => {
    const dPhone = d.phone.replace(/[^0-9]/g, '');
    return dPhone.includes(cleanPhone) || cleanPhone.includes(dPhone);
  });

  if (found) {
    if (password && found.password && found.password !== password) {
      throw new Error('Incorrect password. Please verify and try again.');
    }
    setCurrentDriver(found);
    return found;
  }

  return null;
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
