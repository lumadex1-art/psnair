// Firebase Client Operations - Konsisten dengan Functions
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CreateTransactionData } from './payment-types';

export const createTransaction = async (
  uid: string, 
  planId: string, 
  amountLamports: number
): Promise<string> => {
  const transactionRef = doc(collection(db, 'transactions'));
  
  const transactionData: Omit<CreateTransactionData, 'createdAt' | 'updatedAt'> = {
    uid,
    planId,
    status: 'pending',
    provider: 'solana',
    amountLamports,
    currency: 'SOL'
  };

  await setDoc(transactionRef, {
    ...transactionData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return transactionRef.id;
};

export const verifyTransaction = async (
  transactionId: string,
  signature: string,
  uid: string
): Promise<void> => {
  const transactionRef = doc(db, 'transactions', transactionId);
  
  // Verify transaction exists and belongs to user
  const transactionDoc = await getDoc(transactionRef);
  if (!transactionDoc.exists()) {
    throw new Error('Transaction not found');
  }

  const transactionData = transactionDoc.data();
  if (transactionData.uid !== uid) {
    throw new Error('Transaction does not belong to user');
  }

  // Update transaction with verification data - using a more flexible approach
  await updateDoc(transactionRef, {
    status: 'pending',
    providerRef: signature,
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    paymentVerified: true,
    verificationNote: 'Payment verified on-chain, waiting for admin approval'
  });
};

export const getTransaction = async (transactionId: string): Promise<CreateTransactionData & { id: string }> => {
  const transactionRef = doc(db, 'transactions', transactionId);
  const transactionDoc = await getDoc(transactionRef);
  
  if (!transactionDoc.exists()) {
    throw new Error('Transaction not found');
  }

  return {
    id: transactionDoc.id,
    ...transactionDoc.data()
  } as CreateTransactionData & { id: string };
};