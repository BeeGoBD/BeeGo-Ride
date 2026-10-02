/**
 * Comprehensive Web & PWA Permission Service for BeeGo Voltx
 * Handles:
 * - Location (GPS hardware & network)
 * - Push Notifications
 * - Contacts Access (Android Chrome Contact Picker API)
 * - Camera (QR code scanner, NID & selfie verification)
 * - Microphone (In-app VoIP captain calls & voice support)
 * - Device Motion / Gyroscope (Live compass & orientation)
 */

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface AppPermissionStatus {
  location: PermissionState;
  notifications: PermissionState;
  contacts: PermissionState;
  camera: PermissionState;
  microphone: PermissionState;
}

const PERMISSIONS_INITIALIZED_KEY = 'beego_permissions_requested_v1';

export function hasRequestedInitialPermissions(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(PERMISSIONS_INITIALIZED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setInitialPermissionsRequested(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PERMISSIONS_INITIALIZED_KEY, 'true');
  } catch {}
}

export async function checkAllPermissions(): Promise<AppPermissionStatus> {
  const result: AppPermissionStatus = {
    location: 'prompt',
    notifications: 'prompt',
    contacts: 'prompt',
    camera: 'prompt',
    microphone: 'prompt',
  };

  if (typeof window === 'undefined') return result;

  // 1. Notification Permission
  if ('Notification' in window) {
    result.notifications = Notification.permission as PermissionState;
  } else {
    result.notifications = 'unsupported';
  }

  // 2. Contacts API support
  if ('contacts' in navigator && 'ContactsManager' in window) {
    result.contacts = 'prompt';
  } else {
    result.contacts = 'unsupported';
  }

  // 3. Permissions Query API (if supported)
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const locStatus = await navigator.permissions.query({ name: 'geolocation' });
      result.location = locStatus.state as PermissionState;
    } catch {}

    try {
      const camStatus = await (navigator.permissions.query as any)({ name: 'camera' });
      result.camera = camStatus.state as PermissionState;
    } catch {}

    try {
      const micStatus = await (navigator.permissions.query as any)({ name: 'microphone' });
      result.microphone = micStatus.state as PermissionState;
    } catch {}
  }

  return result;
}

/**
 * Requests Live Location Permission via Geolocation API
 */
export async function requestLocationPermission(): Promise<PermissionState> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return 'unsupported';
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (err) => {
        if (err.code === 1) {
          resolve('denied');
        } else {
          // If timeout or position unavailable, permission was still granted by user
          resolve('granted');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

/**
 * Requests Push Notification Permission
 */
export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const res = await Notification.requestPermission();
    return res as PermissionState;
  } catch (err) {
    console.warn('[Permissions] Notification request error:', err);
    return 'denied';
  }
}

/**
 * Requests Contact Picker Access
 */
export async function requestContactsPermission(): Promise<PermissionState> {
  if (typeof window === 'undefined') return 'unsupported';

  if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
    try {
      // Prompt user to pick trusted contacts
      await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
      return 'granted';
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User closed the picker dialog, but API is supported and permitted
        return 'granted';
      }
      return 'denied';
    }
  }

  return 'unsupported';
}

/**
 * Requests Camera and Microphone Access
 */
export async function requestMediaPermissions(): Promise<{ camera: PermissionState; microphone: PermissionState }> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { camera: 'unsupported', microphone: 'unsupported' };
  }

  let camera: PermissionState = 'denied';
  let microphone: PermissionState = 'denied';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    camera = 'granted';
    microphone = 'granted';
    // Immediately stop tracks after acquiring permission
    stream.getTracks().forEach((track) => track.stop());
  } catch (err: any) {
    // If combined audio+video failed, try camera alone
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      camera = 'granted';
      videoStream.getTracks().forEach((track) => track.stop());
    } catch {
      camera = 'denied';
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphone = 'granted';
      audioStream.getTracks().forEach((track) => track.stop());
    } catch {
      microphone = 'denied';
    }
  }

  return { camera, microphone };
}

/**
 * Requests Device Motion / Orientation (iOS / Safari compatibility)
 */
export async function requestMotionPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (typeof (DeviceMotionEvent as any)?.requestPermission === 'function') {
    try {
      const res = await (DeviceMotionEvent as any).requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }
  return true;
}
