'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Coins, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function ClaimPage() {
  const { balance, claimTokens, lastClaimTimestamp, userTier } = useAppContext();
  const { toast } = useToast();
  const [cooldown, setCooldown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');

  const claimsPerDay = userTier === 'Premium' ? 5 : userTier === 'Pro' ? 7 : userTier === 'Master' ? 15 : userTier === 'Ultra' ? 25 : 1;
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
      <div className="text-center pt-2">
        <h1 className="font-headline text-3xl font-bold">Claim Rewards</h1>
        <p className="text-muted-foreground">Collect your daily EPSN tokens.</p>
      </div>

      <Card className="bg-secondary/30 border-primary/10 overflow-hidden">
        <CardHeader className="text-center p-6">
           <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Coins className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Your Balance</p>
          <CardTitle className="font-headline text-5xl font-bold text-primary-foreground">
            {balance.toLocaleString()}
            <span className="ml-2 text-lg font-medium text-muted-foreground">EPSN</span>
          </CardTitle>
        </CardHeader>
        
        <div className="bg-background/40 p-6 space-y-6">
            <div className='text-center'>
                <p className="text-lg font-semibold">Daily Claim</p>
                <p className="text-sm text-muted-foreground">
                    Your plan allows {claimsPerDay} claim{claimsPerDay > 1 ? 's' : ''} per day.
                </p>
            </div>
            
            {cooldown > 0 ? (
                <div className="space-y-4">
                    <div className="space-y-2 text-center">
                        <p className="font-mono text-4xl font-bold tracking-tight text-foreground">
                        {timeRemaining}
                        </p>
                        <p className="text-sm font-medium text-muted-foreground">
                        Next claim available
                        </p>
                    </div>
                    <Progress value={100 - cooldown} className="h-3" />
                </div>
            ) : (
                 <div className="text-center space-y-2">
                    <p className="text-2xl font-bold text-primary">Ready to Claim!</p>
                    <p className="text-sm text-muted-foreground">Press the button below to get your tokens.</p>
                </div>
            )}
        </div>
        
        <CardFooter className="p-4 bg-secondary/30">
          <Button 
            onClick={handleClaim} 
            disabled={cooldown > 0} 
            className={cn(
              "w-full text-lg font-bold h-14",
              cooldown > 0 
                ? "bg-secondary text-muted-foreground" 
                : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
            )} 
            size="lg"
          >
            <Zap className="mr-2 h-5 w-5"/>
            {cooldown > 0 ? 'Claiming...' : 'Claim 10 EPSN Now'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
