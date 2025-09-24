import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {generateUniqueReferralCode} from "./utils";
import * as functions from "firebase-functions";

const db = admin.firestore();

/**
 * Generates a 6-digit numeric One-Time Password.
 */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Stores the OTP in Firestore with an expiration time.
 */
async function storeOtp(uid: string, otp: string): Promise<void> {
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + 10 * 60 * 1000); // 10 minutes expiry

  await db.collection("emailOtps").doc(uid).set({
    uid,
    otp,
    createdAt: now,
    expiresAt,
  });
}

/**
 * Triggered when a new Firebase user is created.
 * Creates a corresponding user document in Firestore and generates an OTP.
 */
export const onUserCreate = async (user: admin.auth.UserRecord) => {
  const userRef = db.collection("users").doc(user.uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    const referralCode = await generateUniqueReferralCode(user.uid);
    const newUser = {
      displayName: user.displayName || user.email || `User ${user.uid.slice(0, 5)}`,
      name: user.displayName || user.email || `User ${user.uid.slice(0, 5)}`,
      email: user.email || null,
      photoURL: user.photoURL || null,
      phoneNumber: user.phoneNumber || null,
      walletAddress: null, // Wallet address is not available on email signup
      balance: 0,
      plan: {
        id: "Free",
        maxDailyClaims: 1,
        rewardPerClaim: 10,
      },
      claimStats: {
        todayClaimCount: 0,
        lastClaimDayKey: "",
        lastClaimAt: null,
      },
      referralCode: referralCode,
      referralStats: {
        totalReferred: 0,
        totalEarned: 0,
        lastReferralAt: null,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await userRef.set(newUser, {merge: true});

    // Generate and store OTP for email verification
    if (user.email) {
      const otp = generateOtp();
      await storeOtp(user.uid, otp);
      // Log for development/testing purposes as we can't send emails
      functions.logger.log(`Generated OTP for ${user.email} (UID: ${user.uid}): ${otp}`);
    }
  }
};


/**
 * Verifies the email OTP provided by the user.
 */
export const verifyEmailOtp = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = request.auth.uid;
  const otp = request.data.otp;

  if (!otp || typeof otp !== "string" || otp.length !== 6) {
    throw new HttpsError("invalid-argument", "Please provide a valid 6-digit OTP.");
  }

  const otpDocRef = db.collection("emailOtps").doc(uid);
  const otpDoc = await otpDocRef.get();

  if (!otpDoc.exists) {
    throw new HttpsError("not-found", "No OTP found for this user. Please request a new one.");
  }

  const otpData = otpDoc.data()!;
  const now = admin.firestore.Timestamp.now();

  if (now > otpData.expiresAt) {
    await otpDocRef.delete();
    throw new HttpsError("deadline-exceeded", "The OTP has expired. Please request a new one.");
  }

  if (otpData.otp !== otp) {
    throw new HttpsError("invalid-argument", "The OTP is incorrect.");
  }

  // If OTP is correct, mark user's email as verified
  await admin.auth().updateUser(uid, {emailVerified: true});

  // Clean up the used OTP
  await otpDocRef.delete();

  return {success: true, message: "Email successfully verified!"};
});

/**
 * Resends a new email OTP to the user.
 */
export const resendEmailOtp = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }
  const uid = request.auth.uid;
  const user = await admin.auth().getUser(uid);

  if (!user.email) {
    throw new HttpsError("failed-precondition", "User does not have an email address.");
  }

  const otp = generateOtp();
  await storeOtp(uid, otp);
  functions.logger.log(`Resent OTP for ${user.email} (UID: ${uid}): ${otp}`);

  return {success: true, message: "A new OTP has been generated."};
});
