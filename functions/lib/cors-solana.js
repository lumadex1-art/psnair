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
exports.corsConfirmSolanaPayment = exports.corsCreateSolanaIntent = void 0;
const admin = __importStar(require("firebase-admin"));
const web3_js_1 = require("@solana/web3.js");
const plans_1 = require("./config/plans");
const db = admin.firestore();
const connection = new web3_js_1.Connection("https://rpc-mainnet.solanatracker.io/?api_key=bb9aeffe-6d8f-4df1-a357-d0dfde36ee28", "confirmed");
const MERCHANT_WALLET = new web3_js_1.PublicKey("Fj86LrcDNkiDRs3rQs4dZEDaj769N8bTTvipANV8vBby");
// CORS headers with development support
const setCorsHeaders = (res, req) => {
    const origin = (req.headers.origin || req.get('Origin'));
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
    const isFirebaseStudio = !!origin && (origin.includes('firebase-studio') ||
        origin.includes('cloudworkstations.dev') ||
        origin.includes('web.app') ||
        origin.includes('firebaseapp.com'));
    // Ensure caches don't coalesce different origins
    res.set('Vary', 'Origin, Access-Control-Request-Headers');
    if (origin && (allowedOrigins.includes(origin) || isFirebaseStudio)) {
        res.set('Access-Control-Allow-Origin', origin);
    }
    else {
        // Fallback to production domain
        res.set('Access-Control-Allow-Origin', 'https://psnchainaidrop.digital');
    }
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    // Reflect requested headers if provided, otherwise use a safe default
    const requestedHeaders = req.headers['access-control-request-headers'] || 'Content-Type, Authorization';
    res.set('Access-Control-Allow-Headers', requestedHeaders);
    res.set('Access-Control-Allow-Credentials', 'true');
    // Cache preflight for a day to reduce OPTIONS traffic
    res.set('Access-Control-Max-Age', '86400');
};
// Simple CORS-enabled Solana Create Intent
const corsCreateSolanaIntent = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res, req);
        res.status(204).send('');
        return;
    }
    setCorsHeaders(res, req);
    try {
        // Verify authentication
        const authHeader = req.headers.authorization || req.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing authorization header' });
            return;
        }
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;
        const { planId } = req.body;
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
exports.corsCreateSolanaIntent = corsCreateSolanaIntent;
// Simple CORS-enabled Solana Confirm
const corsConfirmSolanaPayment = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res, req);
        res.status(204).send('');
        return;
    }
    setCorsHeaders(res, req);
    try {
        // Verify authentication
        const authHeader = req.headers.authorization || req.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing authorization header' });
            return;
        }
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;
        const { transactionId, signature } = req.body;
        if (!transactionId || !signature) {
            res.status(400).json({ error: 'transactionId and signature required' });
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
            res.status(403).json({ error: 'Access denied' });
            return;
        }
        // Check if already processed
        if (transactionData.status === "paid") {
            res.status(200).json({ success: true, message: "Already confirmed" });
            return;
        }
        // Verify signature on-chain
        const signatureStatus = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
        if (!signatureStatus.value || signatureStatus.value.err || !signatureStatus.value.confirmationStatus) {
            res.status(400).json({ error: 'Transaction verification failed' });
            return;
        }
        // Update transaction status
        await transactionRef.update({
            status: "paid",
            providerRef: signature,
            confirmedAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        });
        res.status(200).json({
            success: true,
            message: "Payment confirmed",
            planId: transactionData.planId,
        });
    }
    catch (error) {
        console.error("Confirm payment error:", error);
        res.status(500).json({ error: 'Payment confirmation failed' });
    }
};
exports.corsConfirmSolanaPayment = corsConfirmSolanaPayment;
//# sourceMappingURL=cors-solana.js.map