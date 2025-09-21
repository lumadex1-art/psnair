'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Coins, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ClaimPage() {
  const { balance, claimTokens, lastClaimTimestamp, userTier } = useAppContext();
  const { toast } = useToast();
  const [cooldown, setCooldown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');

  const claimsPerDay = userTier === 'Premium' ? 5 : userTier === 'Ultra' ? 10 : 1;
  const cooldownDuration = (24 * 60 * 60 * 1000) / claimsPerDay;

  useEffect(() => {
    const interval = setInterval(() => {
      if (!lastClaimTimestamp) {
        setCooldown(0);
        setTimeRemaining('');
        return;
      }

      const now = Date.now();
      const timeSinceLastClaim = now - lastClaimTimestamp;
      const remaining = cooldownDuration - timeSinceLastClaim;

      if (remaining <= 0) {
        setCooldown(0);
        setTimeRemaining('');
      } else {
        const progress = (timeSinceLastClaim / cooldownDuration) * 100;
        setCooldown(100 - progress);

        const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((remaining / 1000 / 60) % 60);
        const seconds = Math.floor((remaining / 1000) % 60);
        setTimeRemaining(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastClaimTimestamp, cooldownDuration]);

  const handleClaim = () => {
    const success = claimTokens();
    if (success) {
      toast({
        title: 'Success!',
        description: 'You have claimed 10 EPSN.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Claim not ready',
        description: 'Please wait for the cooldown to finish.',
      });
    }
  };

  return (
    <div className="space-y-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Balance</span>
            <Coins className="h-5 w-5 text-primary" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-headline text-4xl font-bold">
            {balance.toLocaleString()} EPSN
          </p>
        </CardContent>
      </Card>

      <Card className="flex flex-col items-center justify-center p-6 text-center">
        <CardHeader className="p-0">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Daily Claim</CardTitle>
          <p className="text-sm text-muted-foreground">
            Claim 10 EPSN tokens. Your current plan allows {claimsPerDay} claim{claimsPerDay > 1 ? 's' : ''} per day.
          </p>
        </CardHeader>
        <CardContent className="mt-6 w-full p-0">
          {cooldown > 0 ? (
            <div className="space-y-4">
              <Button disabled className="w-full" size="lg">
                Claim
              </Button>
              <div className="space-y-2">
                <Progress value={100 - cooldown} className="h-2" />
                <p className="font-mono text-sm font-medium text-muted-foreground">
                  Next claim in: {timeRemaining}
                </p>
              </div>
            </div>
          ) : (
            <Button onClick={handleClaim} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
              Claim 10 EPSN
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
