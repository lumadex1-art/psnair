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
  corsGetPaymentLinkDetails,
  corsCreatePaymentLink,
  corsConfirmSolanaPayment,
  corsCreateSolanaIntent,
} from "./cors-solana";
import {
  adminGetPayments,
  adminApprovePayment,
  adminRefundPayment,
} from "./admin";
import { claim } from "./claim";
import {
  processReferral,
  getReferralStats,
  validateReferralCode,
} from "./referral";


admin.initializeApp();

// Auth triggers
export const onusercreate = functions.auth.user().onCreate(authFunctions.onUserCreate);

// Solana Payment functions
export const getpaymentlinkdetails = corsGetPaymentLinkDetails;
export const createpaymentlink = corsCreatePaymentLink;
// export const createpaymentlinkhttp = corsCreatePaymentLink;
export const solanacreateintentcors = corsCreateSolanaIntent;
export const solanaconfirmcors = corsConfirmSolanaPayment;

// Admin functions
export const admingetpayments = adminGetPayments;
export const adminapprovepayment = adminApprovePayment;
export const adminrefundpayment = adminRefundPayment;

// Claim function
export const dailyClaim = claim;

// Referral functions
export const referralProcess = onCall(processReferral);
export const referralStats = onCall(getReferralStats);
export const referralValidate = onCall(validateReferralCode);
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
