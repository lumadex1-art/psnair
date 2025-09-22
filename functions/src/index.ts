import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Initialize Firebase Admin. It will automatically use the service account credentials
// provided by the Firebase environment.
admin.initializeApp();
console.log('✅ Firebase Admin initialized.');

// Import function modules
import {corsCreateSolanaIntent, corsConfirmSolanaPayment} from "./cors-solana";
import {
  adminGetPayments,
  adminApprovePayment,
  adminGetPendingPayments,
  adminGetAnalytics,
  adminRefundPayment,
} from "./admin";
import { claimReward } from "./claim";
import {onCall} from "firebase-functions/v2/https";

// EXPORT FUNGSI CORS YANG DIBUTUHKAN
export const solanaCreateIntentCors = onRequest(corsCreateSolanaIntent);
export const solanaConfirmCors = onRequest(corsConfirmSolanaPayment);

// EXPORT FUNGSI DENGAN NAMA YANG DIHARAPKAN FRONTEND
export const solanaCreateIntent = onRequest(corsCreateSolanaIntent);
export const solanaConfirm = onRequest(corsConfirmSolanaPayment);

// EXPORT FUNGSI CLAIM YANG SUDAH DIPERBAIKI
export const claim = onCall(claimReward);

// EXPORT FUNGSI ADMIN 
export const adminGetPayments = onCall(adminGetPayments);
export const adminApprovePayment = onCall(adminApprovePayment);
export const adminGetPendingPayments = onCall(adminGetPendingPayments);
export const adminGetAnalytics = onCall(adminGetAnalytics);
export const adminRefundPayment = onCall(adminRefundPayment);
