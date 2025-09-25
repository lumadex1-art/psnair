/**
 * Balance Calculator - Calculate user balance from Firestore claims
 */

import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ClaimRecord {
  id: string;
  amount: number;
  dayKey: string;
  timestamp: any;
  uid: string;
  source: string;
  idempotencyKey: string;
}

export interface BalanceCalculation {
  totalBalance: number;
  totalClaims: number;
  claimHistory: ClaimRecord[];
  lastClaimDate: Date | null;
  todayClaimCount: number;
}

/**
 * Calculate user's total balance from all claims in Firestore
 */
export const calculateUserBalance = async (uid: string): Promise<BalanceCalculation> => {
  try {
    // Query all claims for this user
    const claimsRef = collection(db, 'claims');
    const claimsQuery = query(
      claimsRef,
      where('uid', '==', uid),
      orderBy('timestamp', 'desc')
    );
    
    const claimsSnapshot = await getDocs(claimsQuery);
    const claims: ClaimRecord[] = [];
    let totalBalance = 0;
    
    // Process each claim
    claimsSnapshot.forEach((doc) => {
      const data = doc.data();
      const claim: ClaimRecord = {
        id: doc.id,
        amount: data.amount || 0,
        dayKey: data.dayKey || '',
        timestamp: data.timestamp,
        uid: data.uid || '',
        source: data.source || 'web',
        idempotencyKey: data.idempotencyKey || '',
      };
      
      claims.push(claim);
      totalBalance += claim.amount;
    });
    
    // Calculate today's claims
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const todayClaims = claims.filter(claim => claim.dayKey === today);
    
    // Get last claim date
    const lastClaimDate = claims.length > 0 
      ? claims[0].timestamp?.toDate() 
      : null;
    
    const result: BalanceCalculation = {
      totalBalance,
      totalClaims: claims.length,
      claimHistory: claims,
      lastClaimDate,
      todayClaimCount: todayClaims.length,
    };
    
    return result;
  } catch (error) {
    return {
      totalBalance: 0,
      totalClaims: 0,
      claimHistory: [],
      lastClaimDate: null,
      todayClaimCount: 0,
    };
  }
};

/**
 * Verify balance consistency between users collection and claims collection
 */
export const verifyBalanceConsistency = async (uid: string) => {
  try {
    // Get balance from users collection
    const { doc, getDoc } = await import('firebase/firestore');
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    const userBalance = userDoc.exists() ? userDoc.data().balance || 0 : 0;
    
    // Calculate balance from claims
    const calculation = await calculateUserBalance(uid);
    const calculatedBalance = calculation.totalBalance;
    
    const isConsistent = userBalance === calculatedBalance;
    const difference = Math.abs(userBalance - calculatedBalance);
    
    return {
      userDocBalance: userBalance,
      calculatedBalance,
      isConsistent,
      difference,
      claimsCount: calculation.totalClaims,
      lastClaimDate: calculation.lastClaimDate,
    };
  } catch (error) {
    return {
      userDocBalance: 0,
      calculatedBalance: 0,
      isConsistent: false,
      difference: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Fix user balance by updating users collection with calculated balance from claims
 */
export const fixUserBalance = async (uid: string) => {
  try {
    const calculation = await calculateUserBalance(uid);
    const correctBalance = calculation.totalBalance;
    
    // Update users collection
    const { doc, updateDoc, setDoc } = await import('firebase/firestore');
    const userDocRef = doc(db, 'users', uid);
    
    try {
      await updateDoc(userDocRef, {
        balance: correctBalance,
        updatedAt: new Date(),
        balanceFixedAt: new Date(),
        claimsCount: calculation.totalClaims,
        lastClaimAt: calculation.lastClaimDate,
      });
    } catch (updateError) {
      // If document doesn't exist, create it
      await setDoc(userDocRef, {
        balance: correctBalance,
        plan: { id: 'Free', maxDailyClaims: 1 },
        claimStats: {
          todayClaimCount: calculation.todayClaimCount,
          lastClaimDayKey: new Date().toISOString().split('T')[0],
          lastClaimAt: calculation.lastClaimDate,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        balanceFixedAt: new Date(),
        claimsCount: calculation.totalClaims,
      });
    }
    
    return {
      success: true,
      newBalance: correctBalance,
      claimsProcessed: calculation.totalClaims,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Development helper
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).balanceCalculator = {
    calculate: calculateUserBalance,
    verify: verifyBalanceConsistency,
    fix: fixUserBalance,
  };
}
