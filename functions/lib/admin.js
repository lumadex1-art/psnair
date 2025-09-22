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
exports.adminGetPendingPayments = exports.adminApprovePayment = exports.adminGetAnalytics = exports.adminRefundPayment = exports.adminVerifyPayment = exports.adminGetPayments = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const plans_1 = require("./config/plans");
const db = admin.firestore();
// Get admin UIDs from environment variables
const ADMIN_UIDS = (process.env.ADMIN_UIDS || "").split(',');
const SUPER_ADMIN_UID = process.env.SUPER_ADMIN_UID || "";
const isAdmin = (uid) => ADMIN_UIDS.includes(uid) || uid === SUPER_ADMIN_UID;
// Helper function imported from secure config
/**
 * Get payment data for admin dashboard
 */
const adminGetPayments = async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    if (!isAdmin(request.auth.uid)) {
        throw new https_1.HttpsError("permission-denied", "Admin access required");
    }
    const { limit = 100, status, planId } = request.data;
    try {
        // Build query for transactions
        let transactionsQuery = db.collection("transactions")
            .orderBy("createdAt", "desc")
            .limit(limit);
        // Apply filters
        if (status && status !== "all") {
            transactionsQuery = transactionsQuery.where("status", "==", status);
        }
        if (planId && planId !== "all") {
            transactionsQuery = transactionsQuery.where("planId", "==", planId);
        }
        const transactionsSnapshot = await transactionsQuery.get();
        // Get user data for each transaction
        const transactions = await Promise.all(transactionsSnapshot.docs.map(async (doc) => {
            const txData = doc.data();
            // Get user info
            const userDoc = await db.collection("users").doc(txData.uid).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            return Object.assign(Object.assign({ id: doc.id }, txData), { userEmail: (userData === null || userData === void 0 ? void 0 : userData.email) || "Unknown", userName: (userData === null || userData === void 0 ? void 0 : userData.displayName) || (userData === null || userData === void 0 ? void 0 : userData.name) || "Unknown User", createdAt: txData.createdAt, confirmedAt: txData.confirmedAt, failedAt: txData.failedAt });
        }));
        // Calculate stats
        const allTransactionsSnapshot = await db.collection("transactions").get();
        const allTransactions = allTransactionsSnapshot.docs.map(doc => doc.data());
        const totalRevenue = allTransactions
            .filter(tx => tx.status === "paid")
            .reduce((sum, tx) => sum + (tx.amountLamports || 0), 0);
        const totalTransactions = allTransactions.length;
        const paidTransactions = allTransactions.filter(tx => tx.status === "paid").length;
        const successRate = totalTransactions > 0 ? (paidTransactions / totalTransactions) * 100 : 0;
        const pendingCount = allTransactions.filter(tx => tx.status === "pending").length;
        // Today's revenue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRevenue = allTransactions
            .filter(tx => tx.status === "paid" &&
            tx.confirmedAt &&
            tx.confirmedAt.toDate() >= today)
            .reduce((sum, tx) => sum + (tx.amountLamports || 0), 0);
        // Most popular plan
        const planCounts = allTransactions
            .filter(tx => tx.status === "paid")
            .reduce((counts, tx) => {
            counts[tx.planId] = (counts[tx.planId] || 0) + 1;
            return counts;
        }, {});
        const popularPlan = ((_a = Object.entries(planCounts)
            .sort(([, a], [, b]) => b - a)[0]) === null || _a === void 0 ? void 0 : _a[0]) || "Premium";
        const stats = {
            totalRevenue,
            totalTransactions,
            successRate,
            pendingCount,
            todayRevenue,
            popularPlan,
        };
        return {
            success: true,
            transactions,
            stats,
        };
    }
    catch (error) {
        console.error("Admin get payments error:", error);
        throw new https_1.HttpsError("internal", "Failed to get payment data");
    }
};
exports.adminGetPayments = adminGetPayments;
/**
 * Manually verify a payment (for stuck transactions)
 */
