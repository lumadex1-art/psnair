'use server';

import {
  generateReferralRewardTool,
  GenerateReferralRewardToolInput,
  GenerateReferralRewardToolOutput,
} from '@/ai/flows/referral-reward-tool-generation';

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
    console.error('Error generating referral reward tool:', error);
    return { success: false, error: 'Failed to generate reward. Please try again later.' };
  }
}
