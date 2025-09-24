
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {generateUniqueReferralCode} from "./utils";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

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

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  /**
   * Stores the OTP in Firestore with an expiration time.
   */
  async function storeOtp(uid: string, otp: string): Promise<void> {
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + 10 * 60 * 1000); // 10 minutes expiry
  
    await db.collection("emailOtps").doc(uid).set({
      uid,
      otp,
      createdAt: now,
      expiresAt,
    });
  }
  
  /**
   * Triggered when a new Firebase user is created.
   * Creates a corresponding user document in Firestore and generates an OTP.
   */
  export const onUserCreate = async (user: admin.auth.UserRecord) => {
    const userRef = db.collection("users").doc(user.uid);
    const userDoc = await userRef.get();
  
    if (!userDoc.exists) {
      const referralCode = await generateUniqueReferralCode(user.uid);
      const newUser = {
        displayName: user.displayName || user.email || `User ${user.uid.slice(0, 5)}`,
        name: user.displayName || user.email || `User ${user.uid.slice(0, 5)}`,
        email: user.email || null,
        photoURL: user.photoURL || null,
        phoneNumber: user.phoneNumber || null,
        walletAddress: null, // Wallet address is not available on email signup
        balance: 0,
        plan: {
          id: "Free",
          maxDailyClaims: 1,
          rewardPerClaim: 10,
        },
        claimStats: {
          todayClaimCount: 0,
          lastClaimDayKey: "",
          lastClaimAt: null,
        },
        referralCode: referralCode,
        referralStats: {
          totalReferred: 0,
          totalEarned: 0,
          lastReferralAt: null,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await userRef.set(newUser, {merge: true});
  
      // Generate and store OTP for email verification
      if (user.email) {
        const otp = generateOtp();
        await storeOtp(user.uid, otp);
        // Log for development/testing purposes as we can't send emails
        logger.log(`Generated OTP for ${user.email} (UID: ${user.uid}): ${otp}`);
      }
    }
  };
  
  
  /**
   * Verifies the email OTP provided by the user (Callable function).
   */
  export const verifyUserEmailOtp = onCall(async (request: any) => {
    try {
      const { otp } = request.data;
      const uid = request.auth?.uid;
  
      if (!uid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }
  
      if (!otp || typeof otp !== "string" || otp.length !== 6) {
        throw new HttpsError('invalid-argument', 'Please provide a valid 6-digit OTP.');
      }
  
      const otpDocRef = db.collection("emailOtps").doc(uid);
      const otpDoc = await otpDocRef.get();
  
      if (!otpDoc.exists) {
        throw new HttpsError('not-found', 'No OTP found for this user. Please request a new one.');
      }
  
      const otpData = otpDoc.data()!;
      const now = admin.firestore.Timestamp.now();
  
      if (now > otpData.expiresAt) {
        await otpDocRef.delete();
        throw new HttpsError('deadline-exceeded', 'The OTP has expired. Please request a new one.');
      }
  
      if (otpData.otp !== otp) {
        throw new HttpsError('invalid-argument', 'The OTP is incorrect.');
      }
  
      // If OTP is correct, mark user's email as verified
      await admin.auth().updateUser(uid, {emailVerified: true});
  
      // Clean up the used OTP
      await otpDocRef.delete();
  
      return {success: true, message: "Email successfully verified!"};
    } catch (error) {
      logger.error('Error verifying OTP:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Internal server error');
    }
  });
  
  /**
   * Resends a new email OTP to the user (Callable function).
   */
  export const resendUserEmailOtp = onCall(async (request: any) => {
    try {
      const uid = request.auth?.uid;
  
      if (!uid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }
  
      const user = await admin.auth().getUser(uid);
  
      if (!user.email) {
        throw new HttpsError('failed-precondition', 'User does not have an email address.');
      }
  
      const otp = generateOtp();
      await storeOtp(uid, otp);
      logger.log(`Resent OTP for ${user.email} (UID: ${uid}): ${otp}`);
  
      return {success: true, message: "A new OTP has been generated."};
    } catch (error) {
      logger.error('Error resending OTP:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Internal server error');
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
        logger.error("Error verifying auth token:", error);
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
        logger.error("Error creating login link:", error);
        res.status(500).json({ error: "Could not create login link" });
    }
});
