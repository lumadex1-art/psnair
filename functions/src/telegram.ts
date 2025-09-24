import * as admin from "firebase-admin";
import {createHash, createHmac} from "crypto";

const db = admin.firestore();
const auth = admin.auth();

interface TelegramAuthData {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
}

// Verify Telegram login widget data
function verifyTelegramAuth(authData: TelegramAuthData, botToken: string): boolean {
  const {hash, ...data} = authData;

  // Create data check string
  const dataCheckString = Object.keys(data)
    .sort()
    .map((key) => `${key}=${(data as any)[key]}`)
    .join("\n");

  // Create secret key from bot token
  const secretKey = createHash("sha256").update(botToken).digest();

  // Create HMAC
  const hmac = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  return hmac === hash;
}

export const verifyTelegramLogin = async (req: any, res: any) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    const {authData, firebaseToken} = req.body;

    if (!authData || !authData.hash) {
      res.status(400).json({error: "Invalid auth data"});
      return;
    }

    // Get bot token from environment
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error("Telegram bot token not configured");
      res.status(500).json({error: "Server configuration error"});
      return;
    }

    // Verify Telegram auth
    if (!verifyTelegramAuth(authData, botToken)) {
      res.status(400).json({error: "Invalid Telegram authentication"});
      return;
    }

    // Check if user is already signed in with Firebase
    if (firebaseToken) {
      try {
        const decodedToken = await auth.verifyIdToken(firebaseToken);
        const uid = decodedToken.uid;

        // Link Telegram to existing user
        const userRef = db.collection("users").doc(uid);
        await userRef.update({
          "telegram.id": authData.id,
          "telegram.username": authData.username || "",
          "telegram.firstName": authData.first_name || "",
          "telegram.lastName": authData.last_name || "",
          "telegram.linkedAt": admin.firestore.Timestamp.now(),
          "providers.telegram": true,
          updatedAt: admin.firestore.Timestamp.now(),
        });

        res.json({success: true, linked: true, message: "Telegram account linked successfully"});
        return;
      } catch (error) {
        console.error("Firebase token verification failed:", error);
        // Continue to create new user
      }
    }

    // Create new Firebase user for Telegram login
    const customUid = `telegram_${authData.id}`;
    const displayName = [authData.first_name, authData.last_name].filter(Boolean).join(" ") || authData.username || "Telegram User";

    try {
      // Try to get existing user
      await auth.getUser(customUid);

      // User exists, create custom token
      const customToken = await auth.createCustomToken(customUid);
      res.json({success: true, customToken, message: "Login successful"});
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        // Create new user
        await auth.createUser({
          uid: customUid,
          displayName,
          photoURL: authData.photo_url,
        });

        // Create user document in Firestore
        const userRef = db.collection("users").doc(customUid);
        await userRef.set({
          displayName,
          email: "",
          providers: {telegram: true},
          telegram: {
            id: authData.id,
            username: authData.username || "",
            firstName: authData.first_name || "",
            lastName: authData.last_name || "",
            linkedAt: admin.firestore.Timestamp.now(),
          },
          plan: {id: "Free", maxDailyClaims: 1},
          claimStats: {todayClaimCount: 0, lastClaimDayKey: "", lastClaimAt: null},
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

        // Create custom token
        const customToken = await auth.createCustomToken(customUid);
        res.json({success: true, customToken, message: "Account created and login successful"});
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error("Telegram verification error:", error);
    res.status(500).json({error: "Internal server error"});
  }
};
