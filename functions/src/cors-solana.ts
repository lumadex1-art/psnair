import * as admin from "firebase-admin";
import {Connection, PublicKey} from "@solana/web3.js";
import { PlanUtils, VALID_PLAN_IDS } from "./config/plans";
import * as cors from 'cors';
import { Request, Response } from "firebase-functions";

const db = admin.firestore();
const connection = new Connection("https://rpc-mainnet.solanatracker.io/?api_key=bb9aeffe-6d8f-4df1-a357-d0dfde36ee28", "confirmed");

const MERCHANT_WALLET = new PublicKey("Fj86LrcDNkiDRs3rQs4dZEDaj769N8bTTvipANV8vBby");

// Konfigurasi CORS terpusat
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Daftar domain yang diizinkan
    const allowedOrigins = [
      'https://psnchainaidrop.digital',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001',
      'https://6000-firebase-studio-1758420129221.cluster-qxqlf3vb3nbf2r42l5qfoebdry.cloudworkstations.dev'
    ];
    
    // Izinkan jika origin ada di daftar atau jika origin tidak ada (misalnya, dari Postman atau server-side)
    if (!origin || allowedOrigins.includes(origin) || origin.includes('firebase-studio') || origin.includes('cloudworkstations.dev')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET, POST, OPTIONS',
  allowedHeaders: 'Content-Type, Authorization',
  credentials: true,
};

// Buat middleware CORS
const corsMiddleware = cors(corsOptions);

// Wrapper untuk menerapkan middleware ke handler fungsi
const withCors = (handler: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response) => {
    corsMiddleware(req, res, async () => {
      // Jika method adalah OPTIONS (preflight), CORS middleware sudah menangani, cukup kirim 204
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }
      await handler(req, res);
    });
  };
};

// Handler asli untuk membuat intent
const createSolanaIntentHandler = async (req: Request, res: Response) => {
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
      planUpgraded: false, // NEW: Field to track fulfillment
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

// Handler asli untuk konfirmasi pembayaran
const confirmSolanaPaymentHandler = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
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

    const transactionRef = db.collection("transactions").doc(transactionId);
    const transactionDoc = await transactionRef.get();

    if (!transactionDoc.exists) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const transactionData = transactionDoc.data()!;
    if (transactionData.uid !== uid) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (transactionData.status === "paid") {
      res.status(200).json({ success: true, message: "Already confirmed" });
      return;
    }

    const signatureStatus = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
    if (!signatureStatus.value || signatureStatus.value.err || !signatureStatus.value.confirmationStatus) {
      res.status(400).json({ error: 'Transaction verification failed on-chain' });
      return;
    }

    // --- MODIFICATION: Just update transaction status to 'paid'. Do NOT upgrade plan. ---
    await transactionRef.update({
        status: "paid",
        providerRef: signature,
        confirmedAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
    });


    res.status(200).json({
      success: true,
      message: "Payment confirmed. Pending admin approval.",
      planId: transactionData.planId,
    });
  } catch (error: any) {
    console.error("Confirm payment error:", error);
    if (error.code === 'auth/id-token-expired') {
        res.status(401).json({ error: 'Token expired, please re-authenticate' });
    } else {
        res.status(500).json({ error: 'Payment confirmation failed' });
    }
  }
};

// Ekspor fungsi yang sudah dibungkus dengan middleware CORS
export const corsCreateSolanaIntent = withCors(createSolanaIntentHandler);
export const corsConfirmSolanaPayment = withCors(confirmSolanaPaymentHandler);
