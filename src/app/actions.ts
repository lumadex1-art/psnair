'use server';

import {
  generateReferralRewardTool,
  GenerateReferralRewardToolInput,
  GenerateReferralRewardToolOutput,
} from '@/ai/flows/referral-reward-tool-generation';
import { PLAN_CONFIG } from '@/lib/config';

type ActionResult = {
  success: boolean;
  data?: GenerateReferralRewardToolOutput;
  error?: string;
};

export async function generateReward(
  input: GenerateReferralRewardToolInput
): Promise<ActionResult> {
  try {
    const result = await generateReferralRewardTool(input);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: 'Failed to generate reward. Please try again later.' };
  }
}

// NOTE: In a real production app, you would initialize the Firebase Admin SDK
// here to securely interact with Firestore from the server.
// For this prototype, we'll continue to simulate the backend logic.

type ClaimResult = {
    success: boolean;
    message: string;
    newBalance?: number;
    newTimestamp?: number;
}

export async function secureClaimTokens(
    lastClaimTimestamp: number | null,
    userTier: keyof typeof PLAN_CONFIG.PRICES
): Promise<ClaimResult> {
    // This function simulates a secure backend endpoint (e.g., a Firebase Function).
    
    const claimsPerDay = PLAN_CONFIG.FEATURES[userTier]?.maxDailyClaims || 1;

    const now = Date.now();
    const cooldownDuration = (24 * 60 * 60 * 1000) / claimsPerDay;
    
    if (lastClaimTimestamp && now - lastClaimTimestamp < cooldownDuration) {
        return { success: false, message: 'Claim not ready yet.' };
    }
    
    // In a real app, you would do the following with Firebase Admin SDK:
    // 1. Get the authenticated user's ID.
    // 2. Read the user's current balance from Firestore.
    // 3. Add 10 to the balance.
    // 4. Write the new balance and the current timestamp back to Firestore.
    // 5. Return the new balance to the client.

    // For now, we just return the new timestamp and let the client update the state.
    return { 
        success: true, 
        message: 'You have claimed 10 EPSN.',
        newTimestamp: now,
    };
}
