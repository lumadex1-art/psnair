/**
 * Utility untuk migrate existing localStorage balance ke Firestore
 * Ini akan membantu users yang sudah punya balance di localStorage
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LocalStorageState {
  user: any;
  balance: number;
  userTier: string;
  lastClaimTimestamp: number | null;
  referralCode: string;
  referrals: any[];
}

export const migrateUserBalanceToFirestore = async (uid: string, localBalance: number) => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const currentFirestoreBalance = userData.balance || 0;
      
      // Only migrate if localStorage balance is higher than Firestore
      if (localBalance > currentFirestoreBalance) {
        await updateDoc(userDocRef, {
          balance: localBalance,
          updatedAt: new Date(),
          migratedFromLocalStorage: true,
          migrationTimestamp: new Date(),
        });
        
        return { success: true, migratedBalance: localBalance };
      } else {
        return { success: false, reason: 'firestore_balance_higher' };
      }
    } else {
      // Create new user document with localStorage balance
      await setDoc(userDocRef, {
        balance: localBalance,
        plan: { id: 'Free', maxDailyClaims: 1 },
        claimStats: {
          todayClaimCount: 0,
          lastClaimDayKey: '',
          lastClaimAt: null,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        migratedFromLocalStorage: true,
        migrationTimestamp: new Date(),
      });
      
      return { success: true, migratedBalance: localBalance };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const checkAndMigrateAllLocalStorageData = async () => {
  const migrationResults = [];
  
  try {
    // Get all localStorage keys for epsilon drop
    const keys = Object.keys(localStorage);
    const epsilonKeys = keys.filter(key => key.startsWith('epsilonDropState_'));
    
    for (const key of epsilonKeys) {
      try {
        const uid = key.replace('epsilonDropState_', '');
        const storedData = localStorage.getItem(key);
        
        if (storedData) {
          const parsedData: LocalStorageState = JSON.parse(storedData);
          
          if (parsedData.balance && parsedData.balance > 0) {
            const result = await migrateUserBalanceToFirestore(uid, parsedData.balance);
            migrationResults.push({
              uid,
              localBalance: parsedData.balance,
              ...result
            });
          }
        }
      } catch (error) {
        migrationResults.push({
          uid: key,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }
    
    return migrationResults;
  } catch (error) {
    return [];
  }
};

export const validateBalanceConsistency = async (uid: string, localBalance: number) => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const firestoreBalance = userDoc.data().balance || 0;
      
      return {
        isConsistent: localBalance === firestoreBalance,
        localBalance,
        firestoreBalance,
        difference: Math.abs(localBalance - firestoreBalance),
        recommendation: localBalance > firestoreBalance ? 'migrate_to_firestore' : 'use_firestore_value'
      };
    }
    
    return {
      isConsistent: false,
      localBalance,
      firestoreBalance: 0,
      difference: localBalance,
      recommendation: 'create_firestore_document'
    };
  } catch (error) {
    return {
      isConsistent: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
