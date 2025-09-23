
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


// --- SEND LOGIN LINK (Called by the client-side) ---
export const sendLoginLink = onRequest(async (req, res) => {
    setCorsHeaders(res as any, req as any);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ success: false, error: "Email is required" });
            return;
        }
        
        const db = admin.firestore();
        const auth = admin.auth();
        let userRecord;
        let isNewUser = false;
        
        try {
            userRecord = await auth.getUserByEmail(email);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                isNewUser = true;
                userRecord = await auth.createUser({ email });
            } else {
                throw error;
            }
        }
        
        // If it's a new user, create their document in Firestore
        if (isNewUser) {
            const userDocRef = db.collection('users').doc(userRecord.uid);
            const referralCode = await generateUniqueReferralCode(userRecord.uid);
            await userDocRef.set({
                displayName: email.split('@')[0],
                email: email,
                providers: { email: true },
                balance: 0,
                plan: { id: 'Free', maxDailyClaims: 1, rewardPerClaim: 1 },
                claimStats: { todayClaimCount: 0, lastClaimDayKey: '', lastClaimAt: null },
                referralCode: referralCode,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        }
        
        // Create the magic link token
        const tokenRef = db.collection('authTokens').doc();
        const token = tokenRef.id;
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute expiry

        await tokenRef.set({
            uid: userRecord.uid,
            createdAt: Timestamp.now(),
            expiresAt: Timestamp.fromDate(expiresAt),
        });

        const link = `https://psnchainaidrop.digital/auth/action?mode=tokenLogin&token=${token}`;

        // Send the email (using a simple Firestore-based mail service like Trigger Email)
        await db.collection('mail').add({
            to: email,
            template: {
                name: 'magic-link', // Assumes a template named 'magic-link' is configured
                data: {
                    login_link: link,
                },
            },
        });

        res.status(200).json({ success: true, message: "Login link sent successfully." });

    } catch (error) {
        console.error("Error sending login link:", error);
        res.status(500).json({ success: false, error: "Internal server error while sending link." });
    }
});


// --- TOKEN VERIFICATION (Called by the client-side) ---
export const verifyAuthToken = onRequest(async (req, res) => {
    // Handle CORS preflight and set headers
    setCorsHeaders(res as any, req as any);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const db = admin.firestore();
        const { token } = req.body;
        if (!token) {
            res.status(400).json({ success: false, error: "Token is required" });
            return;
        }

        const tokenRef = db.collection('authTokens').doc(token);
        const tokenDoc = await tokenRef.get();

        if (!tokenDoc.exists) {
            res.status(404).json({ success: false, error: "Invalid or expired token" });
            return;
        }

        const tokenData = tokenDoc.data()!;
        const now = admin.firestore.Timestamp.now();

        if (tokenData.expiresAt < now) {
            await tokenRef.delete();
            res.status(404).json({ success: false, error: "Invalid or expired token" });
            return;
        }
        
        const { uid } = tokenData;
        await tokenRef.delete();
        const firebaseToken = await admin.auth().createCustomToken(uid);

        res.status(200).json({ success: true, firebaseToken });

    } catch (error) {
        console.error("Error verifying auth token:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});


// --- LOGIN LINK CREATION (Callable function for internal/admin use) ---
export const createLoginLink = onRequest(async (req, res) => {
    setCorsHeaders(res as any, req as any);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    
    const { uid } = req.body;
    if (!uid) {
        res.status(400).json({ error: "UID is required" });
        return;
    }

    try {
        const db = admin.firestore();
        // Use Firestore's auto-ID for a secure, unique token
        const tokenRef = db.collection('authTokens').doc();
        const token = tokenRef.id;

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await tokenRef.set({
            uid: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        });

        const link = `https://psnchainaidrop.digital/auth/action?mode=tokenLogin&token=${token}`;
        res.status(200).json({ success: true, link });

    } catch (error) {
        console.error("Error creating login link:", error);
        res.status(500).json({ error: "Could not create login link" });
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
