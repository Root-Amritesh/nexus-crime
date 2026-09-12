// Firebase configuration for NEXUS-CRIME
// All values sourced from environment variables (Vite VITE_ prefix)
// Project: acnas-f3596

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, PhoneAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const phoneProvider = new PhoneAuthProvider(auth);

/**
 * Returns true when the app is running in demo mode
 * (Firebase auth is bypassed; backend uses X-Demo-Investigator-Id header).
 */
export const isDemoMode = (): boolean => {
  return import.meta.env.VITE_FIREBASE_DEMO_MODE === 'true';
};

/**
 * Helper: get the current user's Firebase ID token for backend API calls.
 * Returns null if no user is signed in or if in demo mode.
 */
export const getIdToken = async (): Promise<string | null> => {
  if (isDemoMode()) return null;
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
};

export default app;