const adminVerifyPayment = async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    if (!isAdmin(request.auth.uid)) {
        throw new https_1.HttpsError("permission-denied", "Admin access required");
    }
    const { transactionId } = request.data;
    if (!transactionId) {
        throw new https_1.HttpsError("invalid-argument", "Transaction ID is required");
    }
    try {
        const transactionRef = db.collection("transactions").doc(transactionId);
        const transactionDoc = await transactionRef.get();
        if (!transactionDoc.exists) {
            throw new https_1.HttpsError("not-found", "Transaction not found");
        }
        const transactionData = transactionDoc.data();
        if (transactionData.status === "paid") {
            return { success: true, message: "Transaction already verified" };
        }
        // Update transaction and user plan in a transaction
        await db.runTransaction(async (transaction) => {
            // Update transaction status
            transaction.update(transactionRef, {
                status: "paid",
                confirmedAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
                verifiedBy: request.auth.uid,
                verificationNote: "Manually verified by admin",
            });
            // Get plan details from configuration
            const planData = plans_1.PlanUtils.getPlanById(transactionData.planId);
            if (planData) {
                // Update user plan
                const userRef = db.collection("users").doc(transactionData.uid);
                transaction.update(userRef, {
                    "plan.id": transactionData.planId,
                    "plan.maxDailyClaims": planData.maxDailyClaims,
                    "plan.upgradedAt": admin.firestore.Timestamp.now(),
                    "plan.verifiedBy": request.auth.uid,
                    updatedAt: admin.firestore.Timestamp.now(),
                });
            }
        });
        return {
            success: true,
            message: "Payment manually verified and plan updated",
        };
    }
    catch (error) {
        console.error("Admin verify payment error:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "Failed to verify payment");
    }
};
exports.adminVerifyPayment = adminVerifyPayment;
/**
 * Process refund for a payment
 */
const adminRefundPayment = async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    if (!isAdmin(request.auth.uid)) {
        throw new https_1.HttpsError("permission-denied", "Admin access required");
    }
    const { transactionId, reason = "Admin refund" } = request.data;
    if (!transactionId) {
        throw new https_1.HttpsError("invalid-argument", "Transaction ID is required");
    }
    try {
        const transactionRef = db.collection("transactions").doc(transactionId);
        const transactionDoc = await transactionRef.get();
        if (!transactionDoc.exists) {
            throw new https_1.HttpsError("not-found", "Transaction not found");
        }
        const transactionData = transactionDoc.data();
        if (transactionData.status === "refunded") {
            return { success: true, message: "Transaction already refunded" };
        }
        if (transactionData.status !== "paid") {
            throw new https_1.HttpsError("failed-precondition", "Can only refund paid transactions");
        }
        // Process refund in a transaction
        await db.runTransaction(async (transaction) => {
            // Update transaction status
            transaction.update(transactionRef, {
                status: "refunded",
                refundedAt: admin.firestore.Timestamp.now(),
                refundedBy: request.auth.uid,
                refundReason: reason,
                updatedAt: admin.firestore.Timestamp.now(),
            });
            // Downgrade user plan back to Free
            const userRef = db.collection("users").doc(transactionData.uid);
            transaction.update(userRef, {
                "plan.id": "Free",
                "plan.maxDailyClaims": 1,
                "plan.downgradedAt": admin.firestore.Timestamp.now(),
                "plan.downgradedBy": request.auth.uid,
                "plan.downgradeReason": reason,
                updatedAt: admin.firestore.Timestamp.now(),
            });
            // Create refund record
            const refundRef = db.collection("refunds").doc();
            transaction.set(refundRef, {
                transactionId,
                userId: transactionData.uid,
                planId: transactionData.planId,
                amountLamports: transactionData.amountLamports,
                reason,
                processedBy: request.auth.uid,
                createdAt: admin.firestore.Timestamp.now(),
                status: "processed",
            });
        });
        return {
            success: true,
            message: "Refund processed and user plan downgraded",
        };
    }
    catch (error) {
        console.error("Admin refund payment error:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "Failed to process refund");
    }
};
exports.adminRefundPayment = adminRefundPayment;
/**
 * Get admin dashboard analytics
 */
const adminGetAnalytics = async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    if (!isAdmin(request.auth.uid)) {
        throw new https_1.HttpsError("permission-denied", "Admin access required");
    }
    try {
        // Get all transactions
        const transactionsSnapshot = await db.collection("transactions").get();
        const transactions = transactionsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Get all users
        const usersSnapshot = await db.collection("users").get();
        const users = usersSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Calculate analytics
        const totalUsers = users.length;
        const paidUsers = users.filter(user => { var _a; return ((_a = user.plan) === null || _a === void 0 ? void 0 : _a.id) !== "Free"; }).length;
        const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;
        // Revenue by plan
        const revenueByPlan = transactions
            .filter(tx => tx.status === "paid")
            .reduce((acc, tx) => {
            acc[tx.planId] = (acc[tx.planId] || 0) + tx.amountLamports;
            return acc;
        }, {});
        // Daily revenue for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dailyRevenue = transactions
            .filter(tx => tx.status === "paid" &&
            tx.confirmedAt &&
            tx.confirmedAt.toDate() >= thirtyDaysAgo)
            .reduce((acc, tx) => {
            const date = tx.confirmedAt.toDate().toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + tx.amountLamports;
            return acc;
        }, {});
        return {
            success: true,
            analytics: {
                totalUsers,
                paidUsers,
                conversionRate,
                revenueByPlan,
                dailyRevenue,
                totalRevenue: Object.values(revenueByPlan).reduce((sum, amount) => sum + amount, 0),
            },
        };
    }
    catch (error) {
        console.error("Admin get analytics error:", error);
        throw new https_1.HttpsError("internal", "Failed to get analytics data");
    }
};
exports.adminGetAnalytics = adminGetAnalytics;
/**
 * Manual approve payment - untuk kasus pembayaran berhasil tapi belum terupdate
 */
