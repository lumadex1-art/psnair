import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {onCall} from "firebase-functions/v2/https";

// Initialize Firebase Admin. It will automatically use the service account credentials
// provided by the Firebase environment.
admin.initializeApp();
console.log('✅ Firebase Admin initialized.');

// Import function modules
import {corsCreateSolanaIntent, corsConfirmSolanaPayment} from "./cors-solana";
import {
  adminGetPaymentsHttp,
  adminApprovePaymentHttp,
  // Keep old callable functions for reference or gradual migration if needed
  adminGetPayments,
  adminApprovePayment,
  adminGetPendingPayments,
  adminGetAnalytics,
  adminRefundPayment,
} from "./admin";
import { claimReward } from "./claim";
import { processReferral, getReferralStats, validateReferralCode } from "./referral";
import { verifyAuthToken, createLoginLink, createPaymentLink, getPaymentLinkDetails } from './auth';


// EXPORT HTTP-BASED SOLANA FUNCTIONS
export const solanaCreateIntentCors = onRequest(corsCreateSolanaIntent);
export const solanaConfirmCors = onRequest(corsConfirmSolanaPayment);
export const solanaCreateIntent = onRequest(corsCreateSolanaIntent);
export const solanaConfirm = onRequest(corsConfirmSolanaPayment);

// EXPORT HTTP-BASED ADMIN FUNCTIONS
export const getAdminPayments = adminGetPaymentsHttp;
export const approveAdminPayment = adminApprovePaymentHttp;


// EXPORT CALLABLE FUNCTIONS
export const claim = onCall(claimReward);

// Admin callable functions (can be removed if fully migrated to HTTP)
export { adminGetPayments, adminApprovePayment, adminGetPendingPayments, adminGetAnalytics, adminRefundPayment };

// Referral callable functions
export const referralProcess = onCall(processReferral);
export const referralStats = onCall(getReferralStats);
export const referralValidate = onCall(validateReferralCode);

// Auth and Payment Link functions
export { verifyAuthToken, createLoginLink, createPaymentLink, getPaymentLinkDetails };
