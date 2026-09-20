import { account, client, ID, AppwriteException } from '../lib/appwrite';

export interface PassengerProfile {
  id: string;
  name: string;
  email: string;
  role: 'passenger';
  isEmailVerified: boolean;
}

/**
 * Safely parses response as JSON, handling non-JSON error pages (like 404/500 HTML) gracefully
 * to avoid "Unexpected token 'T', 'The page c'... is not valid JSON" crashes.
 */
async function safeParseJson(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    console.warn(`[Passenger Auth] Server returned non-JSON response (${res.status}):`, text.slice(0, 120));
    if (res.status === 404) {
      throw new Error('Authentication service endpoint was not found. Please try again.');
    }
    if (res.status === 429) {
      throw new Error('Too many requests. Please wait a moment before trying again.');
    }
    if (res.status >= 500) {
      throw new Error('Authentication service is temporarily unavailable. Please try again in a moment.');
    }
    throw new Error(`Server returned unexpected response (${res.status}). Please try again.`);
  }
  return res.json();
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
): Promise<{ success: boolean; userId: string; message: string }> {
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

    const data = await safeParseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send verification code.');
    }

    const assignedUserId = data.userId || 'pax-' + Date.now();

    setPendingRegistration({
      userId: assignedUserId,
      name: cleanName,
      email: cleanEmail,
      password,
      createdAt: Date.now(),
    });

    return {
      success: true,
      userId: assignedUserId,
      message: data.message || `Verification code sent to ${cleanEmail}`,
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
): Promise<{ success: boolean; userId: string; message: string }> {
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

    // If active session token was established, set it on client
    if (data.sessionSecret) {
      try {
        client.setSession(data.sessionSecret);
      } catch (e) {
        // Continue
      }
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
      } catch (e) {
        // Continue
      }
    }

    if (data.profile) {
      try {
        sessionStorage.setItem('beego_active_passenger', JSON.stringify(data.profile));
      } catch (e) {
        // Ignore
      }
      return data.profile as PassengerProfile;
    }

    throw new Error('Sign in failed. Please check your credentials.');
  } catch (serverErr: any) {
    // If server login threw a business error (like invalid credentials), rethrow it
    const msg = (serverErr?.message || '').toLowerCase();
    if (msg.includes('incorrect email') || msg.includes('access denied') || msg.includes('wait a moment')) {
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
      } catch (e) {
        // Ignore
      }

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
): Promise<{ success: boolean; userId: string; message: string }> {
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
