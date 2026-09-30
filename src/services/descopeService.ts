/**
 * BeeGo Voltx Descope Authentication Service
 * Project ID: P3K3sjhRrAXAhdRspvsCwuFMj26e
 * 
 * Supports:
 * - Descope "sign-up-or-in" Flow
 * - Email OTP
 * - Phone / SMS OTP (Bangladesh +880 format)
 * - Social Login (Google)
 * - Registration data capture (Full Name, Email, Phone Number)
 * - Forgot Password reset
 */

export const DESCOPE_PROJECT_ID = 'P3K3sjhRrAXAhdRspvsCwuFMj26e';

export interface DescopeUserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'passenger';
  isEmailVerified: boolean;
  authMethod?: 'email_otp' | 'sms_otp' | 'oauth_google' | 'flow' | 'password';
  picture?: string;
}

const STORAGE_KEY = 'beego_descope_user';
const ACTIVE_PASSENGER_KEY = 'beego_active_passenger';

/**
 * Normalizes Bangladesh phone number to E.164 standard (+880...)
 */
export function normalizeBangladeshPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('00880')) {
    cleaned = '+' + cleaned.slice(2);
  } else if (cleaned.startsWith('880')) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('01')) {
    cleaned = '+880' + cleaned.slice(1);
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+880' + cleaned;
  }
  return cleaned;
}

/**
 * Validates Bangladesh mobile phone numbers (11 digits starting with 013-019)
 */
export function isValidBangladeshPhone(phone: string): boolean {
  const normalized = normalizeBangladeshPhone(phone);
  // Must match +8801[3-9]\d{8}
  return /^\+8801[3-9]\d{8}$/.test(normalized);
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Retrieves the currently saved Descope user profile from local/session storage
 */
export function getStoredDescopeUser(): DescopeUserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(ACTIVE_PASSENGER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.email || parsed.id || parsed.name)) {
      return {
        id: parsed.id || parsed.userId || 'pax_' + Math.random().toString(36).slice(2, 8),
        name: parsed.name || 'BeeGo Passenger',
        email: parsed.email || '',
        phone: parsed.phone || '',
        role: 'passenger',
        isEmailVerified: parsed.isEmailVerified ?? true,
        authMethod: parsed.authMethod || 'flow',
        picture: parsed.picture,
      };
    }
  } catch (err) {
    console.warn('[DescopeAuth] Failed to load stored user:', err);
  }
  return null;
}

/**
 * Saves authenticated Descope user profile to persistent storage and syncs with BeeGo app state
 */
export function saveStoredDescopeUser(user: DescopeUserProfile): void {
  try {
    const serialized = JSON.stringify(user);
    localStorage.setItem(STORAGE_KEY, serialized);
    sessionStorage.setItem(STORAGE_KEY, serialized);
    sessionStorage.setItem(ACTIVE_PASSENGER_KEY, serialized);
    localStorage.setItem('beego_user_role', 'passenger');
  } catch (err) {
    console.warn('[DescopeAuth] Failed to persist user:', err);
  }
}

/**
 * Clears stored Descope user on logout
 */
export function clearStoredDescopeUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(ACTIVE_PASSENGER_KEY);
    sessionStorage.removeItem('beego_session_token');
  } catch (err) {
    console.warn('[DescopeAuth] Failed to clear user:', err);
  }
}

/**
 * Extracts Descope user details from Descope JWT or SDK User object
 */
export function extractDescopeProfile(
  descopeData: any,
  fallback?: { name?: string; email?: string; phone?: string; method?: DescopeUserProfile['authMethod'] }
): DescopeUserProfile {
  const user = descopeData?.user || descopeData;
  const loginIds = user?.loginIds || [];
  
  const email =
    user?.email ||
    loginIds.find((id: string) => id.includes('@')) ||
    fallback?.email ||
    'passenger@beegovoltx.com';

  const phone =
    user?.phone ||
    loginIds.find((id: string) => /^\+?[0-9]{8,15}$/.test(id.replace(/\s/g, ''))) ||
    fallback?.phone ||
    '';

  const name =
    user?.name ||
    (user?.givenName && user?.familyName ? `${user.givenName} ${user.familyName}` : user?.givenName) ||
    fallback?.name ||
    (email.includes('@') ? email.split('@')[0] : 'BeeGo Passenger');

  const id = user?.userId || user?.id || descopeData?.userId || `pax_${Date.now().toString(36)}`;

  return {
    id,
    name,
    email,
    phone,
    role: 'passenger',
    isEmailVerified: true,
    authMethod: fallback?.method || 'flow',
    picture: user?.picture,
  };
}
