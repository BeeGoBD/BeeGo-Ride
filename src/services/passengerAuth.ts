import { account, ID, AppwriteException } from '../lib/appwrite';

export interface PassengerProfile {
  id: string;
  name: string;
  email: string;
  role: 'passenger';
  isEmailVerified: boolean;
}

// Gmail address validation mandate: must end with @gmail.com
export function validateGmailAddress(email: string): { isValid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { isValid: false, error: 'Email address is required.' };
  }

  // Basic email structure
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email format.' };
  }

  // Strict Gmail mandate
  if (!trimmed.endsWith('@gmail.com')) {
    return {
      isValid: false,
      error: 'Only @gmail.com email addresses are allowed.',
    };
  }

  return { isValid: true };
}

// In-memory state for registration in progress (Name + Password kept until OTP is verified)
interface PendingRegistration {
  userId: string;
  name: string;
  email: string;
  password?: string;
  createdAt: number;
}

let pendingRegState: PendingRegistration | null = null;

export function setPendingRegistration(data: PendingRegistration) {
  pendingRegState = data;
  try {
    sessionStorage.setItem('beego_pending_reg', JSON.stringify(data));
  } catch (e) {
    // Ignore storage errors
  }
}

export function getPendingRegistration(): PendingRegistration | null {
  if (pendingRegState) return pendingRegState;
  try {
    const raw = sessionStorage.getItem('beego_pending_reg');
    if (raw) {
      pendingRegState = JSON.parse(raw);
      return pendingRegState;
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

export function clearPendingRegistration() {
  pendingRegState = null;
  try {
    sessionStorage.removeItem('beego_pending_reg');
  } catch (e) {
    // Ignore
  }
}

/**
 * Check currently logged in Appwrite user and verify they have 'passenger' role
 */
export async function getCurrentPassenger(): Promise<PassengerProfile | null> {
  // First check Appwrite session
  try {
    const user = await account.get();
    const prefs = (user.prefs || {}) as Record<string, any>;

    // Role segregation mandate: Captain cannot be passenger
    if (prefs?.role === 'captain') {
      console.warn('[Beego Auth] Active session belongs to a Captain, not Passenger');
      return null;
    }

    return {
      id: user.$id,
      name: user.name || prefs?.name || user.email?.split('@')[0] || 'Passenger',
      email: user.email || prefs?.email || 'passenger@gmail.com',
      role: 'passenger',
      isEmailVerified: true,
    };
  } catch (err) {
    // Check fallback session storage for verified session
    try {
      const stored = sessionStorage.getItem('beego_active_passenger');
      if (stored) {
        return JSON.parse(stored) as PassengerProfile;
      }
    } catch (e) {
      // Ignore
    }
    return null;
  }
}

/**
 * Step 1: Send OTP to Passenger's Gmail address for Registration / Verification
 */
export async function sendPassengerRegistrationOtp(
  name: string,
  email: string,
  password?: string
): Promise<{ success: boolean; userId: string; message: string; devCode?: string }> {
  const check = validateGmailAddress(email);
  if (!check.isValid) {
    throw new Error(check.error);
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (!cleanName) {
    throw new Error('Please enter your full name.');
  }

  if (password && password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  try {
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cleanName,
        email: cleanEmail,
        password,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send verification code.');
    }

    setPendingRegistration({
      userId: 'pax-' + Date.now(),
      name: cleanName,
      email: cleanEmail,
      password,
      createdAt: Date.now(),
    });

    return {
      success: true,
      userId: 'pax-' + Date.now(),
      message: data.message || `Verification code sent to ${cleanEmail}`,
      devCode: data.devCode,
    };
  } catch (error: any) {
    throw new Error(error?.message || 'Failed to send verification code.');
  }
}

/**
 * Step 2: Verify the 6-digit OTP received in the Passenger's Gmail inbox
 * Strictly requires the correct OTP. If wrong, rejects and does not approve.
 */
export async function verifyPassengerOtp(
  userIdOrEmail: string,
  otpCode: string,
  name?: string,
  password?: string
): Promise<PassengerProfile> {
  const cleanOtp = otpCode.trim();
  if (!cleanOtp) {
    throw new Error('Please enter the 6-digit verification code.');
  }

  const pending = getPendingRegistration();
  const targetEmail = (pending?.email || userIdOrEmail || '').trim().toLowerCase();
  const targetName = name || pending?.name || 'Passenger';
  const targetPassword = password || pending?.password;

  try {
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: targetEmail,
        otp: cleanOtp,
        name: targetName,
        password: targetPassword,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid verification code. Please check your email and try again.');
    }

    clearPendingRegistration();

    if (data.profile) {
      try {
        sessionStorage.setItem('beego_active_passenger', JSON.stringify(data.profile));
      } catch (e) {
        // Ignore
      }
      return data.profile as PassengerProfile;
    }

    throw new Error('Verification failed. Please try again.');
  } catch (error: any) {
    throw new Error(error?.message || 'Invalid verification code.');
  }
}

/**
 * Passenger Password Login
 */
export async function loginPassengerWithPassword(
  email: string,
  password: string
): Promise<PassengerProfile> {
  const check = validateGmailAddress(email);
  if (!check.isValid) {
    throw new Error(check.error);
  }

  if (!password) {
    throw new Error('Please enter your password.');
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // Delete any stale session first
    await account.deleteSession({ sessionId: 'current' }).catch(() => {});

    // Create email/password session in Appwrite
    await account.createEmailPasswordSession({
      email: cleanEmail,
      password,
    });

    const user = await account.get();
    const prefs = (user.prefs || {}) as Record<string, any>;

    // Enforce role segregation
    if (prefs.role === 'captain') {
      await account.deleteSession({ sessionId: 'current' }).catch(() => {});
      throw new Error(
        'Access Denied: This account is registered as a Captain. Captains cannot log in as Passengers.'
      );
    }

    // Ensure role is passenger
    if (prefs.role !== 'passenger') {
      await account.updatePrefs({
        prefs: {
          ...prefs,
          role: 'passenger',
        },
      }).catch(() => {});
    }

    const profile: PassengerProfile = {
      id: user.$id,
      name: user.name || cleanEmail.split('@')[0],
      email: user.email,
      role: 'passenger',
      isEmailVerified: true,
    };

    try {
      sessionStorage.setItem('beego_active_passenger', JSON.stringify(profile));
    } catch (e) {
      // Ignore
    }

    return profile;
  } catch (error: any) {
    const msg = (error?.message || '').toLowerCase();
    const code = error?.code;

    if (code === 401 || msg.includes('invalid credentials')) {
      throw new Error('Incorrect password for this Gmail account. Please try again or sign in with OTP.');
    }
    if (code === 429 || msg.includes('rate limit')) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    throw new Error(error?.message || 'Login failed. Please check your credentials.');
  }
}

/**
 * Request Password Reset / OTP Recovery
 */
export async function sendPasswordResetOtp(
  email: string
): Promise<{ success: boolean; userId: string; message: string; devCode?: string }> {
  const check = validateGmailAddress(email);
  if (!check.isValid) {
    throw new Error(check.error);
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, name: cleanEmail.split('@')[0] }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send reset code.');
    }

    return {
      success: true,
      userId: 'pax-' + Date.now(),
      message: data.message || `Reset code sent to ${cleanEmail}`,
      devCode: data.devCode,
    };
  } catch (error: any) {
    throw new Error(error?.message || 'Failed to send reset code.');
  }
}

/**
 * Reset Password with verified OTP
 */
export async function resetPasswordWithOtp(
  email: string,
  otpCode: string,
  newPassword: string
): Promise<PassengerProfile> {
  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters long.');
  }

  // Strictly verify OTP first
  const profile = await verifyPassengerOtp(email, otpCode, undefined, newPassword);

  // Update password in Appwrite if session exists
  try {
    await account.updatePassword({ password: newPassword });
  } catch (e) {
    // Ignore if offline
  }

  return profile;
}

/**
 * Logout current passenger
 */
export async function logoutPassenger(): Promise<void> {
  try {
    await account.deleteSession({ sessionId: 'current' });
  } catch (e) {
    // Ignore
  }
  clearPendingRegistration();
  try {
    sessionStorage.removeItem('beego_active_passenger');
  } catch (e) {
    // Ignore
  }
}
