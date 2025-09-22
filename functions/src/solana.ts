import {HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {Connection, PublicKey} from "@solana/web3.js";
import { PlanUtils, VALID_PLAN_IDS } from "./config/plans";

const db = admin.firestore();
const connection = new Connection("https://rpc-mainnet.solanatracker.io/?api_key=bb9aeffe-6d8f-4df1-a357-d0dfde36ee28", "confirmed");

// CORS headers for manual handling with development support
const setCorsHeaders = (res: any, req?: any) => {
  if (req) {
    const origin = req.headers.origin || req.get('Origin');
    
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
    const isFirebaseStudio = origin && (
      origin.includes('firebase-studio') || 
      origin.includes('cloudworkstations.dev') ||
      origin.includes('web.app') ||
      origin.includes('firebaseapp.com')
    );
    
    if (allowedOrigins.includes(origin) || isFirebaseStudio) {
      res.set('Access-Control-Allow-Origin', origin);
    } else {
      res.set('Access-Control-Allow-Origin', 'https://psnchainaidrop.digital');
    }
  } else {
    res.set('Access-Control-Allow-Origin', 'https://psnchainaidrop.digital');
  }
  
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Credentials', 'true');
};

const MERCHANT_WALLET = new PublicKey("Fj86LrcDNkiDRs3rQs4dZEDaj769N8bTTvipANV8vBby");

interface CreateIntentData {
  planId: string;
}

interface ConfirmPaymentData {
  transactionId: string;
  signature: string;
}


export const createSolanaIntent = async (request: CallableRequest<CreateIntentData>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {planId} = request.data;
  
  // Validate plan using new configuration
  if (!planId || !PlanUtils.isValidPlan(planId)) {
    throw new HttpsError("invalid-argument", `Invalid planId: ${planId}. Valid plans: ${VALID_PLAN_IDS.join(', ')}`);
  }

  const uid = request.auth.uid;
  const amountLamports = PlanUtils.getPlanPriceInLamports(planId);

  try {
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

    return {
      success: true,
      transactionId: transactionRef.id,
      amountLamports,
      merchantWallet: MERCHANT_WALLET.toBase58(),
    };
  } catch (error: any) {
    console.error("Create intent error:", error);
    throw new HttpsError("internal", "Failed to create payment intent");
  }
};

export const confirmSolanaPayment = async (request: CallableRequest<ConfirmPaymentData>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {transactionId, signature} = request.data;
  if (!transactionId || !signature) {
    throw new HttpsError("invalid-argument", "transactionId and signature are required");
  }

  const uid = request.auth.uid;

  try {
    // Get transaction record
    const transactionRef = db.collection("transactions").doc(transactionId);
    const transactionDoc = await transactionRef.get();

    if (!transactionDoc.exists) {
      throw new HttpsError("not-found", "Transaction not found");
    }

    const transactionData = transactionDoc.data()!;

    // Verify ownership
    if (transactionData.uid !== uid) {
      throw new HttpsError("permission-denied", "Transaction does not belong to user");
    }

    // Check if already processed
    if (transactionData.status === "paid") {
      return {success: true, message: "Payment already confirmed", alreadyProcessed: true};
    }

    // Verify signature on-chain
    const signatureStatus = await connection.getSignatureStatus(signature, {searchTransactionHistory: true});

    if (!signatureStatus.value) {
      throw new HttpsError("not-found", "Transaction signature not found");
    }

    if (signatureStatus.value.err) {
      throw new HttpsError("failed-precondition", "Transaction failed on-chain");
    }

    if (!signatureStatus.value.confirmationStatus) {
      throw new HttpsError("failed-precondition", "Transaction not confirmed");
    }

    // Get full transaction details for verification
    const txDetails = await connection.getTransaction(signature, {commitment: "confirmed"});
    if (!txDetails) {
      throw new HttpsError("not-found", "Transaction details not found");
    }

    // Verify transaction details
    const expectedAmount = transactionData.amountLamports;
    let transferFound = false;

    // Check for SOL transfer to merchant wallet
    if (txDetails.meta?.preBalances && txDetails.meta?.postBalances) {
      const accountKeys = txDetails.transaction.message.accountKeys;
      const merchantIndex = accountKeys.findIndex((key) => key.equals(MERCHANT_WALLET));

      if (merchantIndex >= 0) {
        const balanceChange = txDetails.meta.postBalances[merchantIndex] - txDetails.meta.preBalances[merchantIndex];
        if (balanceChange >= expectedAmount * 0.99) { // Allow 1% tolerance for fees
          transferFound = true;
        }
      }
    }

    if (!transferFound) {
      throw new HttpsError("failed-precondition", "Payment verification failed");
    }

    // Update transaction and user plan in a transaction
    await db.runTransaction(async (transaction) => {
      // Update transaction status
      transaction.update(transactionRef, {
        status: "paid",
        providerRef: signature,
        confirmedAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Get plan details from configuration
      const planData = PlanUtils.getPlanById(transactionData.planId);
      if (!planData) {
        throw new HttpsError("not-found", `Plan not found: ${transactionData.planId}`);
      }

      // Update user plan
      const userRef = db.collection("users").doc(uid);
      transaction.update(userRef, {
        "plan.id": transactionData.planId,
        "plan.maxDailyClaims": planData.maxDailyClaims,
        "plan.upgradedAt": admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });
    });

    return {
      success: true,
      message: "Payment confirmed and plan updated",
      planId: transactionData.planId,
    };
  } catch (error: any) {
    console.error("Confirm payment error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Payment confirmation failed");
  }
};

// HTTP versions with CORS support
export const createSolanaIntentHttp = async (req: any, res: any) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.status(204).send('');
    return;
  }

  setCorsHeaders(res);

  try {
    // Verify authentication
    const authHeader = req.headers.authorization || req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const { planId } = req.body;
    
    // Validate plan using new configuration
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
    console.error("Create intent error:", error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
};

export const confirmSolanaPaymentHttp = async (req: any, res: any) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.status(204).send('');
    return;
  }

  setCorsHeaders(res);

  try {
    // Verify authentication
    const authHeader = req.headers.authorization || req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const { transactionId, signature } = req.body;
    if (!transactionId || !signature) {
      res.status(400).json({ error: 'transactionId and signature are required' });
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
      res.status(403).json({ error: 'Transaction does not belong to user' });
      return;
    }

    // Check if already processed
    if (transactionData.status === "paid") {
      res.status(200).json({ success: true, message: "Payment already confirmed", alreadyProcessed: true });
      return;
    }

    // Verify signature on-chain
    const signatureStatus = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });

    if (!signatureStatus.value) {
      res.status(404).json({ error: 'Transaction signature not found' });
      return;
    }

    if (signatureStatus.value.err) {
      res.status(400).json({ error: 'Transaction failed on-chain' });
      return;
    }

    if (!signatureStatus.value.confirmationStatus) {
      res.status(400).json({ error: 'Transaction not confirmed' });
      return;
    }

    // Get full transaction details for verification
    const txDetails = await connection.getTransaction(signature, { commitment: "confirmed" });
    if (!txDetails) {
      res.status(404).json({ error: 'Transaction details not found' });
      return;
    }

    // Verify transaction details
    const expectedAmount = transactionData.amountLamports;
    let transferFound = false;

    // Check for SOL transfer to merchant wallet
    if (txDetails.meta?.preBalances && txDetails.meta?.postBalances) {
      const accountKeys = txDetails.transaction.message.accountKeys;
      const merchantIndex = accountKeys.findIndex((key) => key.equals(MERCHANT_WALLET));

      if (merchantIndex >= 0) {
        const balanceChange = txDetails.meta.postBalances[merchantIndex] - txDetails.meta.preBalances[merchantIndex];
        if (balanceChange >= expectedAmount * 0.99) { // Allow 1% tolerance for fees
          transferFound = true;
        }
      }
    }

    if (!transferFound) {
      res.status(400).json({ error: 'Payment verification failed' });
      return;
    }

    // Update transaction and user plan in a transaction
    await db.runTransaction(async (transaction) => {
      // Update transaction status
      transaction.update(transactionRef, {
        status: "paid",
        providerRef: signature,
        confirmedAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Get plan details from configuration
      const planData = PlanUtils.getPlanById(transactionData.planId);
      if (!planData) {
        throw new Error(`Plan not found: ${transactionData.planId}`);
      }

      // Update user plan
      const userRef = db.collection("users").doc(uid);
      transaction.update(userRef, {
        "plan.id": transactionData.planId,
        "plan.maxDailyClaims": planData.maxDailyClaims,
        "plan.upgradedAt": admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });
    });

    res.status(200).json({
      success: true,
      message: "Payment confirmed and plan updated",
      planId: transactionData.planId,
    });
  } catch (error: any) {
    console.error("Confirm payment error:", error);
    res.status(500).json({ error: 'Payment confirmation failed' });
  }
};
