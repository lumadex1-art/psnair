/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import * as authFunctions from "./auth";
import {
  getPaymentLinkDetails,
  createPaymentLink,
  corsConfirmSolanaPayment,
  corsCreateSolanaIntent,
} from "./cors-solana";
import { onCall } from 'firebase-functions/v2/https';


admin.initializeApp();

// ==================================================================
// V1 FUNCTIONS
// ==================================================================

// V1 Auth trigger
export const onusercreate = functions.auth.user().onCreate(authFunctions.onUserCreate);


// ==================================================================
// V2 FUNCTIONS
// ==================================================================

// V2 Auth functions
export const verifyemailotp = authFunctions.verifyUserEmailOtp;
export const resendemailotp = authFunctions.resendUserEmailOtp;
export const verifyauthtoken = authFunctions.verifyAuthToken;
export const createloginlink = authFunctions.createLoginLink;

// V2 Solana Payment functions
export const getpaymentlinkdetails = getPaymentLinkDetails;
export const createpaymentlink = createPaymentLink;
export const solanacreateintentcors = corsCreateSolanaIntent;
export const solanaconfirmcors = corsConfirmSolanaPayment;

// V2 Referral functions
export const referralProcess = onCall(async (request: any) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }
  // This logic should be moved to a dedicated referral processing file
  // For now, returning a placeholder
  return { success: true, message: 'Referral processing not implemented in this refactor yet.' };
});

export const referralStats = onCall(async (request: any) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }
  const uid = request.auth.uid;
  const db = admin.firestore();
  
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found.');
  }

  return { success: true, stats: userDoc.data()?.referralStats || {} };
});

export const referralValidate = onCall(async (request: any) => {
   if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }
   return {valid: true, message: 'Validation not implemented in this refactor yet.'};
});

export const referralHistory = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }
  const uid = request.auth.uid;
  const db = admin.firestore();

  // Dapatkan riwayat referral
  const referralsSnapshot = await db.collection("referrals")
    .where("referrerUid", "==", uid)
    .orderBy("createdAt", "desc")
    .get();

  const history = referralsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      referredUser: {
        uid: data.referredUid,
        name: data.metadata?.refereeName || "Unknown",
        joinedAt: data.createdAt,
      },
      reward: {
        amount: data.bonusAmount,
        currency: "EPSN",
        claimedAt: data.completedAt,
      },
      status: data.status,
      referralCode: data.referralCode,
    };
  });

  // Hitung statistik bulanan
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  let thisMonthCount = 0;
  let lastMonthCount = 0;

  history.forEach((item) => {
    const joinedDate = (item.referredUser.joinedAt as admin.firestore.Timestamp).toDate();
    if (joinedDate >= startOfMonth) {
      thisMonthCount++;
    } else if (joinedDate >= startOfLastMonth && joinedDate <= endOfLastMonth) {
      lastMonthCount++;
    }
  });


  return {
    success: true,
    total: history.length,
    history: history,
    monthlyStats: {
      thisMonth: thisMonthCount,
      lastMonth: lastMonthCount,
    },
  };
});
