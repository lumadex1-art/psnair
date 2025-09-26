// Payment Intent Creation - Menggantikan corsCreateSolanaIntent
import { auth } from '@/lib/firebase';
import { createTransaction } from './firebase-client';
import { MERCHANT_WALLET } from './solana-config';
import { getPlanPriceInLamports } from '@/lib/config';
import { PaymentIntentResponse, PaymentError } from './payment-types';

export const createPaymentIntent = async (
  planId: string
): Promise<PaymentIntentResponse | PaymentError> => {
  try {
    // 1. Verifikasi user authentication
    const user = auth.currentUser;
    if (!user) {
      return { error: 'User not authenticated' };
    }

    // 2. Validasi planId
    const amountLamports = getPlanPriceInLamports(planId as any);
    if (amountLamports === undefined) {
      return { error: 'Invalid plan ID' };
    }

    // 3. Buat transaction record di Firestore
    const transactionId = await createTransaction(
      user.uid,
      planId,
      amountLamports
    );

    // 4. Return response yang konsisten dengan Firebase Functions
    return {
      success: true,
      transactionId,
      amountLamports,
      merchantWallet: MERCHANT_WALLET.toString()
    };

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return {
      error: 'Failed to create payment intent',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};