import { account, client, ID, AppwriteException } from '../lib/appwrite';

export interface PassengerProfile {
  id: string;
  name: string;
  email: string;
  role: 'passenger';
  isEmailVerified: boolean;
}

export interface OtpSendResult {
  success: boolean;
  userId: string;
  message: string;
  devOtp?: string;
}

/**
 * Safely parses response as JSON, handling non-JSON error pages (like 404/500 HTML) gracefully
 * to avoid "Unexpected token 'T', 'The page c'... is not valid JSON" crashes.
 */
async function safeParseJson(res: Response): Promise<any> {
  const text = await res.text().catch(() => '');
  try {
    if (text) {
      return JSON.parse(text);
    }
  } catch (parseErr) {
    console.warn(`[Passenger Auth] Server returned non-JSON response (${res.status}):`, text.slice(0, 120));
  }

  // Handle specific HTTP status codes if body was not JSON
  if (res.status === 404) {
    throw new Error('Authentication service endpoint was not found. Please try again.');
  }
  if (res.status === 403) {
    throw new Error('Access permission issue or upstream authentication is paused. Please try again.');
  }
  if (res.status === 429) {
    throw new Error('Too many requests. Please wait a moment before trying again.');
  }
  if (res.status >= 500) {
    throw new Error('Authentication service is temporarily unavailable. Please try again in a moment.');
  }
  if (!res.ok) {
    throw new Error(`Authentication request could not be processed (${res.status}). Please try again.`);
  }

  return {};
}

// Email address validation: checks for standard valid email format
export function validateGmailAddress(email: string): { isValid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { isValid: false, error: 'Email address is required.' };
  }

  // Standard email format verification
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. yourname@gmail.com).' };
  }

  return { isValid: true };
}

// In-memory state for registration in progress (Name + Password + Phone kept until OTP is verified)
interface PendingRegistration {
  userId: string;
  name: string;
  email: string;
  phone?: string;
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
 * Get locally stored passenger profile across localStorage and sessionStorage
 */
export function getStoredPassenger(): PassengerProfile | null {
  try {
    const raw =
      localStorage.getItem('beego_active_passenger') ||
      sessionStorage.getItem('beego_active_passenger') ||
      localStorage.getItem('beego_descope_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.email === 'string' && parsed.email.trim().length > 0) {
        return parsed as PassengerProfile;
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Check currently logged in passenger session with multiple fallback layers:
 * 1. Active persistent local/session storage cache
 * 2. Dedicated server session verification (/api/auth/me)
 * 3. Appwrite SDK account session
 */
export async function getCurrentPassenger(): Promise<PassengerProfile | null> {
  // Check active cached session profile first
  const cached = getStoredPassenger();
  if (cached) {
    return cached;
  }

  // Check server session via /api/auth/me
  try {
    const token = sessionStorage.getItem('beego_session_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-appwrite-session'] = token;
    }
    const meRes = await fetch('/api/auth/me', { headers });
    if (meRes.ok) {
      const meData = await safeParseJson(meRes);
      if (meData?.profile) {
        sessionStorage.setItem('beego_active_passenger', JSON.stringify(meData.profile));
        return meData.profile;
      }
    }
  } catch (e) {
    // Continue
  }

  // Attempt Appwrite SDK session verification
  try {
    const user = await account.get();
    const prefs = (user.prefs || {}) as Record<string, any>;

    // Role segregation mandate: Captain cannot be passenger
    if (prefs?.role === 'captain') {
      console.warn('[Beego Auth] Active session belongs to a Captain, not Passenger');
      return null;
    }

    const profile: PassengerProfile = {
      id: user.$id,
      name: user.name || prefs?.name || user.email?.split('@')[0] || 'Passenger',
      email: user.email || prefs?.email || 'passenger@gmail.com',
      role: 'passenger',
      isEmailVerified: true,
    };

    try {
      sessionStorage.setItem('beego_active_passenger', JSON.stringify(profile));
    } catch (e) {}

    return profile;
  } catch (err) {
    return null;
  }
}

/**
 * Step 1: Send OTP to Passenger's Gmail address for Registration / Verification
 */
export async function sendPassengerRegistrationOtp(
  name: string,
  email: string,
  password?: string,
  phone?: string
): Promise<OtpSendResult> {
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
        phone: phone?.trim(),
      }),
    });

    const data = await safeParseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send verification code.');
    }

    const assignedUserId = data.userId || 'pax-' + Date.now();

    setPendingRegistration({
      userId: assignedUserId,
      name: cleanName,
      email: cleanEmail,
      phone: phone?.trim(),
      password,
      createdAt: Date.now(),
    });

    return {
      success: true,
      userId: assignedUserId,
      message: data.message || `Verification code sent to ${cleanEmail}`,
      devOtp: data.devOtp,
    };
  } catch (error: any) {
    throw new Error(error?.message || 'Failed to send verification code.');
  }
}

/**
 * Send OTP for Passwordless Passenger Login (Instant 6-digit code to Gmail)
 */
