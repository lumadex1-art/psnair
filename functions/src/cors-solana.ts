import { onRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

// A helper function to get plan details, assuming you have a config file or logic for it
// This is a placeholder. You'd need to implement this based on your plan structure.
const getPlanById = (planId: string) => {
    const plans: Record<string, any> = {
        'Silver': { name: 'Silver Plan', priceInLamports: 0.0367 * 1e9 },
        'Gold': { name: 'Gold Plan', priceInLamports: 0.0734 * 1e9 },
        // Add other plans...
    };
    return plans[planId];
}
const isValidPlan = (planId: string) => {
    const validPlans = ['Silver', 'Gold', 'Platinum', 'Diamond', 'Starter'];
    return validPlans.includes(planId);
}


// Standard CORS headers for all onRequest functions
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
  
  res.set('Vary', 'Origin, Access-Control-Request-Headers');
  if (origin && (allowedOrigins.includes(origin) || isFirebaseStudio)) {
    res.set('Access-Control-Allow-Origin', origin);
  } else {
    res.set('Access-Control-Allow-Origin', 'https://psnchainaidrop.digital');
  }
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  const requestedHeaders = (req.headers['access-control-request-headers'] as string | undefined) || 'Content-Type, Authorization';
  res.set('Access-Control-Allow-Headers', requestedHeaders);
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Max-Age', '86400');
};


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
        const planDetails = getPlanById(intentData.planId);

        if (!userDoc.exists || !planDetails) {
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
        logger.error("Error getting payment link details:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


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
        if (!planId || !isValidPlan(planId)) {
            res.status(400).json({ error: 'Invalid plan ID' });
            return;
        }

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
        logger.error("Error creating payment link:", error);
        res.status(500).json({ error: 'Could not create payment link' });
    }
});


export const corsCreateSolanaIntent = onRequest(async (req, res) => {
    setCorsHeaders(res, req);
     if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    // Logic for creating solana intent
    res.status(501).json({error: "Not implemented"});
});

export const corsConfirmSolanaPayment = onRequest(async (req, res) => {
    setCorsHeaders(res, req);
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    // Logic for confirming solana payment
    res.status(501).json({error: "Not implemented"});
});
