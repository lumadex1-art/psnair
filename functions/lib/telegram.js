"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTelegramLogin = void 0;
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const db = admin.firestore();
const auth = admin.auth();
// Verify Telegram login widget data
function verifyTelegramAuth(authData, botToken) {
    const { hash } = authData, data = __rest(authData, ["hash"]);
    // Create data check string
    const dataCheckString = Object.keys(data)
        .sort()
        .map((key) => `${key}=${data[key]}`)
        .join("\n");
    // Create secret key from bot token
    const secretKey = (0, crypto_1.createHash)("sha256").update(botToken).digest();
    // Create HMAC
    const hmac = (0, crypto_1.createHmac)("sha256", secretKey).update(dataCheckString).digest("hex");
    return hmac === hash;
}
const verifyTelegramLogin = async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const { authData, firebaseToken } = req.body;
        if (!authData || !authData.hash) {
            res.status(400).json({ error: "Invalid auth data" });
            return;
        }
        // Get bot token from environment
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            console.error("Telegram bot token not configured");
            res.status(500).json({ error: "Server configuration error" });
            return;
        }
        // Verify Telegram auth
        if (!verifyTelegramAuth(authData, botToken)) {
            res.status(400).json({ error: "Invalid Telegram authentication" });
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
                res.json({ success: true, linked: true, message: "Telegram account linked successfully" });
                return;
            }
            catch (error) {
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
            res.json({ success: true, customToken, message: "Login successful" });
        }
        catch (error) {
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
                    providers: { telegram: true },
                    telegram: {
                        id: authData.id,
                        username: authData.username || "",
                        firstName: authData.first_name || "",
                        lastName: authData.last_name || "",
                        linkedAt: admin.firestore.Timestamp.now(),
                    },
                    plan: { id: "Free", maxDailyClaims: 1 },
                    claimStats: { todayClaimCount: 0, lastClaimDayKey: "", lastClaimAt: null },
                    createdAt: admin.firestore.Timestamp.now(),
                    updatedAt: admin.firestore.Timestamp.now(),
                });
                // Create custom token
                const customToken = await auth.createCustomToken(customUid);
                res.json({ success: true, customToken, message: "Account created and login successful" });
            }
            else {
                throw error;
            }
        }
    }
    catch (error) {
        console.error("Telegram verification error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.verifyTelegramLogin = verifyTelegramLogin;
//# sourceMappingURL=telegram.js.map