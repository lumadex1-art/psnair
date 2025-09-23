
import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {onCall} from "firebase-functions/v2/https";
import * as cors from "cors";
import { Request, Response } from "firebase-functions";

// Initialize Firebase Admin. It will automatically use the service account credentials
// provided by the Firebase environment.
admin.initializeApp();
console.log('✅ Firebase Admin initialized.');

// --- CENTRALIZED CORS CONFIGURATION ---
const corsOptions = {
  origin: [
    'https://psnchainaidrop.digital',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    'https://localhost:3001',
    'https://6000-firebase-studio-1758420129221.cluster-qxqlf3vb3nbf2r42l5qfoebdry.cloudworkstations.dev'
  ],
  methods: 'GET, POST, OPTIONS',
  allowedHeaders: 'Content-Type, Authorization',
  credentials: true,
};

const corsMiddleware = cors(corsOptions);

const withCors = (handler: (req: Request, res: Response) => void) => {
  return onRequest((req: Request, res: Response) => {
    corsMiddleware(req, res, () => {
      // The actual handler logic is now inside the cors middleware callback.
      handler(req, res);
    });
  });
};


// Import function modules
import {corsCreateSolanaIntent, corsConfirmSolanaPayment} from "./cors-solana";
import {
  adminGetPaymentsHttp,
  adminApprovePaymentHttp,
  adminGetPayments,
  adminApprovePayment,
  adminGetPendingPayments,
  adminGetAnalytics,
  adminRefundPayment,
} from "./admin";
import { claimReward } from "./claim";
import { processReferral, getReferralStats, validateReferralCode } from "./referral";
import { verifyAuthToken, createLoginLink, createPaymentLink, getPaymentLinkDetails } from './auth';


// --- EXPORT HTTP-BASED FUNCTIONS WITH CORS WRAPPER ---

// Solana Functions
export const solanaCreateIntentCors = withCors(corsCreateSolanaIntent);
export const solanaConfirmCors = withCors(corsConfirmSolanaPayment);
export const solanaCreateIntent = withCors(corsCreateSolanaIntent); // Alias
export const solanaConfirm = withCors(corsConfirmSolanaPayment);     // Alias

// Admin Functions
export const getAdminPayments = withCors(adminGetPaymentsHttp);
export const approveAdminPaymentHttp = withCors(adminApprovePaymentHttp); // Renaming for clarity

// Auth and Payment Link functions
export const wrappedVerifyAuthToken = withCors(verifyAuthToken);
export const wrappedCreateLoginLink = withCors(createLoginLink);
export const wrappedCreatePaymentLink = withCors(createPaymentLink);
export const wrappedGetPaymentLinkDetails = withCors(getPaymentLinkDetails);


// --- EXPORT CALLABLE FUNCTIONS (No CORS needed) ---
export const claim = onCall(claimReward);

// Admin callable functions
export { adminGetPayments, adminApprovePayment, adminGetPendingPayments, adminGetAnalytics, adminRefundPayment };

// Referral callable functions
export const referralProcess = onCall(processReferral);
export const referralStats = onCall(getReferralStats);
export const referralValidate = onCall(validateReferralCode);
