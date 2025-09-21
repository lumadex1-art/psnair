'use client';

import { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { generateReward } from '@/app/actions';
import type { GenerateReferralRewardToolOutput } from '@/ai/flows/referral-reward-tool-generation';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Award, Sparkles, Loader2 } from 'lucide-react';

export function GenerateRewardTool() {
  const { referrals, userTier } = useAppContext();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [reward, setReward] = useState<GenerateReferralRewardToolOutput | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canGenerate = referrals.length >= 5;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsLoading(true);
    const input = {
      referralCount: referrals.length,
      userTier: userTier,
      averageClaimAmount: 150, // This could be dynamic in a real app
    };
    const result = await generateReward(input);
    setIsLoading(false);

    if (result.success && result.data) {
      setReward(result.data);
      setIsDialogOpen(true);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Something went wrong.',
      });
    }
  };

  if (!canGenerate) {
    return null;
  }
  
  return (
    <>
      <Card className="bg-primary/10 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Award className="h-6 w-6" />
            <span>Referral Milestone Reached!</span>
          </CardTitle>
          <CardDescription className="text-primary/80">
            Congratulations! You've invited 5 friends. Generate a special reward to boost your claims.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate My Reward Tool
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Reward Tool Generated!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Here is your new claim upgrade tool. It has been automatically applied to your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {reward && (
            <div className="my-4 space-y-4 rounded-lg border bg-secondary/50 p-4">
              <h3 className="font-bold text-lg text-primary">{reward.toolName}</h3>
              <p className="text-sm">{reward.toolDescription}</p>
              <div className="flex items-baseline justify-center rounded-md bg-background p-4 text-center">
                <span className="text-4xl font-bold text-primary">+{reward.claimIncreasePercentage}%</span>
                 <span className="ml-2 text-muted-foreground">Claim Increase</span>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsDialogOpen(false)}>
              Awesome!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
