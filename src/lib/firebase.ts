// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyClmGaab8hKNRD31y_BGxLQZCblTlZOjxA",
  authDomain: "studio-2714959067-22ea0.firebaseapp.com",
  projectId: "studio-2714959067-22ea0",
  storageBucket: "studio-2714959067-22ea0.appspot.com",
  messagingSenderId: "722448916409",
  appId: "1:722448916409:web:871521cf99c094f6b6e068"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
