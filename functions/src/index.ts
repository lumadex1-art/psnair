
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
const corsMiddleware = cors({
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
  maxAge: 86400, // Cache preflight for 1 day
});

// Wrapper to apply CORS middleware to our HTTP function handlers
const withCors = (handler: (req: Request, res: Response) => void | Promise<void>) => {
  return onRequest((req: Request, res: Response) => {
    // Manually handle preflight requests
    if (req.method === 'OPTIONS') {
        corsMiddleware(req, res, () => {
            res.status(204).send('');
        });
        return;
    }
    // Handle actual requests
    corsMiddleware(req, res, () => {
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
import { sendLoginLink, verifyAuthToken, createLoginLink, createPaymentLink, getPaymentLinkDetails } from './auth';


// --- EXPORT HTTP-BASED FUNCTIONS WITH CORS WRAPPER ---

// Solana Functions
export const solanaCreateIntentCors = withCors(corsCreateSolanaIntent);
export const solanaConfirmCors = withCors(corsConfirmSolanaPayment);
export const solanaCreateIntent = withCors(corsCreateSolanaIntent); // Alias for frontend
export const solanaConfirm = withCors(corsConfirmSolanaPayment);     // Alias for frontend

// Admin Functions (HTTP versions)
export const getAdminPayments = withCors(adminGetPaymentsHttp);
export const approveAdminPayment = withCors(adminApprovePaymentHttp); // Renaming for clarity

// Auth and Payment Link functions
export const sendLoginLinkHttp = withCors(sendLoginLink);
export const verifyAuthTokenHttp = withCors(verifyAuthToken);
export const createLoginLinkHttp = withCors(createLoginLink);
export const createPaymentLinkHttp = withCors(createPaymentLink);
export const getPaymentLinkDetailsHttp = withCors(getPaymentLinkDetails);


// --- EXPORT CALLABLE FUNCTIONS (No CORS needed as it's handled by Firebase) ---
export const claim = onCall(claimReward);

// Admin callable functions
export { adminGetPayments as adminGetPaymentsOnCall, adminApprovePayment as adminApprovePaymentOnCall, adminGetPendingPayments, adminGetAnalytics, adminRefundPayment };

// Referral callable functions
export const referralProcess = onCall(processReferral);
export const referralStats = onCall(getReferralStats);
export const referralValidate = onCall(validateReferralCode);
