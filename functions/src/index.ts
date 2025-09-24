
import * as admin from "firebase-admin";
import { onRequest, onCall } from "firebase-functions/v2/https";
import { onUserCreate as onUserCreateAuth } from 'firebase-functions/v1/auth';

// Inisialisasi Firebase Admin
admin.initializeApp();

// Impor fungsi dari file lain
import { 
  verifyAuthToken, 
  createLoginLink, 
  onUserCreate,
  verifyUserEmailOtp, 
  resendUserEmailOtp 
} from './auth';

import { 
  processReferral, 
  getReferralStats, 
  validateReferralCode, 
  getReferralHistory 
} from './referral';

import { 
  adminApprovePayment, 
  adminGetPayments, 
  adminVerifyPayment, 
  adminRefundPayment, 
  adminGetAnalytics, 
  adminGetPendingPayments
} from './admin'; 

import { 
  adminApprovePaymentHttp,
  adminGetPendingPaymentsHttp,
  adminGetPaymentsHttp
} from './admin-http';

import { 
  corsCreateSolanaIntent, 
  corsConfirmSolanaPayment 
} from './cors-solana';

// ========================================================================================
// EXPORTS
// ========================================================================================

// FUNGSI AUTH (HTTP dan Callable)
export const verifyemailotp = verifyUserEmailOtp;
export const resendemailotp = resendUserEmailOtp;
export { verifyAuthToken, createLoginLink };
export const onusercreate = onUserCreateAuth(onUserCreate);


// FUNGSI ADMIN (Callable)
export const approveadminpayment = onCall(adminApprovePayment);
export const getadminpayments = onCall(adminGetPayments);
export const verifyadminpayment = onCall(adminVerifyPayment);
export const refundadminpayment = onCall(adminRefundPayment);
export const getadminanalytics = onCall(adminGetAnalytics);
export const getadminpendingpayments = onCall(adminGetPendingPayments);

// FUNGSI ADMIN (HTTP) - Untuk panel admin frontend
export const approveadminpaymenthttp = onRequest(adminApprovePaymentHttp);
export const getadminpendingpaymentshttp = onRequest(adminGetPendingPaymentsHttp);
export const admingetpaymentshttp = onRequest(adminGetPaymentsHttp);


// FUNGSI REFERRAL (Callable)
export const referralprocess = onCall(processReferral);
export const referralstats = onCall(getReferralStats);
export const referralvalidate = onCall(validateReferralCode);
export const referralhistory = onCall(getReferralHistory);

// FUNGSI SOLANA (HTTP dengan CORS manual di dalam fungsi)
export const solanacreateintentcors = onRequest(corsCreateSolanaIntent);
export const solanaconfirmcors = onRequest(corsConfirmSolanaPayment);
