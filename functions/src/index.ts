import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Initialize Firebase Admin. It will automatically use the service account credentials
// provided by the Firebase environment.
admin.initializeApp();
console.log('✅ Firebase Admin initialized.');

// Import function modules - MINIMAL UNTUK CORS + ADMIN + CLAIM
import {corsCreateSolanaIntent, corsConfirmSolanaPayment} from "./cors-solana";
import {
  adminApprovePayment as approvePaymentHandler, 
  adminGetPendingPayments as getPendingPaymentsHandler
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

// EXPORT FUNGSI ADMIN UNTUK APPROVE MANUAL
export const adminApprovePayment = onCall(approvePaymentHandler);
export const adminGetPendingPayments = onCall(getPendingPaymentsHandler);
