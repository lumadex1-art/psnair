// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// 🔒 SECURE: Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyClmGaab8hKNRD31y_BGxLQZCblTlZOjxA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-2714959067-22ea0.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-2714959067-22ea0",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-2714959067-22ea0.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "722448916409",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:722448916409:web:871521cf99c094f6b6e068"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
//const functions = getFunctions(app, 'asia-southeast1'); // ✅ Set region yang benar
const functions = getFunctions(app, 'us-central1');

export { app, auth, db, functions };
