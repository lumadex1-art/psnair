
import {HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { PlanUtils } from "./config/plans";

interface ClaimData {
  idempotencyKey: string;
}

// Get day key for Asia/Jakarta timezone
function getDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  // Convert to Asia/Jakarta (UTC+7)
  const jakartaTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));
  return jakartaTime.toISOString().split("T")[0]; // YYYY-MM-DD
}

export const claimReward = async (request: CallableRequest<ClaimData>) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const uid = request.auth.uid;
  const {idempotencyKey} = request.data;

  if (!idempotencyKey) {
    throw new HttpsError("invalid-argument", "idempotencyKey is required");
  }

  try {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const dayKey = getDayKey(now.toMillis());

    // Use Firestore transaction for atomicity
    const result = await db.runTransaction(async (transaction) => {
      // Get user document
      const userRef = db.collection("users").doc(uid);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        // Create user if doesn't exist - Free plan gets reward per claim
        const claimAmount = PlanUtils.getPlanRewardPerClaim("Free"); // Dynamic reward
        
        const newUser = {
          displayName: request.auth?.token.name || "User",
          email: request.auth?.token.email || "",
          providers: {google: true},
          balance: claimAmount, // Initialize with correct claim amount
          plan: {id: "Free", maxDailyClaims: 1},
          claimStats: {
            todayClaimCount: 1, // First claim
            lastClaimDayKey: dayKey,
            lastClaimAt: now,
          },
          createdAt: now,
          updatedAt: now,
        };
        transaction.set(userRef, newUser);

        // First claim for new user
        const claimRef = db.collection("claims").doc();
        transaction.set(claimRef, {
          uid,
          timestamp: now,
          dayKey,
          source: "web",
          amount: claimAmount,
          idempotencyKey,
          metadata: {},
        });

        // Set idempotency
        const idemRef = db.collection("users").doc(uid).collection("idem").doc(idempotencyKey);
        transaction.set(idemRef, {createdAt: now});

        return {success: true, message: `Claimed ${claimAmount} EPSN successfully!`, remaining: 0};
      }

      const userData = userDoc.data()!;
      const plan = userData.plan || {id: "Free", maxDailyClaims: 1};
      const claimStats = userData.claimStats || {
        todayClaimCount: 0,
        lastClaimDayKey: "",
        lastClaimAt: null,
      };

      // Check idempotency
      const idemRef = db.collection("users").doc(uid).collection("idem").doc(idempotencyKey);
      const idemDoc = await transaction.get(idemRef);
      if (idemDoc.exists) {
        return {success: false, message: "Claim already processed"};
      }

      // Reset count if new day
      let todayCount = claimStats.todayClaimCount || 0;
      if (claimStats.lastClaimDayKey !== dayKey) {
        todayCount = 0;
      }

      // Check daily limit
      const maxClaims = plan.maxDailyClaims || 1;
      if (todayCount >= maxClaims) {
        throw new HttpsError("resource-exhausted", "Daily claim limit reached");
      }

      // Calculate claim amount based on user's plan - NEW DYNAMIC SYSTEM
      const claimAmount = PlanUtils.getPlanRewardPerClaim(plan.id);

      // Create claim record
      const claimRef = db.collection("claims").doc();
      transaction.set(claimRef, {
        uid,
        timestamp: now,
        dayKey,
        source: "web",
        amount: claimAmount,
        idempotencyKey,
        metadata: {},
      });

      // Update user stats and balance
      transaction.update(userRef, {
        balance: admin.firestore.FieldValue.increment(claimAmount),
        "claimStats.todayClaimCount": todayCount + 1,
        "claimStats.lastClaimAt": now,
        "claimStats.lastClaimDayKey": dayKey,
        updatedAt: now,
      });

      // Set idempotency
      transaction.set(idemRef, {createdAt: now});

      return {
        success: true,
        message: `Claimed ${claimAmount} EPSN successfully!`,
        remaining: maxClaims - (todayCount + 1),
        dayKey,
      };
    });

    return result;
  } catch (error: any) {
    
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Internal server error");
  }
};
