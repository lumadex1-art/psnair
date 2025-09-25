
import * as admin from "firebase-admin";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onUserCreate as onUserCreateAuth } from 'firebase-functions/v1/auth';
import type { Request, Response } from 'express';

// Initialize Firebase Admin
admin.initializeApp();

// ========================================================================================
// CORS MIDDLEWARE
// ========================================================================================

const setCorsHeaders = (req: Request, res: Response) => {
  const origin = req.headers.origin || req.get('Origin') || 'https://psnchainaidrop.digital';
  
  const allowedOrigins = [
    'https://psnchainaidrop.digital',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    'https://localhost:3001',
    'https://6000-firebase-studio-1758420129221.cluster-qxqlf3vb3nbf2r42l5qfoebdry.cloudworkstations.dev'
  ];

  const isAllowed = allowedOrigins.some(allowedOrigin => origin.startsWith(allowedOrigin)) || 
                    (origin && origin.includes('cloudworkstations.dev'));
  
  if (isAllowed) {
    res.set('Access-Control-Allow-Origin', origin);
  } else {
    res.set('Access-Control-Allow-Origin', 'https://psnchainaidrop.digital');
  }

  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Firebase-AppCheck');
};

const withCors = (handler: (req: Request, res: Response) => void | Promise<void>) => 
  onRequest((req, res) => {
    setCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
    } else {
      handler(req, res);
    }
  });
  
const withCorsOnCall = (handler: (request: any) => any) => 
  onCall((request) => {
    // onCall handles CORS for you, but we keep this structure for consistency
    // and in case we need to add other logic later.
    return handler(request);
  });


// ========================================================================================
// IMPORTS
// ========================================================================================

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
export const verifyemailotp = withCorsOnCall(verifyUserEmailOtp);
export const resendemailotp = withCorsOnCall(resendUserEmailOtp);
export const verifyauthtoken = withCors(verifyAuthToken);
export const createloginlink = withCors(createLoginLink);
export const onusercreate = onUserCreateAuth(onUserCreate);


// FUNGSI ADMIN (Callable)
export const approveadminpayment = withCorsOnCall(adminApprovePayment);
export const getadminpayments = withCorsOnCall(adminGetPayments);
export const verifyadminpayment = withCorsOnCall(adminVerifyPayment);
export const refundadminpayment = withCorsOnCall(adminRefundPayment);
export const getadminanalytics = withCorsOnCall(adminGetAnalytics);
export const getadminpendingpayments = withCorsOnCall(adminGetPendingPayments);

// FUNGSI ADMIN (HTTP) - Untuk panel admin frontend
export const approveadminpaymenthttp = withCors(adminApprovePaymentHttp);
export const getadminpendingpaymentshttp = withCors(adminGetPendingPaymentsHttp);
export const admingetpaymentshttp = withCors(adminGetPaymentsHttp);


// FUNGSI REFERRAL (Callable)
export const referralprocess = withCorsOnCall(processReferral);
export const referralstats = withCorsOnCall(getReferralStats);
export const referralvalidate = withCorsOnCall(validateReferralCode);
export const referralhistory = withCorsOnCall(getReferralHistory);

// FUNGSI SOLANA (HTTP dengan CORS manual di dalam fungsi)
export const solanacreateintentcors = withCors(corsCreateSolanaIntent);
export const solanaconfirmcors = withCors(corsConfirmSolanaPayment);
