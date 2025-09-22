// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 🔒 SECURE: Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyClmGaab8hKNRD31y_BGxLQZCblTlZOjxA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-2714959067-22ea0.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-2714959067-22ea0",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-2714959067-22ea0.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "722448916409",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:722448916409:web:871521cf99c094f6b6e068"
};

// Validate Firebase config
const isProduction = process.env.NODE_ENV === 'production';
const hasEnvVars = process.env.NEXT_PUBLIC_FIREBASE_API_KEY; // Check if any env var exists

if (isProduction && !hasEnvVars) {
  // In production, require environment variables
  throw new Error('🚨 PRODUCTION ERROR: Firebase environment variables are required. Please set NEXT_PUBLIC_FIREBASE_* variables.');
}

// Validate all required config exists
const requiredConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId
];

if (requiredConfig.some(config => !config)) {
  throw new Error('🚨 Firebase configuration incomplete. Missing required configuration values.');
}

if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Firebase configuration loaded for development');
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
