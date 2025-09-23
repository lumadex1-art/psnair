import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as cors from "cors";
import { PlanUtils } from "./config/plans";

const db = admin.firestore();
const auth = admin.auth();

// Initialize CORS middleware
const corsHandler = cors({ origin: true });

// --- TOKEN VERIFICATION (Called by the client-side) ---
export const verifyAuthToken = onRequest({ cors: true }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
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

        // Check if token is expired
        if (tokenData.expiresAt < now) {
            await tokenRef.delete(); // Clean up expired token
            res.status(404).json({ success: false, error: "Invalid or expired token" });
            return;
        }
        
        const { uid } = tokenData;

        // Delete the token so it can't be used again
        await tokenRef.delete();

        // Generate a custom Firebase Authentication token for the user
        const firebaseToken = await auth.createCustomToken(uid);

        res.status(200).json({ success: true, firebaseToken });

    } catch (error) {
        console.error("Error verifying auth token:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});


// --- LOGIN LINK CREATION (Callable function for internal/admin use) ---
export const createLoginLink = onRequest({ cors: true }, async (req, res) => {
    // NOTE: In a real app, this should be a protected onCall function.
    // For this example, it's an HTTP function for easy testing.
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
        const { nanoid } = await import('nanoid');
        const token = nanoid(32); // Generate a secure, random token

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Token valid for 10 minutes

        // Store the token in Firestore
        await db.collection('authTokens').doc(token).set({
            uid: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        });

        // Generate the magic link
        const link = `https://psnchainaidrop.digital/auth/action?mode=tokenLogin&token=${token}`;

        res.status(200).json({ success: true, link });

    } catch (error) {
        console.error("Error creating login link:", error);
        res.status(500).json({ error: "Could not create login link" });
    }
});

// --- PAYMENT LINK CREATION (Callable, requires auth) ---
export const createPaymentLink = onRequest({ cors: true }, async (req, res) => {
    corsHandler(req, res, async () => {
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

            const { nanoid } = await import('nanoid');
            const paymentToken = nanoid(24);

            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1); // Link valid for 1 hour

            const paymentIntentRef = db.collection('paymentIntents').doc(paymentToken);
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
});

// --- GET PAYMENT LINK DETAILS (Public, no auth needed) ---
export const getPaymentLinkDetails = onRequest({ cors: true }, async (req, res) => {
    corsHandler(req, res, async () => {
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

            // Get user and plan details to display
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
});
