// Solana Configuration - Menggunakan RPC premium seperti di functions
import { Connection, PublicKey } from '@solana/web3.js';

// RPC premium dari environment variable
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://rpc-mainnet.solanatracker.io/?api_key=bb9aeffe-6d8f-4df1-a357-d0dfde36ee28";

export const MERCHANT_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_MERCHANT_WALLET || "Fj86LrcDNkiDRs3rQs4dZEDaj769N8bTTvipANV8vBby"
);

// Connection dengan konfigurasi yang sama seperti functions
export const connection = new Connection(SOLANA_RPC_URL, "confirmed");

export const verifyPaymentOnChain = async (signature: string): Promise<boolean> => {
  try {
    const signatureStatus = await connection.getSignatureStatus(
      signature, 
      { searchTransactionHistory: true }
    );

    return !!(
      signatureStatus.value && 
      !signatureStatus.value.err && 
      signatureStatus.value.confirmationStatus
    );
  } catch (error) {
    console.error('Error verifying payment on-chain:', error);
    return false;
  }
};