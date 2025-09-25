'use server';
/**
 * @fileOverview A referral reward tool generation AI agent.
 *
 * - generateReferralRewardTool - A function that handles the referral reward tool generation process.
 * - GenerateReferralRewardToolInput - The input type for the generateReferralRewardTool function.
 * - GenerateReferralRewardToolOutput - The return type for the generateReferralRewardTool function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReferralRewardToolInputSchema = z.object({
  referralCount: z
    .number()
    .describe('The number of successful referrals the user has.'),
  userTier: z.string().describe('The user tier of the user.'),
  averageClaimAmount: z
    .number()
    .describe('The average claim amount of the user.'),
});
export type GenerateReferralRewardToolInput = z.infer<
  typeof GenerateReferralRewardToolInputSchema
>;

const GenerateReferralRewardToolOutputSchema = z.object({
  toolName: z.string().describe('The name of the claim upgrade tool.'),
  toolDescription: z
    .string()
    .describe('The description of the claim upgrade tool.'),
  claimIncreasePercentage: z
    .number()
    .describe(
      'The percentage by which the claim amount will increase with the tool.'
    ),
});
export type GenerateReferralRewardToolOutput = z.infer<
  typeof GenerateReferralRewardToolOutputSchema
>;

export async function generateReferralRewardTool(
  input: GenerateReferralRewardToolInput
): Promise<GenerateReferralRewardToolOutput> {
  return generateReferralRewardToolFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReferralRewardToolPrompt',
  input: {schema: GenerateReferralRewardToolInputSchema},
  output: {schema: GenerateReferralRewardToolOutputSchema},
  prompt: `You are an expert in designing referral reward programs.

You will analyze the referral data and suggest the most appropriate claim upgrade tool as a reward for users who successfully refer new users. The goal is to provide personalized and effective referral incentives.

Consider the following information about the user:

Referral Count: {{{referralCount}}}
User Tier: {{{userTier}}}
Average Claim Amount: {{{averageClaimAmount}}}

Based on this information, suggest a claim upgrade tool with the following attributes:

- Tool Name: A creative and descriptive name for the tool.
- Tool Description: A brief explanation of the tool's functionality.
- Claim Increase Percentage: The percentage by which the claim amount will increase when the tool is used.

Ensure that the suggested tool is appropriate for the user's referral count, user tier, and average claim amount. The higher the referral count and user tier, the more powerful the tool should be.

Here's an example of a suitable reward tool for a user with 5 referrals, a "Gold" tier, and an average claim amount of 100 EPSN:

Tool Name: "Referral Amplifier"
Tool Description: "This tool amplifies your claim amount by a percentage, rewarding you for your successful referrals."
Claim Increase Percentage: 15%

Now, based on the provided information about the user, suggest the most appropriate claim upgrade tool.
`, // Changed template string to be a single backtick
});

const generateReferralRewardToolFlow = ai.defineFlow(
  {
    name: 'generateReferralRewardToolFlow',
    inputSchema: GenerateReferralRewardToolInputSchema,
    outputSchema: GenerateReferralRewardToolOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
