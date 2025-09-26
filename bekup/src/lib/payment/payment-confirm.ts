// Payment Confirmation - Menggantikan corsConfirmSolanaPayment
import { auth } from '@/lib/firebase';
import { verifyTransaction, getTransaction } from './firebase-client';
import { verifyPaymentOnChain } from './solana-config';
import { PaymentConfirmResponse, PaymentError } from './payment-types';

export const confirmPayment = async (
  transactionId: string,
  signature: string
): Promise<PaymentConfirmResponse | PaymentError> => {
  try {
    // 1. Verifikasi user authentication
    const user = auth.currentUser;
    if (!user) {
      return { error: 'User not authenticated' };
    }

    // 2. Verifikasi signature on-chain menggunakan premium RPC
    const isValidSignature = await verifyPaymentOnChain(signature);
    if (!isValidSignature) {
      return { error: 'Invalid payment signature' };
    }

    // 3. Get transaction untuk mendapatkan planId
    const transaction = await getTransaction(transactionId);
    
    // 4. Update transaction status di Firestore
    await verifyTransaction(transactionId, signature, user.uid);

    // 5. Return response yang konsisten dengan Firebase Functions
    return {
      success: true,
      message: 'Payment verified on-chain, waiting for admin approval',
      planId: transaction.planId,
      status: 'pending_approval'
    };

  } catch (error) {
    console.error('Error confirming payment:', error);
    return {
      error: 'Failed to confirm payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};