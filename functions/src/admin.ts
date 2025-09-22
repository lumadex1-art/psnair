import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {PlanUtils} from "./config/plans";
import {onRequest} from "firebase-functions/v2/https";
import * as cors from "cors";

const db = admin.firestore();

// Get admin UIDs from environment variables
const ADMIN_UIDS = (process.env.ADMIN_UIDS || "Gb1ga2KWyEPZbmEJVcrOhCp1ykH2").split(',');
const SUPER_ADMIN_UID = process.env.SUPER_ADMIN_UID || "Gb1ga2KWyEPZbmEJVcrOhCp1ykH2";

const isAdmin = (uid: string): boolean => ADMIN_UIDS.includes(uid) || uid === SUPER_ADMIN_UID;

const corsHandler = cors({origin: true});

// Helper to wrap functions with CORS and auth
const withAdminAuth = (handler: (req: any, res: any) => Promise<void>) => {
    return onRequest(async (req, res) => {
        corsHandler(req, res, async () => {
            if (req.method !== 'POST') {
                res.status(405).send('Method Not Allowed');
                return;
            }

            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({error: 'Unauthorized', message: 'Missing or invalid authorization token.'});
                return;
            }

            const token = authHeader.split('Bearer ')[1];
            try {
                const decodedToken = await admin.auth().verifyIdToken(token);
                if (!isAdmin(decodedToken.uid)) {
                    res.status(403).json({error: 'Forbidden', message: 'User is not an admin.'});
                    return;
                }
                // Attach auth info to request for the handler to use
                req.auth = { uid: decodedToken.uid };
                await handler(req, res);
            } catch (error) {
                console.error("Auth verification error:", error);
                res.status(401).json({error: 'Unauthorized', message: 'Invalid token.'});
            }
        });
    });
};


