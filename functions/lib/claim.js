"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimReward = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const plans_1 = require("./config/plans");
const db = admin.firestore();
// Get day key for Asia/Jakarta timezone
function getDayKey(timestamp) {
    const date = new Date(timestamp);
    // Convert to Asia/Jakarta (UTC+7)
    const jakartaTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    return jakartaTime.toISOString().split("T")[0]; // YYYY-MM-DD
}
const claimReward = async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    const uid = request.auth.uid;
    const { idempotencyKey } = request.data;
    if (!idempotencyKey) {
        throw new https_1.HttpsError("invalid-argument", "idempotencyKey is required");
    }
    try {
        const now = admin.firestore.Timestamp.now();
        const dayKey = getDayKey(now.toMillis());
        // Use Firestore transaction for atomicity
        const result = await db.runTransaction(async (transaction) => {
            var _a, _b;
            // Get user document
            const userRef = db.collection("users").doc(uid);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                // Create user if doesn't exist - Free plan gets reward per claim
                const claimAmount = plans_1.PlanUtils.getPlanRewardPerClaim("Free"); // Dynamic reward
                const newUser = {
                    displayName: ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.name) || "User",
                    email: ((_b = request.auth) === null || _b === void 0 ? void 0 : _b.token.email) || "",
                    providers: { google: true },
                    balance: claimAmount, // Initialize with correct claim amount
                    plan: { id: "Free", maxDailyClaims: 1 },
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
                transaction.set(idemRef, { createdAt: now });
                return { success: true, message: `Claimed ${claimAmount} EPSN successfully!`, remaining: 0 };
            }
            const userData = userDoc.data();
            const plan = userData.plan || { id: "Free", maxDailyClaims: 1 };
            const claimStats = userData.claimStats || {
                todayClaimCount: 0,
                lastClaimDayKey: "",
                lastClaimAt: null,
            };
            // Check idempotency
            const idemRef = db.collection("users").doc(uid).collection("idem").doc(idempotencyKey);
            const idemDoc = await transaction.get(idemRef);
            if (idemDoc.exists) {
                return { success: false, message: "Claim already processed" };
            }
            // Reset count if new day
            let todayCount = claimStats.todayClaimCount || 0;
            if (claimStats.lastClaimDayKey !== dayKey) {
                todayCount = 0;
            }
            // Check daily limit
            const maxClaims = plan.maxDailyClaims || 1;
            if (todayCount >= maxClaims) {
                throw new https_1.HttpsError("resource-exhausted", "Daily claim limit reached");
            }
            // Calculate claim amount based on user's plan - NEW DYNAMIC SYSTEM
            const claimAmount = plans_1.PlanUtils.getPlanRewardPerClaim(plan.id);
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
            transaction.set(idemRef, { createdAt: now });
            return {
                success: true,
                message: `Claimed ${claimAmount} EPSN successfully!`,
                remaining: maxClaims - (todayCount + 1),
                dayKey,
            };
        });
        return result;
    }
    catch (error) {
        console.error("Claim error:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "Internal server error");
    }
};
exports.claimReward = claimReward;
//# sourceMappingURL=claim.js.map