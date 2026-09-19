import { Client, Account, ID, AppwriteException } from 'appwrite';

// Appwrite Project Configuration provided by user:
// Project ID: 6aaec93d001b38fee383
// Project Name: My first project
// Endpoint: https://fra.cloud.appwrite.io/v1

export const APPWRITE_PROJECT_ID =
  (import.meta.env.VITE_APPWRITE_PROJECT_ID as string) || '6aaec93d001b38fee383';
export const APPWRITE_ENDPOINT_REMOTE =
  (import.meta.env.VITE_APPWRITE_ENDPOINT as string) || 'https://fra.cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_NAME = 'My first project';

/**
 * Determine the optimal Appwrite endpoint:
 * In browser environments, we route through /api/appwrite to eliminate browser
 * CORS / Invalid Origin restrictions across development, preview, and production domains.
 */
export function getAppwriteEndpoint(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api/appwrite`;
  }
  return APPWRITE_ENDPOINT_REMOTE;
}

export const APPWRITE_ENDPOINT = getAppwriteEndpoint();

// Initialize the Appwrite Client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// Verify connectivity on startup
client.ping().then(
  (response) => {
    console.log('[Appwrite] Ping successful to endpoint:', APPWRITE_ENDPOINT, response);
  },
  (error) => {
    console.warn(
      '[Appwrite] Ping status notice:',
      error?.message || error
    );
  }
);

// Appwrite Account service
export const account = new Account(client);
export { client, ID, AppwriteException };

export interface AppwriteUserRole {
  role: 'passenger' | 'captain';
  registeredAt: string;
}
