/**
 * Referral Code Generation and Validation Utilities
 */

import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Configuration
const REFERRAL_CODE_LENGTH = 6;
const EXCLUDED_CHARS = ['0', 'O', 'I', 'L', '1']; // Confusing characters
const ALLOWED_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Clear characters only

/**
 * Generate a unique referral code for a user
 */
export const generateReferralCode = (uid: string): string => {
  // Use last 4 chars of UID + timestamp for uniqueness
  const uidSuffix = uid.slice(-4).toUpperCase();
  const timestamp = Date.now().toString(36).slice(-2).toUpperCase();
  
  // Create base code
  let baseCode = uidSuffix + timestamp;
  
  // Replace excluded characters
  EXCLUDED_CHARS.forEach(char => {
    baseCode = baseCode.replace(new RegExp(char, 'g'), 'X');
  });
  
  // Ensure exactly 6 characters
  if (baseCode.length > REFERRAL_CODE_LENGTH) {
    baseCode = baseCode.slice(0, REFERRAL_CODE_LENGTH);
  } else if (baseCode.length < REFERRAL_CODE_LENGTH) {
    // Pad with random allowed characters
    while (baseCode.length < REFERRAL_CODE_LENGTH) {
      const randomChar = ALLOWED_CHARS[Math.floor(Math.random() * ALLOWED_CHARS.length)];
      baseCode += randomChar;
    }
  }
  
  return baseCode;
};

/**
 * Generate a completely random referral code (fallback)
 */
export const generateRandomReferralCode = (): string => {
  let code = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += ALLOWED_CHARS[Math.floor(Math.random() * ALLOWED_CHARS.length)];
  }
  return code;
};

/**
 * Validate referral code format
 */
export const isValidReferralCodeFormat = (code: string): boolean => {
  if (!code || code.length !== REFERRAL_CODE_LENGTH) {
    return false;
  }
  
  // Check if all characters are allowed
  return code.split('').every(char => ALLOWED_CHARS.includes(char));
};

/**
 * Check if referral code exists in database
 */
export const referralCodeExists = async (code: string): Promise<boolean> => {
  try {
    if (!isValidReferralCodeFormat(code)) {
      return false;
    }
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referralCode', '==', code));
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error checking referral code existence:', error);
    }
    return false;
  }
};

/**
 * Get user by referral code
 */
export const getUserByReferralCode = async (code: string) => {
  try {
    if (!isValidReferralCodeFormat(code)) {
      return null;
    }
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referralCode', '==', code));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    return {
      uid: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting user by referral code:', error);
    }
    return null;
  }
};

/**
 * Generate unique referral code (with collision detection)
 */
export const generateUniqueReferralCode = async (uid: string, maxAttempts: number = 5): Promise<string> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const code = attempt === 1 
      ? generateReferralCode(uid) 
      : generateRandomReferralCode();
    
    const exists = await referralCodeExists(code);
    
    if (!exists) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Generated unique referral code: ${code} (attempt ${attempt})`);
      }
      return code;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚠️ Referral code collision: ${code} (attempt ${attempt})`);
    }
  }
  
  // Fallback: use timestamp-based code
  const fallbackCode = Date.now().toString(36).slice(-6).toUpperCase();
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔄 Using fallback referral code: ${fallbackCode}`);
  }
  return fallbackCode;
};

/**
 * Validate referral code and get referrer info
 */
export const validateReferralCode = async (code: string, currentUserUid?: string) => {
  try {
    // Format validation
    if (!isValidReferralCodeFormat(code)) {
      return {
        valid: false,
        error: 'Invalid referral code format',
        code: 'INVALID_FORMAT'
      };
    }
    
    // Get referrer user
    const referrerUser = await getUserByReferralCode(code);
    
    if (!referrerUser) {
      return {
        valid: false,
        error: 'Referral code not found',
        code: 'CODE_NOT_FOUND'
      };
    }
    
    // Prevent self-referral
    if (currentUserUid && referrerUser.uid === currentUserUid) {
      return {
        valid: false,
        error: 'Cannot use your own referral code',
        code: 'SELF_REFERRAL'
      };
    }
    
    return {
      valid: true,
      referrer: {
        uid: referrerUser.uid,
        name: (referrerUser as any).displayName || (referrerUser as any).name || 'User',
        referralCode: (referrerUser as any).referralCode
      }
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error validating referral code:', error);
    }
    return {
      valid: false,
      error: 'Validation error occurred',
      code: 'VALIDATION_ERROR'
    };
  }
};

/**
 * Get referral statistics for a user
 */
export const getReferralStats = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      return {
        totalReferred: 0,
        totalEarned: 0,
        referralCode: '',
        recentReferrals: []
      };
    }
    
    const userData = userDoc.data();
    const referralStats = userData.referralStats || {};
    
    // Get recent referrals
    const referralsRef = collection(db, 'referrals');
    const recentQuery = query(
      referralsRef,
      where('referrerUid', '==', uid),
      // orderBy('createdAt', 'desc'),
      // limit(5)
    );
    
    const recentSnapshot = await getDocs(recentQuery);
    const recentReferrals = recentSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      totalReferred: referralStats.totalReferred || 0,
      totalEarned: referralStats.totalEarned || 0,
      referralCode: userData.referralCode || '',
      recentReferrals: recentReferrals.slice(0, 5) // Limit to 5 most recent
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting referral stats:', error);
    }
    return {
      totalReferred: 0,
      totalEarned: 0,
      referralCode: '',
      recentReferrals: []
    };
  }
};

/**
 * Development helper functions
 */
export const generateTestReferralCodes = (count: number = 10): string[] => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(generateRandomReferralCode());
  }
  return codes;
};

// Development tools
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).referralUtils = {
    generate: generateReferralCode,
    generateRandom: generateRandomReferralCode,
    validate: validateReferralCode,
    exists: referralCodeExists,
    getUser: getUserByReferralCode,
    generateTest: generateTestReferralCodes,
    stats: getReferralStats
  };
}