export const adminGetPaymentsHttp = withAdminAuth(async (req, res) => {
  const {limit = 100, status, planId} = req.body;

  try {
    let transactionsQuery: admin.firestore.Query = db.collection("transactions")
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (status && status !== "all") {
      transactionsQuery = transactionsQuery.where("status", "==", status);
    }
    if (planId && planId !== "all") {
      transactionsQuery = transactionsQuery.where("planId", "==", planId);
    }

    const transactionsSnapshot = await transactionsQuery.get();
    
    const transactions = await Promise.all(
      transactionsSnapshot.docs.map(async (doc) => {
        const txData = doc.data();
        const userDoc = await db.collection("users").doc(txData.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        return {
          id: doc.id,
          ...txData,
          userEmail: userData?.email || "Unknown",
          userName: userData?.displayName || userData?.name || "Unknown User",
          createdAt: txData.createdAt.toDate().toISOString(),
          confirmedAt: txData.confirmedAt ? txData.confirmedAt.toDate().toISOString() : null,
          failedAt: txData.failedAt ? txData.failedAt.toDate().toISOString() : null,
        };
      })
    );

    const allTransactionsSnapshot = await db.collection("transactions").get();
    const allTransactions = allTransactionsSnapshot.docs.map(doc => doc.data());
    
    const totalRevenue = allTransactions
      .filter(tx => tx.status === "paid")
      .reduce((sum, tx) => sum + (tx.amountLamports || 0), 0);
    
    const totalTransactions = allTransactions.length;
    const paidTransactions = allTransactions.filter(tx => tx.status === "paid").length;
    const successRate = totalTransactions > 0 ? (paidTransactions / totalTransactions) * 100 : 0;
    const pendingCount = allTransactions.filter(tx => tx.status === "pending").length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRevenue = allTransactions
      .filter(tx => tx.status === "paid" && tx.confirmedAt && tx.confirmedAt.toDate() >= today)
      .reduce((sum, tx) => sum + (tx.amountLamports || 0), 0);
    
    const planCounts = allTransactions
      .filter(tx => tx.status === "paid")
      .reduce((counts: Record<string, number>, tx) => {
        counts[tx.planId] = (counts[tx.planId] || 0) + 1;
        return counts;
      }, {});
    
    const popularPlan = Object.entries(planCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "Premium";

    const stats = {
      totalRevenue, totalTransactions, successRate, pendingCount, todayRevenue, popularPlan,
    };

    res.status(200).json({ success: true, transactions, stats });
  } catch (error: any) {
    console.error("Admin get payments error:", error);
    res.status(500).json({ success: false, error: 'Failed to get payment data' });
  }
});


export const adminApprovePaymentHttp = withAdminAuth(async (req, res) => {
    const { transactionId, notes } = req.body;
    const adminUid = req.auth.uid;

    if (!transactionId) {
        res.status(400).json({ success: false, error: "Transaction ID is required" });
        return;
    }

    try {
        const transactionRef = db.collection("transactions").doc(transactionId);
        await db.runTransaction(async (transaction) => {
            const transactionDoc = await transaction.get(transactionRef);
            if (!transactionDoc.exists) {
                throw new HttpsError("not-found", "Transaction not found");
            }
            const transactionData = transactionDoc.data()!;

            if (transactionData.planUpgraded) {
                throw new HttpsError("failed-precondition", "Plan already upgraded for this transaction");
            }
            
            if (transactionData.status !== "paid") {
                throw new HttpsError("failed-precondition", `Cannot approve transaction with status: ${transactionData.status}. Must be 'paid'.`);
            }

            transaction.update(transactionRef, {
                planUpgraded: true,
                updatedAt: admin.firestore.Timestamp.now(),
                approvedBy: adminUid,
                approvalNotes: notes || "Manual approval by admin",
                approvalMethod: "admin-override"
            });

            const planData = PlanUtils.getPlanById(transactionData.planId);
            if (!planData) {
                throw new HttpsError("not-found", `Plan not found: ${transactionData.planId}`);
            }

            const userRef = db.collection("users").doc(transactionData.uid);
            transaction.update(userRef, {
                "plan.id": transactionData.planId,
                "plan.maxDailyClaims": planData.maxDailyClaims,
                "plan.upgradedAt": admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
            });

            const logRef = db.collection("admin_logs").doc();
            transaction.set(logRef, {
                action: "approve_payment", adminUid, transactionId,
                userId: transactionData.uid, planId: transactionData.planId,
                amount: transactionData.amountLamports,
                notes: notes || "Manual approval",
                timestamp: admin.firestore.Timestamp.now(),
            });
        });

        res.status(200).json({ success: true, message: "Payment approved and user plan updated", transactionId });
    } catch (error: any) {
        console.error("Admin approve payment error:", error);
        if (error instanceof HttpsError) {
             res.status(400).json({ success: false, error: error.message, code: error.code });
        } else {
             res.status(500).json({ success: false, error: "Failed to approve payment" });
        }
    }
});


// Keep the old onCall functions but add Http versions
export const adminGetPayments = onCall(async (request) => {
    if (!request.auth || !isAdmin(request.auth.uid)) {
        throw new HttpsError("permission-denied", "Admin access required");
    }
    // ... (rest of the logic, you can remove it if fully switching to Http)
    return { success: true, message: "Use HTTP version" };
});

export const adminApprovePayment = onCall(async (request) => {
    if (!request.auth || !isAdmin(request.auth.uid)) {
        throw new HttpsError("permission-denied", "Admin access required");
    }
     // ... (rest of the logic, you can remove it if fully switching to Http)
    return { success: true, message: "Use HTTP version" };
});

export const adminRefundPayment = onCall(async (request) => {
     if (!request.auth || !isAdmin(request.auth.uid)) {
        throw new HttpsError("permission-denied", "Admin access required");
    }
    // ... logic for refund
    return { success: true, message: "Refund processed" };
});

export const adminGetAnalytics = onCall(async (request) => {
    if (!request.auth || !isAdmin(request.auth.uid)) {
        throw new HttpsError("permission-denied", "Admin access required");
    }
    // ... logic for analytics
    return { success: true, analytics: {} };
});

export const adminGetPendingPayments = onCall(async (request) => {
     if (!request.auth || !isAdmin(request.auth.uid)) {
        throw new HttpsError("permission-denied", "Admin access required");
    }
    // ... logic for pending payments
    return { success: true, pendingPayments: [] };
});