export async function sendPassengerLoginOtp(
  email: string
): Promise<OtpSendResult> {
  const check = validateGmailAddress(email);
  if (!check.isValid) {
    throw new Error(check.error);
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
      }),
    });

    const data = await safeParseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send verification code to your email.');
    }

    const assignedUserId = data.userId || 'pax-' + Date.now();

    setPendingRegistration({
      userId: assignedUserId,
      name: cleanEmail.split('@')[0],
      email: cleanEmail,
      createdAt: Date.now(),
    });

    return {
      success: true,
      userId: assignedUserId,
      message: data.message || `Verification code sent to ${cleanEmail}`,
      devOtp: data.devOtp,
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

    const data = await safeParseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Invalid verification code. Please check your email and try again.');
    }

    // If active session token was established, store it
    if (data.sessionSecret) {
      try {
        client.setSession(data.sessionSecret);
      } catch (e) {}
      try {
        sessionStorage.setItem('beego_session_token', data.sessionSecret);
      } catch (e) {}
    }

    clearPendingRegistration();

    if (data.profile) {
      try {
        localStorage.setItem('beego_active_passenger', JSON.stringify(data.profile));
        sessionStorage.setItem('beego_active_passenger', JSON.stringify(data.profile));
        localStorage.setItem('beego_descope_user', JSON.stringify(data.profile));
        localStorage.setItem('beego_user_role', 'passenger');
      } catch (e) {}
      return data.profile as PassengerProfile;
    }

    throw new Error('Verification failed. Please try again.');
  } catch (error: any) {
    throw new Error(error?.message || 'Invalid verification code.');
  }
}

/**
 * Passenger Password Login:
 * Authenticates against /api/auth/login with graceful Appwrite SDK fallback
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
    // Primary: Call server login endpoint
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    const data = await safeParseJson(res);

    if (!res.ok) {
      throw new Error(data.error || 'Incorrect email or password.');
    }

    if (data.sessionSecret) {
      try {
        client.setSession(data.sessionSecret);
      } catch (e) {}
      try {
        sessionStorage.setItem('beego_session_token', data.sessionSecret);
      } catch (e) {}
    }

    if (data.profile) {
      try {
        localStorage.setItem('beego_active_passenger', JSON.stringify(data.profile));
        sessionStorage.setItem('beego_active_passenger', JSON.stringify(data.profile));
        localStorage.setItem('beego_descope_user', JSON.stringify(data.profile));
        localStorage.setItem('beego_user_role', 'passenger');
      } catch (e) {}
      return data.profile as PassengerProfile;
    }

    throw new Error('Sign in failed. Please check your credentials.');
  } catch (serverErr: any) {
    // If server login threw a specific business error, rethrow it
    const msg = (serverErr?.message || '').toLowerCase();
    if (
      msg.includes('incorrect password') ||
      msg.includes('no account found') ||
      msg.includes('access denied') ||
      msg.includes('wait a moment')
    ) {
      throw serverErr;
    }

    // Fallback: direct Appwrite SDK session creation
    try {
      await account.deleteSession({ sessionId: 'current' }).catch(() => {});
      await account.createEmailPasswordSession({
        email: cleanEmail,
        password,
      });

      const user = await account.get();
      const prefs = (user.prefs || {}) as Record<string, any>;

      if (prefs.role === 'captain') {
        await account.deleteSession({ sessionId: 'current' }).catch(() => {});
        throw new Error(
          'Access Denied: This account is registered as a Captain. Captains cannot log in as Passengers.'
        );
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
      } catch (e) {}

      return profile;
    } catch (sdkError: any) {
      const sdkMsg = (sdkError?.message || '').toLowerCase();
      const code = sdkError?.code;

      if (code === 401 || sdkMsg.includes('invalid credentials')) {
        throw new Error('Incorrect password for this Gmail account. Please try again or sign in with OTP.');
      }
      if (code === 429 || sdkMsg.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      throw new Error(serverErr?.message || sdkError?.message || 'Login failed. Please check your credentials.');
    }
  }
}

/**
 * Request Password Reset / OTP Recovery
 */
export async function sendPasswordResetOtp(
  email: string
): Promise<OtpSendResult> {
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

    const data = await safeParseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send reset code.');
    }

    const assignedUserId = data.userId || 'pax-' + Date.now();

    return {
      success: true,
      userId: assignedUserId,
      message: data.message || `Reset code sent to ${cleanEmail}`,
      devOtp: data.devOtp,
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
  const token = sessionStorage.getItem('beego_session_token');
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-appwrite-session': token,
        },
      });
    } catch (e) {}
  }

  try {
    await account.deleteSession({ sessionId: 'current' });
  } catch (e) {}

  clearPendingRegistration();
  try {
    localStorage.removeItem('beego_active_passenger');
    sessionStorage.removeItem('beego_active_passenger');
    localStorage.removeItem('beego_descope_user');
    sessionStorage.removeItem('beego_descope_user');
    localStorage.removeItem('beego_session_token');
    sessionStorage.removeItem('beego_session_token');
    localStorage.removeItem('beego_user_role');
  } catch (e) {}
}
