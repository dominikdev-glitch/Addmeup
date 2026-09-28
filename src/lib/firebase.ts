import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

// If running on custom domain (e.g. addmeup.ng), use that domain as authDomain
// since server.js proxies /__/auth/* directly to Firebase
const resolvedAuthDomain =
  typeof window !== 'undefined' &&
  window.location.hostname &&
  window.location.hostname.includes('addmeup.ng')
    ? window.location.hostname
    : firebaseConfigData.authDomain;

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: resolvedAuthDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
  measurementId: firebaseConfigData.measurementId,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with long-polling to prevent WebSocket timeouts in iframe environments
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfigData.firestoreDatabaseId || '(default)'
);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export default app;
