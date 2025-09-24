import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {generateUniqueReferralCode} from "./utils";
import * as nacl from "tweetnacl";
import * as bs58 from "bs58";


const db = admin.firestore();

/**
 * Triggered when a new Firebase user is created.
 * Creates a corresponding user document in Firestore.
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
      walletAddress: user.providerData.some((p) => p.providerId === "phone") ? null : user.uid,
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
  }
};


/**
 * Creates a challenge message for a user to sign with their Solana wallet.
 */
export const createAuthChallenge = onCall(async (request) => {
  const {address} = request.data;
  if (!address) {
    throw new HttpsError("invalid-argument", "Missing wallet address.");
  }

  // Generate a random nonce
  const nonce = Math.random().toString(36).substring(2, 12);
  const message = `Sign this message to log in to EpsilonDrop. Nonce: ${nonce}`;

  // Store the nonce with a timestamp (expires in 10 minutes)
  const challengeRef = db.collection("authChallenges").doc(address);
  await challengeRef.set({
    message,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {message};
});


/**
 * Verifies a signed message and returns a custom Firebase auth token.
 */
export const verifyAuthSignature = onCall(async (request) => {
  const {address, signature} = request.data;
  if (!address || !signature) {
    throw new HttpsError("invalid-argument", "Missing address or signature.");
  }

  const challengeRef = db.collection("authChallenges").doc(address);
  const challengeDoc = await challengeRef.get();

  if (!challengeDoc.exists) {
    throw new HttpsError("not-found", "Challenge not found or expired. Please try again.");
  }

  const {message, createdAt} = challengeDoc.data()!;

  // Check if challenge is expired (10 minutes)
  const challengeAge = (Date.now() - createdAt.toMillis()) / 1000;
  if (challengeAge > 600) {
    throw new HttpsError("deadline-exceeded", "Challenge expired. Please try again.");
  }

  // Verify the signature
  const messageBytes = new TextEncoder().encode(message);
  const publicKeyBytes = bs58.decode(address);
  const signatureBytes = new Uint8Array(signature);

  const isVerified = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

  // Delete the challenge so it can't be reused
  await challengeRef.delete();

  if (!isVerified) {
    throw new HttpsError("unauthenticated", "Signature verification failed.");
  }

  // Create a custom Firebase token for the user.
  // The UID will be the user's Solana wallet address.
  const customToken = await admin.auth().createCustomToken(address);

  return {token: customToken};
});
