
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as cors from "cors";
import { PlanUtils } from "./config/plans";
import { Request, Response } from "firebase-functions";


const db = admin.firestore();
const auth = admin.auth();

// --- TOKEN VERIFICATION (Called by the client-side) ---
export const verifyAuthToken = async (req: Request, res: Response) => {
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

        if (tokenData.expiresAt < now) {
            await tokenRef.delete();
            res.status(404).json({ success: false, error: "Invalid or expired token" });
            return;
        }
        
        const { uid } = tokenData;
        await tokenRef.delete();
        const firebaseToken = await auth.createCustomToken(uid);

        res.status(200).json({ success: true, firebaseToken });

    } catch (error) {
        console.error("Error verifying auth token:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};


// --- LOGIN LINK CREATION ---
export const createLoginLink = async (req: Request, res: Response) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    
    // This is a sensitive function, so we should protect it.
    // For now, let's assume it's called by an admin or a trusted service.
    // A more robust solution would check for an admin auth token.
    const { uid } = req.body;
    if (!uid) {
        res.status(400).json({ error: "UID is required" });
        return;
    }

    try {
        // Use Firestore's auto-ID for a secure, unique token
        const tokenRef = db.collection('authTokens').doc();
        const token = tokenRef.id;

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute validity

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
};

// --- PAYMENT LINK CREATION ---
export const createPaymentLink = async (req: Request, res: Response) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
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

    } catch (error: any) {
        console.error("Error creating payment link:", error);
         if (error.code === 'auth/id-token-expired') {
            res.status(401).json({ error: 'Token expired, please re-authenticate' });
        } else {
            res.status(500).json({ error: 'Could not create payment link' });
        }
    }
};

// --- GET PAYMENT LINK DETAILS (Public, no auth needed) ---
export const getPaymentLinkDetails = async (req: Request, res: Response) => {
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
            await intentRef.delete(); // Clean up expired link
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
             res.status(404).json({ error: "Invalid user or plan details associated with this link" });
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
};
