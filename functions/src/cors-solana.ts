
import * as admin from "firebase-admin";
import {Connection, PublicKey} from "@solana/web3.js";
import { PlanUtils, VALID_PLAN_IDS } from "./config/plans";
import { Request, Response } from "firebase-functions";

const db = admin.firestore();
const connection = new Connection("https://rpc-mainnet.solanatracker.io/?api_key=bb9aeffe-6d8f-4df1-a357-d0dfde36ee28", "confirmed");

const MERCHANT_WALLET = new PublicKey("Fj86LrcDNkiDRs3rQs4dZEDaj769N8bTTvipANV8vBby");


// The withCors wrapper is now in index.ts, so we just export the raw handlers.
export const corsCreateSolanaIntent = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
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
      planUpgraded: false, 
    });

    res.status(200).json({
      success: true,
      transactionId: transactionRef.id,
      amountLamports,
      merchantWallet: MERCHANT_WALLET.toBase58(),
    });
  } catch (error: any) {
    console.error("Create payment intent error:", error);
    if (error.code === 'auth/id-token-expired') {
        res.status(401).json({ error: 'Token expired, please re-authenticate' });
    } else {
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
  }
};


export const corsConfirmSolanaPayment = async (req: Request, res: Response) => {
  try {
    const { transactionId, signature, paymentToken } = req.body;
    if (!signature) {
      res.status(400).json({ error: 'Signature is required' });
      return;
    }
    
    // --- VERIFY SIGNATURE ON-CHAIN ---
    const signatureStatus = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
    if (!signatureStatus.value || signatureStatus.value.err || !signatureStatus.value.confirmationStatus) {
      res.status(400).json({ error: 'Transaction verification failed on-chain' });
      return;
    }

    // --- HANDLE PAYMENT LOGIC (EITHER VIA PAYMENT LINK OR DIRECT PURCHASE) ---
    if (paymentToken) {
      // --- Logic for Payment Link ---
      const intentRef = db.collection('paymentIntents').doc(paymentToken);
      const intentDoc = await intentRef.get();
      if (!intentDoc.exists) throw new Error('Payment link not found or expired');
      
      const intentData = intentDoc.data()!;
      if (intentData.status !== 'pending') throw new Error('Payment link already used');
      
      // Update user's plan
      const userRef = db.collection('users').doc(intentData.uid);
      await userRef.update({ 'plan.id': intentData.planId, 'plan.upgradedAt': admin.firestore.Timestamp.now() });

      // Mark intent as complete
      await intentRef.update({ status: 'completed', signature, completedAt: admin.firestore.Timestamp.now() });
      
      res.status(200).json({ success: true, message: "Payment successful. User's plan has been upgraded." });

    } else if (transactionId) {
      // --- Logic for Direct Purchase (user is logged in) ---
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error('Missing or invalid authorization header for direct purchase');
      
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const uid = decodedToken.uid;
      
      const transactionRef = db.collection("transactions").doc(transactionId);
      const transactionDoc = await transactionRef.get();

      if (!transactionDoc.exists) throw new Error('Transaction not found');
      const transactionData = transactionDoc.data()!;
      if (transactionData.uid !== uid) throw new Error('Access denied to this transaction');
      if (transactionData.status === "paid") return res.status(200).json({ success: true, message: "Payment already confirmed" });

      // Update transaction to 'paid'. Admin will approve later.
      await transactionRef.update({
          status: "paid",
          providerRef: signature,
          confirmedAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
      });

      res.status(200).json({ success: true, message: "Payment confirmed. Pending admin approval.", planId: transactionData.planId });
      
    } else {
      res.status(400).json({ error: 'Either transactionId or paymentToken is required' });
      return;
    }

  } catch (error: any) {
    console.error("Confirm payment error:", error);
    if (error.code === 'auth/id-token-expired') {
        res.status(401).json({ error: 'Token expired, please re-authenticate' });
    } else {
        res.status(500).json({ error: error.message || 'Payment confirmation failed' });
    }
  }
};
