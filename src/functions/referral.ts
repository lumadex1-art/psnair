import {HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface ProcessReferralData {
  referralCode: string;
}

interface ReferralRewards {
  referrer: number;
  referee: number;
}

// Referral reward configuration
const REFERRAL_REWARDS: ReferralRewards = {
  referrer: 1, // Referrer gets 1 EPSN
  referee: 10,  // Referee gets 10 EPSN
};

/**
 * Process referral when a new user signs up with a referral code
 */
export const processReferral = async (request: CallableRequest<ProcessReferralData>) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const referredUid = request.auth.uid;
  const {referralCode} = request.data;

  if (!referralCode || referralCode.trim().length === 0) {
    throw new HttpsError("invalid-argument", "Referral code is required");
  }

  try {
    const now = admin.firestore.Timestamp.now();

    // Use Firestore transaction for atomicity
    const result = await db.runTransaction(async (transaction) => {
      // 1. Find referrer by referral code
      const usersRef = db.collection("users");
      const referrerQuery = usersRef.where("referralCode", "==", referralCode.trim().toUpperCase());
      const referrerSnapshot = await transaction.get(referrerQuery);

      if (referrerSnapshot.empty) {
        throw new HttpsError("not-found", "Invalid referral code");
      }

      const referrerDoc = referrerSnapshot.docs[0];
      const referrerUid = referrerDoc.id;
      const referrerData = referrerDoc.data();

      // 2. Prevent self-referral
      if (referrerUid === referredUid) {
        throw new HttpsError("invalid-argument", "Cannot use your own referral code");
      }

      // 3. Check if user already has a referral
      const referredUserRef = db.collection("users").doc(referredUid);
      const referredUserDoc = await transaction.get(referredUserRef);

      if (!referredUserDoc.exists) {
        throw new HttpsError("not-found", "User document not found");
      }

      const referredUserData = referredUserDoc.data()!;

      // Check if user already used a referral code
      if (referredUserData.referredBy) {
        throw new HttpsError("already-exists", "You have already used a referral code");
      }

      // 4. Check for duplicate referral
      const existingReferralQuery = db.collection("referrals")
        .where("referredUid", "==", referredUid);
      const existingReferralSnapshot = await transaction.get(existingReferralQuery);

      if (!existingReferralSnapshot.empty) {
        throw new HttpsError("already-exists", "Referral already processed");
      }

      // 5. Create referral record
      const referralRef = db.collection("referrals").doc();
      const referralData = {
        referrerUid,
        referredUid,
        referralCode: referralCode.trim().toUpperCase(),
        bonusAmount: REFERRAL_REWARDS.referrer,
        refereeBonusAmount: REFERRAL_REWARDS.referee,
        status: "completed",
        createdAt: now,
        completedAt: now,
        metadata: {
          referrerName: referrerData.displayName || referrerData.name || "User",
          refereeName: referredUserData.displayName || referredUserData.name || "User",
        },
      };

      transaction.set(referralRef, referralData);

      // 6. Update referrer stats and balance
      const referrerStats = referrerData.referralStats || {
        totalReferred: 0,
        totalEarned: 0,
        lastReferralAt: null,
      };

      transaction.update(referrerDoc.ref, {
        balance: admin.firestore.FieldValue.increment(REFERRAL_REWARDS.referrer),
        "referralStats.totalReferred": referrerStats.totalReferred + 1,
        "referralStats.totalEarned": referrerStats.totalEarned + REFERRAL_REWARDS.referrer,
        "referralStats.lastReferralAt": now,
        updatedAt: now,
      });

      // 7. Update referee (referred user) balance and referral info
      transaction.update(referredUserRef, {
        balance: admin.firestore.FieldValue.increment(REFERRAL_REWARDS.referee),
        referredBy: referralCode.trim().toUpperCase(),
        referredByUid: referrerUid,
        referralBonusReceived: REFERRAL_REWARDS.referee,
        referralProcessedAt: now,
        updatedAt: now,
      });

      return {
        success: true,
        message: `Referral processed! You received ${REFERRAL_REWARDS.referee} EPSN bonus!`,
        bonusReceived: REFERRAL_REWARDS.referee,
        referrerBonus: REFERRAL_REWARDS.referrer,
        referrerName: referrerData.displayName || referrerData.name || "User",
      };
    });

    return result;
  } catch (error: any) {
    console.error("Referral processing error:", error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError("internal", "Failed to process referral");
  }
};

/**
 * Get referral statistics for a user
 */
export const getReferralStats = async (request: CallableRequest<{}>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const uid = request.auth.uid;

  try {
    // Get user document
    const userDoc = await db.collection("users").doc(uid).get();
    
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data()!;
    const referralStats = userData.referralStats || {
      totalReferred: 0,
      totalEarned: 0,
      lastReferralAt: null,
    };

    // Get recent referrals
    const referralsSnapshot = await db.collection("referrals")
      .where("referrerUid", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const recentReferrals = referralsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        refereeName: data.metadata?.refereeName || "User",
        bonusAmount: data.bonusAmount,
        createdAt: data.createdAt,
        status: data.status,
      };
    });

    return {
      success: true,
      stats: {
        referralCode: userData.referralCode,
        totalReferred: referralStats.totalReferred,
        totalEarned: referralStats.totalEarned,
        lastReferralAt: referralStats.lastReferralAt,
        recentReferrals,
      },
    };
  } catch (error: any) {
    console.error("Get referral stats error:", error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError("internal", "Failed to get referral stats");
  }
};

/**
 * Validate referral code (check if it exists and is valid)
 */
export const validateReferralCode = async (request: CallableRequest<{referralCode: string}>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {referralCode} = request.data;
  const currentUserUid = request.auth.uid;

  if (!referralCode || referralCode.trim().length === 0) {
    throw new HttpsError("invalid-argument", "Referral code is required");
  }

  try {
    // Find user with this referral code
    const usersSnapshot = await db.collection("users")
      .where("referralCode", "==", referralCode.trim().toUpperCase())
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return {
        valid: false,
        error: "Referral code not found",
        code: "CODE_NOT_FOUND",
      };
    }

    const referrerDoc = usersSnapshot.docs[0];
    const referrerUid = referrerDoc.id;
    const referrerData = referrerDoc.data();

    // Check self-referral
    if (referrerUid === currentUserUid) {
      return {
        valid: false,
        error: "Cannot use your own referral code",
        code: "SELF_REFERRAL",
      };
    }

    // Check if current user already used a referral
    const currentUserDoc = await db.collection("users").doc(currentUserUid).get();
    if (currentUserDoc.exists) {
      const currentUserData = currentUserDoc.data()!;
      if (currentUserData.referredBy) {
        return {
          valid: false,
          error: "You have already used a referral code",
          code: "ALREADY_REFERRED",
        };
      }
    }

    return {
      valid: true,
      referrer: {
        uid: referrerUid,
        name: referrerData.displayName || referrerData.name || "User",
        referralCode: referrerData.referralCode,
      },
      rewards: {
        youWillReceive: REFERRAL_REWARDS.referee,
        referrerWillReceive: REFERRAL_REWARDS.referrer,
      },
    };
  } catch (error: any) {
    console.error("Validate referral code error:", error);
    throw new HttpsError("internal", "Failed to validate referral code");
  }
};
