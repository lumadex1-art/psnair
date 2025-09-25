
import * as admin from "firebase-admin";
import {Connection, PublicKey} from "@solana/web3.js";
import { PlanUtils, VALID_PLAN_IDS } from "./config/plans";

const connection = new Connection("https://rpc-mainnet.solanatracker.io/?api_key=bb9aeffe-6d8f-4df1-a357-d0dfde36ee28", "confirmed");

const MERCHANT_WALLET = new PublicKey("Fj86LrcDNkiDRs3rQs4dZEDaj769N8bTTvipANV8vBby");

// CORS headers with development support
const setCorsHeaders = (res: any, req: any) => {
  const origin = (req.headers.origin || req.get('Origin')) as string | undefined;

  // Allow production domain and development domains
  const allowedOrigins = [
    'https://psnchainaidrop.digital',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    'https://localhost:3001',
    'https://6000-firebase-studio-1758420129221.cluster-qxqlf3vb3nbf2r42l5qfoebdry.cloudworkstations.dev'
  ];

  // Allow Firebase Studio/Workstation domains (development)
  const isFirebaseStudio = !!origin && (
    origin.includes('firebase-studio') ||
    origin.includes('cloudworkstations.dev') ||
    origin.includes('web.app') ||
    origin.includes('firebaseapp.com')
  );

  // Ensure caches don't coalesce different origins
  res.set('Vary', 'Origin, Access-Control-Request-Headers');

  if (origin && (allowedOrigins.includes(origin) || isFirebaseStudio)) {
    res.set('Access-Control-Allow-Origin', origin);
  } else {
    // Fallback to production domain
    res.set('Access-Control-Allow-Origin', 'https://psnchainaidrop.digital');
  }

  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  // Reflect requested headers if provided, otherwise use a safe default
  const requestedHeaders = (req.headers['access-control-request-headers'] as string | undefined) || 'Content-Type, Authorization';
  res.set('Access-Control-Allow-Headers', requestedHeaders);

  res.set('Access-Control-Allow-Credentials', 'true');
  // Cache preflight for a day to reduce OPTIONS traffic
  res.set('Access-Control-Max-Age', '86400');
};

// Simple CORS-enabled Solana Create Intent
export const corsCreateSolanaIntent = async (req: any, res: any) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, req);
    res.status(204).send('');
    return;
  }

  setCorsHeaders(res, req);

  try {
    const db = admin.firestore();
    // Verify authentication
    const authHeader = req.headers.authorization || req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization header' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const { planId } = req.body;
    if (!planId || !PlanUtils.isValidPlan(planId)) {
      res.status(400).json({ 
        error: 'Invalid planId', 
        validPlans: VALID_PLAN_IDS 
      });
      return;
    }

    const amountLamports = PlanUtils.getPlanPriceInLamports(planId);

    // Create transaction record
    const transactionRef = db.collection("transactions").doc();
    const now = admin.firestore.Timestamp.now();

    await transactionRef.set({
      uid,
      planId,
      status: "pending",
      provider: "solana",
      amountLamports,
      currency: "SOL",
      createdAt: now,
      updatedAt: now,
    });

    res.status(200).json({
      success: true,
      transactionId: transactionRef.id,
      amountLamports,
      merchantWallet: MERCHANT_WALLET.toBase58(),
    });
  } catch (error: any) {
    
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
};

// Simple CORS-enabled Solana Confirm
export const corsConfirmSolanaPayment = async (req: any, res: any) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, req);
    res.status(204).send('');
    return;
  }

  setCorsHeaders(res, req);

  try {
    const db = admin.firestore();
    // Verify authentication
    const authHeader = req.headers.authorization || req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization header' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const { transactionId, signature } = req.body;
    if (!transactionId || !signature) {
      res.status(400).json({ error: 'transactionId and signature required' });
      return;
    }

    // Get transaction record
    const transactionRef = db.collection("transactions").doc(transactionId);
    const transactionDoc = await transactionRef.get();

    if (!transactionDoc.exists) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const transactionData = transactionDoc.data()!;

    // Verify ownership
    if (transactionData.uid !== uid) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Check if already processed
    if (transactionData.status === "paid") {
      res.status(200).json({ success: true, message: "Already confirmed" });
      return;
    }

    // Verify signature on-chain
    const signatureStatus = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });

    if (!signatureStatus.value || signatureStatus.value.err || !signatureStatus.value.confirmationStatus) {
      res.status(400).json({ error: 'Transaction verification failed' });
      return;
    }

    // Update transaction status to pending (waiting for admin approval)
    await transactionRef.update({
      status: "pending",
      providerRef: signature,
      confirmedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      paymentVerified: true,
      verificationNote: "Payment verified on-chain, waiting for admin approval"
    });

    res.status(200).json({
      success: true,
      message: "Payment verified successfully! Your upgrade is pending admin approval.",
      planId: transactionData.planId,
      status: "pending_approval"
    });
  } catch (error: any) {
    
    res.status(500).json({ error: 'Payment confirmation failed' });
  }
};
