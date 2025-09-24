import * as admin from "firebase-admin";

const db = admin.firestore();

const REFERRAL_CODE_LENGTH = 6;
const ALLOWED_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generates a random referral code.
 */
const generateRandomReferralCode = (): string => {
  let code = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += ALLOWED_CHARS[Math.floor(Math.random() * ALLOWED_CHARS.length)];
  }
  return code;
};

/**
 * Checks if a referral code already exists in the database.
 */
const referralCodeExists = async (code: string): Promise<boolean> => {
  const usersRef = db.collection("users");
  const q = usersRef.where("referralCode", "==", code);
  const querySnapshot = await q.get();
  return !querySnapshot.empty;
};

/**
 * Generates a unique referral code, ensuring it doesn't already exist.
 * It tries to generate a code based on the UID first, then random codes.
 */
export const generateUniqueReferralCode = async (uid: string, maxAttempts = 5): Promise<string> => {
  // First attempt with a predictable but likely unique code from UID
  let potentialCode = uid.slice(0, 3).toUpperCase() + uid.slice(-3).toUpperCase();
  if (potentialCode.length > REFERRAL_CODE_LENGTH) {
    potentialCode = potentialCode.slice(0, REFERRAL_CODE_LENGTH);
  }

  let exists = await referralCodeExists(potentialCode);
  if (!exists) {
    return potentialCode;
  }

  // If the first one fails, try random codes for the remaining attempts
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const randomCode = generateRandomReferralCode();
    exists = await referralCodeExists(randomCode);
    if (!exists) {
      return randomCode;
    }
  }

  // As a final fallback, append a random number to the UID-based code
  return `${potentialCode.slice(0, 4)}${Math.floor(10 + Math.random() * 90)}`;
};
