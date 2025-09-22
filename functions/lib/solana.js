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
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmSolanaPaymentHttp = exports.createSolanaIntentHttp = exports.confirmSolanaPayment = exports.createSolanaIntent = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const web3_js_1 = require("@solana/web3.js");
const plans_1 = require("./config/plans");
const db = admin.firestore();
const connection = new web3_js_1.Connection("https://rpc-mainnet.solanatracker.io/?api_key=bb9aeffe-6d8f-4df1-a357-d0dfde36ee28", "confirmed");
// CORS headers for manual handling with development support
const setCorsHeaders = (res, req) => {
    if (req) {
        const origin = req.headers.origin || req.get('Origin');
        // Allow production domain and development domains
        const allowedOrigins = [
            'https://psnchainaidrop.digital',
            'http://localhost:3000',
            'http://localhost:3001',
            'https://localhost:3000',
            'https://localhost:3001',
            'https://6000-firebase-studio-1758420129221.cluster-qxqlf3vb3nbf2r42l5qfoebdry.cloudworkstations.dev'
        ];
        // Allow Firebase Studio/Workstation domains (development)
        const isFirebaseStudio = origin && (origin.includes('firebase-studio') ||
            origin.includes('cloudworkstations.dev') ||
            origin.includes('web.app') ||
            origin.includes('firebaseapp.com'));
        if (allowedOrigins.includes(origin) || isFirebaseStudio) {
            res.set('Access-Control-Allow-Origin', origin);
        }
        else {
            res.set('Access-Control-Allow-Origin', 'https://psnchainaidrop.digital');
        }
    }
    else {
        res.set('Access-Control-Allow-Origin', 'https://psnchainaidrop.digital');
    }
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Credentials', 'true');
};
const MERCHANT_WALLET = new web3_js_1.PublicKey("Fj86LrcDNkiDRs3rQs4dZEDaj769N8bTTvipANV8vBby");
const createSolanaIntent = async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { planId } = request.data;
    // Validate plan using new configuration
    if (!planId || !plans_1.PlanUtils.isValidPlan(planId)) {
        throw new https_1.HttpsError("invalid-argument", `Invalid planId: ${planId}. Valid plans: ${plans_1.VALID_PLAN_IDS.join(', ')}`);
    }
    const uid = request.auth.uid;
    const amountLamports = plans_1.PlanUtils.getPlanPriceInLamports(planId);
    try {
        // Create transaction record
        const transactionRef = db.collection("transactions").doc();
        const now = admin.firestore.Timestamp.now();
        await transactionRef.set({
            uid,
            planId,
            status: "pending",
            provider: "solana",
            amountLamports,
            currency: "SOL",
            createdAt: now,
            updatedAt: now,
        });
        return {
            success: true,
            transactionId: transactionRef.id,
            amountLamports,
            merchantWallet: MERCHANT_WALLET.toBase58(),
        };
    }
    catch (error) {
        console.error("Create intent error:", error);
        throw new https_1.HttpsError("internal", "Failed to create payment intent");
    }
};
exports.createSolanaIntent = createSolanaIntent;
const confirmSolanaPayment = async (request) => {
    var _a, _b;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { transactionId, signature } = request.data;
    if (!transactionId || !signature) {
        throw new https_1.HttpsError("invalid-argument", "transactionId and signature are required");
    }
    const uid = request.auth.uid;
    try {
        // Get transaction record
        const transactionRef = db.collection("transactions").doc(transactionId);
        const transactionDoc = await transactionRef.get();
        if (!transactionDoc.exists) {
            throw new https_1.HttpsError("not-found", "Transaction not found");
        }
        const transactionData = transactionDoc.data();
        // Verify ownership
        if (transactionData.uid !== uid) {
            throw new https_1.HttpsError("permission-denied", "Transaction does not belong to user");
        }
        // Check if already processed
        if (transactionData.status === "paid") {
            return { success: true, message: "Payment already confirmed", alreadyProcessed: true };
        }
        // Verify signature on-chain
        const signatureStatus = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
        if (!signatureStatus.value) {
            throw new https_1.HttpsError("not-found", "Transaction signature not found");
        }
        if (signatureStatus.value.err) {
            throw new https_1.HttpsError("failed-precondition", "Transaction failed on-chain");
        }
        if (!signatureStatus.value.confirmationStatus) {
            throw new https_1.HttpsError("failed-precondition", "Transaction not confirmed");
        }
        // Get full transaction details for verification
        const txDetails = await connection.getTransaction(signature, { commitment: "confirmed" });
        if (!txDetails) {
            throw new https_1.HttpsError("not-found", "Transaction details not found");
        }
        // Verify transaction details
        const expectedAmount = transactionData.amountLamports;
        let transferFound = false;
        // Check for SOL transfer to merchant wallet
        if (((_a = txDetails.meta) === null || _a === void 0 ? void 0 : _a.preBalances) && ((_b = txDetails.meta) === null || _b === void 0 ? void 0 : _b.postBalances)) {
            const accountKeys = txDetails.transaction.message.accountKeys;
            const merchantIndex = accountKeys.findIndex((key) => key.equals(MERCHANT_WALLET));
            if (merchantIndex >= 0) {
                const balanceChange = txDetails.meta.postBalances[merchantIndex] - txDetails.meta.preBalances[merchantIndex];
                if (balanceChange >= expectedAmount * 0.99) { // Allow 1% tolerance for fees
                    transferFound = true;
                }
            }
        }
        if (!transferFound) {
            throw new https_1.HttpsError("failed-precondition", "Payment verification failed");
        }
        // Update transaction and user plan in a transaction
        await db.runTransaction(async (transaction) => {
            // Update transaction status
            transaction.update(transactionRef, {
                status: "paid",
                providerRef: signature,
                confirmedAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
            });
            // Get plan details from configuration
            const planData = plans_1.PlanUtils.getPlanById(transactionData.planId);
            if (!planData) {
                throw new https_1.HttpsError("not-found", `Plan not found: ${transactionData.planId}`);
            }
            // Update user plan
            const userRef = db.collection("users").doc(uid);
            transaction.update(userRef, {
                "plan.id": transactionData.planId,
                "plan.maxDailyClaims": planData.maxDailyClaims,
                "plan.upgradedAt": admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
            });
        });
        return {
            success: true,
            message: "Payment confirmed and plan updated",
            planId: transactionData.planId,
        };
    }
    catch (error) {
        console.error("Confirm payment error:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "Payment confirmation failed");
    }
};
exports.confirmSolanaPayment = confirmSolanaPayment;
// HTTP versions with CORS support
const createSolanaIntentHttp = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).send('');
        return;
    }
    setCorsHeaders(res);
    try {
        // Verify authentication
        const authHeader = req.headers.authorization || req.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing or invalid authorization header' });
            return;
        }
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;
        const { planId } = req.body;
        // Validate plan using new configuration
        if (!planId || !plans_1.PlanUtils.isValidPlan(planId)) {
            res.status(400).json({
                error: 'Invalid planId',
                validPlans: plans_1.VALID_PLAN_IDS
            });
            return;
        }
        const amountLamports = plans_1.PlanUtils.getPlanPriceInLamports(planId);
        // Create transaction record
        const transactionRef = db.collection("transactions").doc();
        const now = admin.firestore.Timestamp.now();
        await transactionRef.set({
            uid,
            planId,
            status: "pending",
            provider: "solana",
            amountLamports,
            currency: "SOL",
            createdAt: now,
            updatedAt: now,
        });
        res.status(200).json({
            success: true,
            transactionId: transactionRef.id,
            amountLamports,
            merchantWallet: MERCHANT_WALLET.toBase58(),
        });
    }
    catch (error) {
        console.error("Create intent error:", error);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
};
exports.createSolanaIntentHttp = createSolanaIntentHttp;
const confirmSolanaPaymentHttp = async (req, res) => {
    var _a, _b;
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).send('');
        return;
    }
    setCorsHeaders(res);
    try {
        // Verify authentication
        const authHeader = req.headers.authorization || req.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing or invalid authorization header' });
            return;
        }
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;
        const { transactionId, signature } = req.body;
        if (!transactionId || !signature) {
            res.status(400).json({ error: 'transactionId and signature are required' });
            return;
        }
        // Get transaction record
        const transactionRef = db.collection("transactions").doc(transactionId);
        const transactionDoc = await transactionRef.get();
        if (!transactionDoc.exists) {
            res.status(404).json({ error: 'Transaction not found' });
            return;
        }
        const transactionData = transactionDoc.data();
        // Verify ownership
        if (transactionData.uid !== uid) {
            res.status(403).json({ error: 'Transaction does not belong to user' });
            return;
        }
        // Check if already processed
        if (transactionData.status === "paid") {
            res.status(200).json({ success: true, message: "Payment already confirmed", alreadyProcessed: true });
            return;
        }
        // Verify signature on-chain
        const signatureStatus = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
        if (!signatureStatus.value) {
            res.status(404).json({ error: 'Transaction signature not found' });
            return;
        }
        if (signatureStatus.value.err) {
            res.status(400).json({ error: 'Transaction failed on-chain' });
            return;
        }
        if (!signatureStatus.value.confirmationStatus) {
            res.status(400).json({ error: 'Transaction not confirmed' });
            return;
        }
        // Get full transaction details for verification
        const txDetails = await connection.getTransaction(signature, { commitment: "confirmed" });
        if (!txDetails) {
            res.status(404).json({ error: 'Transaction details not found' });
            return;
        }
        // Verify transaction details
        const expectedAmount = transactionData.amountLamports;
        let transferFound = false;
        // Check for SOL transfer to merchant wallet
        if (((_a = txDetails.meta) === null || _a === void 0 ? void 0 : _a.preBalances) && ((_b = txDetails.meta) === null || _b === void 0 ? void 0 : _b.postBalances)) {
            const accountKeys = txDetails.transaction.message.accountKeys;
            const merchantIndex = accountKeys.findIndex((key) => key.equals(MERCHANT_WALLET));
            if (merchantIndex >= 0) {
                const balanceChange = txDetails.meta.postBalances[merchantIndex] - txDetails.meta.preBalances[merchantIndex];
                if (balanceChange >= expectedAmount * 0.99) { // Allow 1% tolerance for fees
                    transferFound = true;
                }
            }
        }
        if (!transferFound) {
            res.status(400).json({ error: 'Payment verification failed' });
            return;
        }
        // Update transaction and user plan in a transaction
        await db.runTransaction(async (transaction) => {
            // Update transaction status
            transaction.update(transactionRef, {
                status: "paid",
                providerRef: signature,
                confirmedAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
            });
            // Get plan details from configuration
            const planData = plans_1.PlanUtils.getPlanById(transactionData.planId);
            if (!planData) {
                throw new Error(`Plan not found: ${transactionData.planId}`);
            }
            // Update user plan
            const userRef = db.collection("users").doc(uid);
            transaction.update(userRef, {
                "plan.id": transactionData.planId,
                "plan.maxDailyClaims": planData.maxDailyClaims,
                "plan.upgradedAt": admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
            });
        });
        res.status(200).json({
            success: true,
            message: "Payment confirmed and plan updated",
            planId: transactionData.planId,
        });
    }
    catch (error) {
        console.error("Confirm payment error:", error);
        res.status(500).json({ error: 'Payment confirmation failed' });
    }
};
exports.confirmSolanaPaymentHttp = confirmSolanaPaymentHttp;
//# sourceMappingURL=solana.js.map