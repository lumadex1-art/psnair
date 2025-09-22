import {HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { PlanUtils } from "./config/plans";

const db = admin.firestore();

// Get admin UIDs from environment variables
const ADMIN_UIDS = (process.env.ADMIN_UIDS || "Gb1ga2KWyEPZbmEJVcrOhCp1ykH2").split(',');
const SUPER_ADMIN_UID = process.env.SUPER_ADMIN_UID || "Gb1ga2KWyEPZbmEJVcrOhCp1ykH2";

const isAdmin = (uid: string): boolean => ADMIN_UIDS.includes(uid) || uid === SUPER_ADMIN_UID;

interface GetPaymentsData {
  limit?: number;
  status?: string;
  planId?: string;
}

interface ApprovePaymentData {
  transactionId: string;
  signature?: string;
  notes?: string;
}

interface RefundPaymentData {
  transactionId: string;
  reason?: string;
}

/**
 * Get payment data for admin dashboard
 */
export const adminGetPayments = async (request: CallableRequest<GetPaymentsData>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!isAdmin(request.auth.uid)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  const {limit = 100, status, planId} = request.data;

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
    const transactions = await Promise.all(
      transactionsSnapshot.docs.map(async (doc) => {
        const txData = doc.data();
        
        // Get user info
        const userDoc = await db.collection("users").doc(txData.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        return {
          id: doc.id,
          ...txData,
          userEmail: userData?.email || "Unknown",
          userName: userData?.displayName || userData?.name || "Unknown User",
          createdAt: txData.createdAt,
          confirmedAt: txData.confirmedAt,
          failedAt: txData.failedAt,
        };
      })
    );

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
      .filter(tx => 
        tx.status === "paid" && 
        tx.confirmedAt && 
        tx.confirmedAt.toDate() >= today
      )
      .reduce((sum, tx) => sum + (tx.amountLamports || 0), 0);
    
    // Most popular plan
    const planCounts = allTransactions
      .filter(tx => tx.status === "paid")
      .reduce((counts: Record<string, number>, tx) => {
        counts[tx.planId] = (counts[tx.planId] || 0) + 1;
        return counts;
      }, {});
    
    const popularPlan = Object.entries(planCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "Premium";

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
  } catch (error: any) {
    console.error("Admin get payments error:", error);
    throw new HttpsError("internal", "Failed to get payment data");
  }
};


/**
 * Process refund for a payment
 */
export const adminRefundPayment = async (request: CallableRequest<RefundPaymentData>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!isAdmin(request.auth.uid)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  const {transactionId, reason = "Admin refund"} = request.data;

  if (!transactionId) {
    throw new HttpsError("invalid-argument", "Transaction ID is required");
  }

  try {
    const transactionRef = db.collection("transactions").doc(transactionId);
    const transactionDoc = await transactionRef.get();

    if (!transactionDoc.exists) {
      throw new HttpsError("not-found", "Transaction not found");
    }

    const transactionData = transactionDoc.data()!;

    if (transactionData.status === "refunded") {
      return {success: true, message: "Transaction already refunded"};
    }

    if (transactionData.status !== "paid") {
      throw new HttpsError("failed-precondition", "Can only refund paid transactions");
    }

    // Process refund in a transaction
    await db.runTransaction(async (transaction) => {
      // Update transaction status
      transaction.update(transactionRef, {
        status: "refunded",
        refundedAt: admin.firestore.Timestamp.now(),
        refundedBy: request.auth!.uid,
        refundReason: reason,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Downgrade user plan back to Free
      const userRef = db.collection("users").doc(transactionData.uid);
      transaction.update(userRef, {
        "plan.id": "Free",
        "plan.maxDailyClaims": 1,
        "plan.downgradedAt": admin.firestore.Timestamp.now(),
        "plan.downgradedBy": request.auth!.uid,
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
        processedBy: request.auth!.uid,
        createdAt: admin.firestore.Timestamp.now(),
        status: "processed",
      });
    });

    return {
      success: true,
      message: "Refund processed and user plan downgraded",
    };
  } catch (error: any) {
    console.error("Admin refund payment error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to process refund");
  }
};

/**
 * Get admin dashboard analytics
 */
export const adminGetAnalytics = async (request: CallableRequest<{}>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!isAdmin(request.auth.uid)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  try {
    // Get all transactions
    const transactionsSnapshot = await db.collection("transactions").get();
    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get all users
    const usersSnapshot = await db.collection("users").get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate analytics
    const totalUsers = users.length;
    const paidUsers = users.filter(user => (user as any).plan?.id !== "Free").length;
    const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;

    // Revenue by plan
    const revenueByPlan = transactions
      .filter(tx => (tx as any).status === "paid")
      .reduce((acc: Record<string, number>, tx: any) => {
        acc[tx.planId] = (acc[tx.planId] || 0) + tx.amountLamports;
        return acc;
      }, {});

    // Daily revenue for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyRevenue = transactions
      .filter(tx => 
        (tx as any).status === "paid" && 
        (tx as any).confirmedAt && 
        (tx as any).confirmedAt.toDate() >= thirtyDaysAgo
      )
      .reduce((acc: Record<string, number>, tx: any) => {
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
        totalRevenue: Object.values(revenueByPlan).reduce((sum: number, amount: number) => sum + amount, 0),
      },
    };
  } catch (error: any) {
    console.error("Admin get analytics error:", error);
    throw new HttpsError("internal", "Failed to get analytics data");
  }
};

/**
 * Manual approve payment - untuk kasus pembayaran berhasil tapi belum terupdate
 */
export const adminApprovePayment = async (request: CallableRequest<ApprovePaymentData>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const uid = request.auth.uid;
  if (!isAdmin(uid)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  const { transactionId, signature, notes } = request.data;
  if (!transactionId) {
    throw new HttpsError("invalid-argument", "Transaction ID is required");
  }

  try {
    // Get transaction record
    const transactionRef = db.collection("transactions").doc(transactionId);
    const transactionDoc = await transactionRef.get();

    if (!transactionDoc.exists) {
      throw new HttpsError("not-found", "Transaction not found");
    }

    const transactionData = transactionDoc.data()!;

    // Check if already processed
    if (transactionData.planUpgraded) {
      return {
        success: false,
        message: "Plan already upgraded for this transaction",
        alreadyProcessed: true,
      };
    }
    
    // We can approve 'pending' or 'paid' transactions
    if (transactionData.status !== "pending" && transactionData.status !== "paid") {
      throw new HttpsError("failed-precondition", 
        `Cannot approve transaction with status: ${transactionData.status}`);
    }

    // Update transaction and user plan in atomic transaction
    await db.runTransaction(async (transaction) => {
      // Update transaction status
      transaction.update(transactionRef, {
        status: "paid", // Ensure status is 'paid'
        planUpgraded: true, // Mark that the plan has been granted
        providerRef: signature || transactionData.providerRef || "manual-approval",
        confirmedAt: transactionData.confirmedAt || admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        approvedBy: uid,
        approvalNotes: notes || "Manual approval by admin",
        approvalMethod: "admin-override"
      });

      // Get plan details from configuration
      const planData = PlanUtils.getPlanById(transactionData.planId);
      if (!planData) {
        throw new HttpsError("not-found", `Plan not found: ${transactionData.planId}`);
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
  } catch (error: any) {
    console.error("Admin approve payment error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to approve payment");
  }
};

/**
 * Get pending payments yang perlu manual approval
 */
export const adminGetPendingPayments = async (request: CallableRequest<{}>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const uid = request.auth.uid;
  if (!isAdmin(uid)) {
    throw new HttpsError("permission-denied", "Admin access required");
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

    const pendingPayments = await Promise.all(
      pendingQuery.docs.map(async (doc) => {
        const data = doc.data();
        
        // Get user info
        const userDoc = await db.collection("users").doc(data.uid).get();
        const userData = userDoc.data();

        return {
          transactionId: doc.id,
          userId: data.uid,
          userEmail: userData?.email || "Unknown",
          planId: data.planId,
          amountLamports: data.amountLamports,
          amountSOL: (data.amountLamports / 1000000000).toFixed(3),
          createdAt: data.createdAt.toDate().toISOString(),
          timeSinceCreated: Math.floor((Date.now() - data.createdAt.toDate().getTime()) / (1000 * 60)), // minutes
        };
      })
    );

    return {
      success: true,
      pendingPayments,
      count: pendingPayments.length,
    };
  } catch (error: any) {
    console.error("Admin get pending payments error:", error);
    throw new HttpsError("internal", "Failed to get pending payments");
  }
};