const adminApprovePayment = async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    const uid = request.auth.uid;
    if (!isAdmin(uid)) {
        throw new https_1.HttpsError("permission-denied", "Admin access required");
    }
    const { transactionId, signature, notes } = request.data;
    if (!transactionId) {
        throw new https_1.HttpsError("invalid-argument", "Transaction ID is required");
    }
    try {
        // Get transaction record
        const transactionRef = db.collection("transactions").doc(transactionId);
        const transactionDoc = await transactionRef.get();
        if (!transactionDoc.exists) {
            throw new https_1.HttpsError("not-found", "Transaction not found");
        }
        const transactionData = transactionDoc.data();
        // Check if already processed
        if (transactionData.status === "paid") {
            return {
                success: true,
                message: "Payment already confirmed",
                alreadyProcessed: true,
            };
        }
        // Validate transaction is in pending status
        if (transactionData.status !== "pending") {
            throw new https_1.HttpsError("failed-precondition", `Cannot approve transaction with status: ${transactionData.status}`);
        }
        // Update transaction and user plan in atomic transaction
        await db.runTransaction(async (transaction) => {
            // Update transaction status
            transaction.update(transactionRef, {
                status: "paid",
                providerRef: signature || "manual-approval",
                confirmedAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
                approvedBy: uid,
                approvalNotes: notes || "Manual approval by admin",
                approvalMethod: "admin-override"
            });
            // Get plan details from configuration
            const planData = plans_1.PlanUtils.getPlanById(transactionData.planId);
            if (!planData) {
                throw new https_1.HttpsError("not-found", `Plan not found: ${transactionData.planId}`);
            }
            // Update user plan
            const userRef = db.collection("users").doc(transactionData.uid);
            transaction.update(userRef, {
                "plan.id": transactionData.planId,
                "plan.maxDailyClaims": planData.maxDailyClaims,
                "plan.upgradedAt": admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
            });
            // Log admin action
            const logRef = db.collection("admin_logs").doc();
            transaction.set(logRef, {
                action: "approve_payment",
                adminUid: uid,
                transactionId,
                userId: transactionData.uid,
                planId: transactionData.planId,
                amount: transactionData.amountLamports,
                notes: notes || "Manual approval",
                timestamp: admin.firestore.Timestamp.now(),
            });
        });
        return {
            success: true,
            message: "Payment approved and user plan updated",
            transactionId,
            planId: transactionData.planId,
            userId: transactionData.uid,
        };
    }
    catch (error) {
        console.error("Admin approve payment error:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "Failed to approve payment");
    }
};
exports.adminApprovePayment = adminApprovePayment;
/**
 * Get pending payments yang perlu manual approval
 */
const adminGetPendingPayments = async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    const uid = request.auth.uid;
    if (!isAdmin(uid)) {
        throw new https_1.HttpsError("permission-denied", "Admin access required");
    }
    try {
        // Get pending transactions older than 10 minutes (kemungkinan stuck)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const pendingQuery = await db
            .collection("transactions")
            .where("status", "==", "pending")
            .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(tenMinutesAgo))
            .orderBy("createdAt", "desc")
            .limit(50)
            .get();
        const pendingPayments = await Promise.all(pendingQuery.docs.map(async (doc) => {
            const data = doc.data();
            // Get user info
            const userDoc = await db.collection("users").doc(data.uid).get();
            const userData = userDoc.data();
            return {
                transactionId: doc.id,
                userId: data.uid,
                userEmail: (userData === null || userData === void 0 ? void 0 : userData.email) || "Unknown",
                planId: data.planId,
                amountLamports: data.amountLamports,
                amountSOL: (data.amountLamports / 1000000000).toFixed(3),
                createdAt: data.createdAt.toDate().toISOString(),
                timeSinceCreated: Math.floor((Date.now() - data.createdAt.toDate().getTime()) / (1000 * 60)), // minutes
            };
        }));
        return {
            success: true,
            pendingPayments,
            count: pendingPayments.length,
        };
    }
    catch (error) {
        console.error("Admin get pending payments error:", error);
        throw new https_1.HttpsError("internal", "Failed to get pending payments");
    }
};
exports.adminGetPendingPayments = adminGetPendingPayments;
//# sourceMappingURL=admin.js.map