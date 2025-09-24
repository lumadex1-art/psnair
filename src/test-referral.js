// Test script untuk debug referral
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '@/lib/firebase';

const testReferral = async () => {
  try {
    const functions = getFunctions();
    const processFunction = httpsCallable(functions, 'referralProcess');
    
    const result = await processFunction({ referralCode: 'YKH2X2' });
    console.log('Referral result:', result);
  } catch (error) {
    console.error('Referral error:', error);
  }
};

// Panggil setelah login
testReferral();