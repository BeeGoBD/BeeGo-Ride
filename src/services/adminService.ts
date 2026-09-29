export interface AdminDriverRecord {
  id: string;
  name: string;
  phone: string;
  secondaryPhone?: string;
  email: string;
  nidNumber?: string;
  nidFrontUrl?: string;
  nidBackUrl?: string;
  selfieUrl?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  vehicleModel: string;
  plateNumber: string;
  rating: number;
  statusNotes?: string;
  rejectionReason?: string;
  createdAt: number;
  submittedAtFormatted: string;
}

export interface AdminPassengerRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: number;
  role: 'passenger';
  isRestricted: boolean;
}

export interface AdminRestrictionRecord {
  id: string;
  targetType: 'passenger' | 'driver';
  targetId: string;
  name: string;
  phone: string;
  email?: string;
  reason: string;
  restrictedAt: number;
}

export interface AdminStats {
  pendingDrivers: number;
  approvedDrivers: number;
  rejectedDrivers: number;
  totalDrivers: number;
  totalPassengers: number;
  totalRestricted: number;
}

const ADMIN_TOKEN_KEY = 'beego_admin_session_token';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

export async function loginAdmin(id: string, password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      setAdminToken(data.token || 'admin_token_active');
      return true;
    }
    throw new Error(data.error || 'Invalid Admin ID or Secret Password.');
  } catch (err: any) {
    throw new Error(err.message || 'Admin authentication failed.');
  }
}

export function logoutAdmin() {
  setAdminToken(null);
}

export async function fetchAdminStats(): Promise<AdminStats> {
  try {
    const res = await fetch('/api/admin/stats');
    if (res.ok) {
      const data = await res.json();
      if (data.stats) return data.stats;
    }
  } catch (err) {
    console.warn('Failed to fetch admin stats', err);
  }

  return {
    pendingDrivers: 0,
    approvedDrivers: 0,
    rejectedDrivers: 0,
    totalDrivers: 0,
    totalPassengers: 0,
    totalRestricted: 0,
  };
}

export async function fetchAdminDrivers(): Promise<AdminDriverRecord[]> {
  try {
    const res = await fetch('/api/admin/drivers');
    if (res.ok) {
      const data = await res.json();
      if (data.drivers && Array.isArray(data.drivers)) {
        return data.drivers;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch admin drivers', err);
  }
  return [];
}

export async function updateDriverVerification(
  driverId: string,
  status: 'approved' | 'rejected' | 'pending',
  notes?: string
): Promise<AdminDriverRecord> {
  try {
    const res = await fetch('/api/admin/drivers/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, status, notes }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update driver status.');
    }
    return data.driver;
  } catch (err: any) {
    throw new Error(err.message || 'Failed to update driver status.');
  }
}

export async function fetchAdminPassengers(): Promise<AdminPassengerRecord[]> {
  try {
    const res = await fetch('/api/admin/passengers');
    if (res.ok) {
      const data = await res.json();
      if (data.passengers && Array.isArray(data.passengers)) {
        return data.passengers;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch admin passengers', err);
  }
  return [];
}

export async function fetchRestrictedAccounts(): Promise<AdminRestrictionRecord[]> {
  try {
    const res = await fetch('/api/admin/restrictions');
    if (res.ok) {
      const data = await res.json();
      if (data.restrictions && Array.isArray(data.restrictions)) {
        return data.restrictions;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch restrictions', err);
  }
  return [];
}

export async function addRestriction(params: {
  targetType: 'passenger' | 'driver';
  targetId: string;
  name: string;
  phone: string;
  email?: string;
  reason?: string;
}): Promise<AdminRestrictionRecord> {
  try {
    const res = await fetch('/api/admin/restrictions/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to restrict user.');
    }
    return data.restriction;
  } catch (err: any) {
    throw new Error(err.message || 'Failed to restrict user.');
  }
}

export async function removeRestriction(params: {
  id?: string;
  targetId?: string;
  phone?: string;
  email?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/restrictions/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return res.ok && data.success;
  } catch (err: any) {
    throw new Error(err.message || 'Failed to unrestrict user.');
  }
}
