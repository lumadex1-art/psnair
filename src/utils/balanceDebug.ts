/**
 * Debug utilities untuk troubleshoot balance issues
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface BalanceDebugInfo {
  uid: string;
  localStorage: {
    exists: boolean;
    balance: number | null;
    lastClaimTimestamp: number | null;
    userTier: string | null;
  };
  firestore: {
    exists: boolean;
    balance: number | null;
    lastClaimAt: any;
    planId: string | null;
    claimCount: number | null;
  };
  consistency: {
    balanceMatch: boolean;
    difference: number;
    recommendation: string;
  };
}

export const debugUserBalance = async (uid: string): Promise<BalanceDebugInfo> => {
  const debugInfo: BalanceDebugInfo = {
    uid,
    localStorage: {
      exists: false,
      balance: null,
      lastClaimTimestamp: null,
      userTier: null,
    },
    firestore: {
      exists: false,
      balance: null,
      lastClaimAt: null,
      planId: null,
      claimCount: null,
    },
    consistency: {
      balanceMatch: false,
      difference: 0,
      recommendation: '',
    },
  };

  try {
    // Check localStorage
    const localStorageKey = `epsilonDropState_${uid}`;
    const storedData = localStorage.getItem(localStorageKey);
    
    if (storedData) {
      debugInfo.localStorage.exists = true;
      const parsedData = JSON.parse(storedData);
      debugInfo.localStorage.balance = parsedData.balance || 0;
      debugInfo.localStorage.lastClaimTimestamp = parsedData.lastClaimTimestamp;
      debugInfo.localStorage.userTier = parsedData.userTier;
    }

    // Check Firestore
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      debugInfo.firestore.exists = true;
      const userData = userDoc.data();
      debugInfo.firestore.balance = userData.balance || 0;
      debugInfo.firestore.lastClaimAt = userData.claimStats?.lastClaimAt;
      debugInfo.firestore.planId = userData.plan?.id;
      debugInfo.firestore.claimCount = userData.claimStats?.todayClaimCount;
    }

    // Analyze consistency
    const localBalance = debugInfo.localStorage.balance || 0;
    const firestoreBalance = debugInfo.firestore.balance || 0;
    
    debugInfo.consistency.balanceMatch = localBalance === firestoreBalance;
    debugInfo.consistency.difference = Math.abs(localBalance - firestoreBalance);
    
    if (debugInfo.consistency.balanceMatch) {
      debugInfo.consistency.recommendation = 'Balances are in sync ✅';
    } else if (localBalance > firestoreBalance) {
      debugInfo.consistency.recommendation = 'localStorage balance higher - should migrate to Firestore';
    } else {
      debugInfo.consistency.recommendation = 'Firestore balance higher - should update localStorage';
    }

    return debugInfo;
  } catch (error) {
    debugInfo.consistency.recommendation = 'Error occurred during debug';
    return debugInfo;
  }
};

export const printBalanceDebug = async (uid: string) => {
  const debug = await debugUserBalance(uid);
  
  return debug;
};

export const fixBalanceInconsistency = async (uid: string) => {
  const debug = await debugUserBalance(uid);
  
  if (debug.consistency.balanceMatch) {
    return { success: true, message: 'Already in sync' };
  }
  
  try {
    const localBalance = debug.localStorage.balance || 0;
    const firestoreBalance = debug.firestore.balance || 0;
    
    // Use the higher balance as the correct one
    const correctBalance = Math.max(localBalance, firestoreBalance);
    
    // Update localStorage
    if (debug.localStorage.exists) {
      const localStorageKey = `epsilonDropState_${uid}`;
      const storedData = localStorage.getItem(localStorageKey);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        parsedData.balance = correctBalance;
        localStorage.setItem(localStorageKey, JSON.stringify(parsedData));
      }
    }
    
    // Update Firestore if needed
    if (firestoreBalance < correctBalance) {
      const { updateDoc } = await import('firebase/firestore');
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        balance: correctBalance,
        updatedAt: new Date(),
        balanceFixedAt: new Date(),
      });
    }
    
    return { 
      success: true, 
      message: `Balance fixed to ${correctBalance}`,
      newBalance: correctBalance 
    };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Development helper - add to window for easy debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugBalance = {
    debug: debugUserBalance,
    print: printBalanceDebug,
    fix: fixBalanceInconsistency,
  };
}
