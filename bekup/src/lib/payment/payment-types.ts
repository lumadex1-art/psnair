// Payment Types - Konsisten dengan Firebase Functions & Admin Panel
import { Timestamp } from 'firebase/firestore';

export interface CreateTransactionData {
  uid: string;
  planId: string;
  status: 'pending';
  provider: 'solana';
  amountLamports: number;
  currency: 'SOL';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VerifyTransactionData {
  status: 'pending'; // Tetap pending untuk admin approval
  providerRef: string; // Solana signature
  confirmedAt: Timestamp;
  updatedAt: Timestamp;
  paymentVerified: true;
  verificationNote: 'Payment verified on-chain, waiting for admin approval';
}

export interface PaymentIntentResponse {
  success: boolean;
  transactionId: string;
  amountLamports: number;
  merchantWallet: string;
}

export interface PaymentConfirmResponse {
  success: boolean;
  message: string;
  planId: string;
  status: 'pending_approval';
}

export interface PaymentError {
  error: string;
  details?: string;
}