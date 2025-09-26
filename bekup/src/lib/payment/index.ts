// Main Payment API - Entry point untuk semua payment operations
// Payment System Exports
export { createPaymentIntent } from './payment-intent';
export { confirmPayment } from './payment-confirm';
export { createTransaction, verifyTransaction, getTransaction } from './firebase-client';
export { verifyPaymentOnChain, connection, MERCHANT_WALLET } from './solana-config';
export * from './payment-types';

// Utility functions
export const formatSolAmount = (lamports: number): string => {
  const sol = lamports / 1_000_000_000;
  return sol.toFixed(4);
};

export const formatLamports = (sol: number): number => {
  return Math.ceil(sol * 1_000_000_000);
};