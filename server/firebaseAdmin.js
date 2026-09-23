import admin from 'firebase-admin';

let db = null;
let isInitialized = false;

/**
 * Safely parse Firebase Admin Service Account credentials from environment variables.
 * Supports:
 * - FIREBASE_ADMIN_JSON: raw JSON string or base64 encoded JSON
 * - FIREBASE_SERVICE_ACCOUNT: alias
 * - FIREBASE_SERVICE_ACCOUNT_KEY: alias
 * - GOOGLE_APPLICATION_CREDENTIALS_JSON: alias
 * - Individual vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */
export function getFirebaseAdmin() {
  if (isInitialized) {
    return { admin, db, isConfigured: true };
  }

  const rawJson = 
    process.env.FIREBASE_ADMIN_JSON || 
    process.env.FIREBASE_SERVICE_ACCOUNT || 
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  let serviceAccount = null;

  if (rawJson && typeof rawJson === 'string') {
    const trimmed = rawJson.trim();
    // 1. Try direct JSON parse
    try {
      serviceAccount = JSON.parse(trimmed);
    } catch {
      // 2. Try base64 decoding then parse
      try {
        const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(decoded);
      } catch (err) {
        console.error('[Firebase Admin] Failed to parse FIREBASE_ADMIN_JSON:', err.message);
      }
    }
  }

  // 3. Fallback to individual environment variables
  if (!serviceAccount && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID || 'addmeup-95897',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  if (serviceAccount && (serviceAccount.private_key || serviceAccount.privateKey)) {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: serviceAccount.project_id || serviceAccount.projectId || 'addmeup-95897',
            clientEmail: serviceAccount.client_email || serviceAccount.clientEmail,
            privateKey: (serviceAccount.private_key || serviceAccount.privateKey).replace(/\\n/g, '\n'),
          }),
        });
      }
      db = admin.firestore();
      isInitialized = true;
      console.log('[Firebase Admin] Successfully initialized with project:', serviceAccount.project_id || serviceAccount.projectId);
      return { admin, db, isConfigured: true };
    } catch (err) {
      console.error('[Firebase Admin] Error initializing Admin SDK:', err.message);
      return { admin: null, db: null, isConfigured: false, error: err.message };
    }
  }

  console.warn('[Firebase Admin] No service account key found in environment (FIREBASE_ADMIN_JSON). Server running in verification-only mode.');
  return { admin: null, db: null, isConfigured: false };
}
