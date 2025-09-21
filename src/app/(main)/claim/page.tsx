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
    <div className="space-y-8 px-4">
      <Card className="text-center bg-secondary/30 border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-base font-normal text-muted-foreground">
            <Coins className="h-5 w-5" />
            <span>Your Balance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-headline text-5xl font-bold text-primary-foreground">
            {balance.toLocaleString()}
            <span className="ml-2 text-lg font-medium text-muted-foreground">EPSN</span>
          </p>
        </CardContent>
      </Card>

      <Card className="bg-secondary/30 border-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Daily Claim</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your plan allows {claimsPerDay} claim{claimsPerDay > 1 ? 's' : ''} per day.
          </p>
        </CardHeader>
        <CardContent className="mt-2 w-full">
          {cooldown > 0 ? (
            <div className="space-y-4">
               <div className="space-y-2 text-center">
                <p className="font-mono text-3xl font-bold text-foreground">
                  {timeRemaining}
                </p>
                 <p className="text-sm font-medium text-muted-foreground">
                  Next claim available in
                </p>
              </div>
              <Progress value={100 - cooldown} className="h-2" />
               <Button disabled className="w-full" size="lg">
                Claim
              </Button>
            </div>
          ) : (
            <Button onClick={handleClaim} className="w-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90" size="lg">
              Claim 10 EPSN
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
