
import * as admin from "firebase-admin";
import type { Request, Response } from "express";

// Simple CORS headers
const setCorsHeaders = (res: Response, req: Request) => {
  const origin = req.headers.origin || req.get('Origin');
  
  if (origin) {
    res.set('Access-Control-Allow-Origin', origin);
  } else {
    res.set('Access-Control-Allow-Origin', '*');
  }
  
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Credentials', 'true');
};

// Simple admin check using environment variable directly
const isAdmin = (uid: string): boolean => {
  const adminUids = process.env.ADMIN_UIDS || '';
  return adminUids.split(',').includes(uid);
};

// HTTP wrapper for adminGetPendingPayments
export const adminGetPendingPaymentsHttp = async (req: Request, res: Response) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, req);
    res.status(204).send('');
    return;
  }

  setCorsHeaders(res, req);

  try {
    const db = admin.firestore();
    
    // Verify authentication
    const authHeader = req.headers.authorization || req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization header' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    if (!isAdmin(uid)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    // Get pending transactions
    const pendingQuery = await db
      .collection("transactions")
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const pendingPayments = await Promise.all(
      pendingQuery.docs.map(async (doc) => {
        const data = doc.data();
        
        // Get user info
        const userDoc = await db.collection("users").doc(data.uid).get();
        const userData = userDoc.data();

        const createdAtTimestamp = data.createdAt;
        let createdAtIso: string | null = null;
        let timeSinceCreatedMinutes: number | null = null;

        if (createdAtTimestamp && typeof createdAtTimestamp.toDate === "function") {
          const createdDate = createdAtTimestamp.toDate();
          createdAtIso = createdDate.toISOString();
          timeSinceCreatedMinutes = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60));
        }

        return {
          transactionId: doc.id,
          userId: data.uid,
          userEmail: userData?.email || "Unknown",
          planId: data.planId,
          amountLamports: data.amountLamports,
          amountSOL: (data.amountLamports / 1000000000).toFixed(3),
          createdAt: createdAtIso,
          timeSinceCreated: timeSinceCreatedMinutes,
          providerRef: data.providerRef || null,
        };
      })
    );

    res.status(200).json({
      success: true,
      pendingPayments,
      count: pendingPayments.length,
    });
  } catch (error: any) {
    
    res.status(500).json({ error: 'Failed to get pending payments' });
  }
};

// HTTP wrapper for adminApprovePayment
export const adminApprovePaymentHttp = async (req: Request, res: Response) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, req);
    res.status(204).send('');
    return;
  }

  setCorsHeaders(res, req);

  try {
    const db = admin.firestore();
    
    // Verify authentication
    const authHeader = req.headers.authorization || req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization header' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    if (!isAdmin(uid)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { transactionId, signature, notes } = req.body;
    if (!transactionId) {
      res.status(400).json({ error: 'Transaction ID is required' });
      return;
    }

    // Get transaction record
    const transactionRef = db.collection("transactions").doc(transactionId);
    const transactionDoc = await transactionRef.get();

    if (!transactionDoc.exists) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const transactionData = transactionDoc.data()!;

    // Check if already processed
    if (transactionData.status === "paid") {
      res.status(200).json({
        success: true,
        message: "Payment already approved",
        alreadyProcessed: true,
      });
      return;
    }

    // Update transaction and user plan
    await db.runTransaction(async (transaction) => {
      // Update transaction status
      transaction.update(transactionRef, {
        status: "paid",
        providerRef: signature || "manual-approval",
        confirmedAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        approvedBy: uid,
        approvalNotes: notes || "Manual approval by admin",
      });

      // Update user plan (simple version)
      const userRef = db.collection("users").doc(transactionData.uid);
      transaction.update(userRef, {
        "plan.id": transactionData.planId,
        "plan.upgradedAt": admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });
    });

    res.status(200).json({
      success: true,
      message: "Payment approved successfully",
      transactionId,
    });
  } catch (error: any) {
    
    res.status(500).json({ error: 'Failed to approve payment' });
  }
};

// HTTP wrapper for adminGetPayments
export const adminGetPaymentsHttp = async (req: Request, res: Response) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, req);
    res.status(204).send('');
    return;
  }

  setCorsHeaders(res, req);

  try {
    const db = admin.firestore();
    
    // Verify authentication
    const authHeader = req.headers.authorization || req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization header' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    if (!isAdmin(uid)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    // Get all transactions
    const transactionsSnapshot = await db.collection("transactions")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const payments = await Promise.all(
      transactionsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Get user data
        let userData = null;
        try {
          const userDoc = await db.collection("users").doc(data.uid).get();
          userData = userDoc.exists ? userDoc.data() : null;
        } catch (error) {
          
        }

        return {
          id: doc.id,
          ...data,
          user: userData
        };
      })
    );

    res.status(200).json({ payments });
  } catch (error: any) {
    
    res.status(500).json({ error: 'Failed to get payments' });
  }
};
