// Test script untuk debug referral
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '@/lib/firebase';

const testReferral = async () => {
  try {
    const functions = getFunctions();
    const processFunction = httpsCallable(functions, 'referralProcess');
    
    const result = await processFunction({ referralCode: 'YKH2X2' });
  } catch (error) {
    // Error handled silently for production
  }
};

// Panggil setelah login
testReferral();