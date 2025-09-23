
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { PlanUtils } from "./config/plans";
import { generateUniqueReferralCode } from "../../utils/referralCode";
import { Timestamp } from "firebase-admin/firestore";

// CORS headers with development support (manual, consistent with cors-solana.ts)
const setCorsHeaders = (res: any, req: any) => {
  const origin = (req.headers.origin || req.get?.('Origin')) as string | undefined;

  const allowedOrigins = [
    'https://psnchainaidrop.digital',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    'https://localhost:3001',
    'https://6000-firebase-studio-1758420129221.cluster-qxqlf3vb3nbf2r42l5qfoebdry.cloudworkstations.dev'
  ];

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

// --- PAYMENT LINK CREATION (Callable, requires auth) ---
export const createPaymentLink = onRequest(async (req, res) => {
    setCorsHeaders(res as any, req as any);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const { planId } = req.body;
        if (!planId || !PlanUtils.isValidPlan(planId)) {
            res.status(400).json({ error: 'Invalid plan ID' });
            return;
        }

        const db = admin.firestore();
        // Use Firestore's auto-ID for a secure, unique token
        const paymentIntentRef = db.collection('paymentIntents').doc();
        const paymentToken = paymentIntentRef.id;

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // Link valid for 1 hour

        await paymentIntentRef.set({
            uid,
            planId,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        });
        
        const link = `https://psnchainaidrop.digital/pay/${paymentToken}`;
        res.status(200).json({ success: true, link, token: paymentToken });

    } catch (error) {
        console.error("Error creating payment link:", error);
        res.status(500).json({ error: 'Could not create payment link' });
    }
});

// --- GET PAYMENT LINK DETAILS (Public, no auth needed) ---
export const getPaymentLinkDetails = onRequest(async (req, res) => {
    setCorsHeaders(res as any, req as any);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    
    const { token } = req.body;
    if (!token) {
        res.status(400).json({ error: "Payment token is required" });
        return;
    }
    
    try {
        const db = admin.firestore();
        const intentRef = db.collection('paymentIntents').doc(token);
        const intentDoc = await intentRef.get();

        if (!intentDoc.exists) {
            res.status(404).json({ error: "Payment link not found or expired" });
            return;
        }

        const intentData = intentDoc.data()!;
        const now = admin.firestore.Timestamp.now();
        if (intentData.expiresAt < now) {
            res.status(404).json({ error: "Payment link has expired" });
            return;
        }
        if (intentData.status !== 'pending') {
             res.status(400).json({ error: `Payment link already processed (status: ${intentData.status})` });
            return;
        }

        const userDoc = await db.collection('users').doc(intentData.uid).get();
        const planDetails = PlanUtils.getPlanById(intentData.planId);

        if (!userDoc.exists() || !planDetails) {
             res.status(404).json({ error: "Invalid user or plan details" });
            return;
        }
        
        res.status(200).json({
            success: true,
            uid: intentData.uid,
            userName: userDoc.data()?.displayName || 'A user',
            planId: intentData.planId,
            planName: planDetails.name,
            amountLamports: planDetails.priceInLamports,
        });

    } catch (error) {
        console.error("Error getting payment link details:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
