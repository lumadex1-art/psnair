import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as cors from "cors";

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
