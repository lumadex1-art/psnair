
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { PlanUtils } from "./config/plans";
import { generateUniqueReferralCode } from "../../utils/referralCode";
import { Timestamp } from "firebase-admin/firestore";

// --- PAYMENT LINK CREATION (Callable, requires auth) ---
export const createPaymentLinkHttp = onRequest(async (req, res) => {
    // This is a simplified CORS setup. In a real app, you might use the `cors` package.
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
        
        const link = `https://psnaidrop.app/pay/${paymentToken}`; // Use your production domain
        res.status(200).json({ success: true, link, token: paymentToken });

    } catch (error) {
        console.error("Error creating payment link:", error);
        res.status(500).json({ error: 'Could not create payment link' });
    }
});

// --- GET PAYMENT LINK DETAILS (Public, no auth needed) ---
export const getPaymentLinkDetailsHttp = onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
     if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
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
            await intentRef.update({ status: 'expired' });
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
