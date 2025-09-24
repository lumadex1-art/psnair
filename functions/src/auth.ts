import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {generateUniqueReferralCode} from "./utils";

const db = admin.firestore();

/**
 * Triggered when a new Firebase user is created.
 * Creates a corresponding user document in Firestore.
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
      walletAddress: user.providerData.some((p) => p.providerId === "phone") ? null : user.uid,
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
  }
};
