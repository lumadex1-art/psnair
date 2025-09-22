
'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Coins, Zap, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';
import Image from 'next/image';
import { PLAN_CONFIG } from '@/lib/config';

export default function ClaimPage() {
  const { user, balance, claimTokens, lastClaimTimestamp, userTier } = useAppContext();
  const { toast } = useToast();
  const [cooldown, setCooldown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  const claimsPerDay = PLAN_CONFIG.FEATURES[userTier]?.maxDailyClaims || 1;
  const cooldownDuration = (24 * 60 * 60 * 1000) / claimsPerDay;

  // Conversion rates
  const EPSN_TO_IDR = 500; // 1 EPSN = 500 IDR
  const EPSN_TO_PSN = 1000; // 1000 EPSN = 1 PSN
  const PSN_TO_IDR = 250000; // 1 PSN = 250,000 IDR

  // Calculate conversions
  const balanceInIDR = balance * EPSN_TO_IDR;
  const balanceInPSN = balance / EPSN_TO_PSN;

  // Format currency
  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

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

  const handleClaim = async () => {
    setIsClaiming(true);
    const result = await claimTokens();
    if (result.success) {
      toast({
        title: 'Success!',
        description: result.message,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Claim not ready',
        description: result.message,
      });
    }
    setIsClaiming(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent)] pointer-events-none" />
      
      <div className="relative z-10 space-y-6 px-4 pb-6">
        {/* Header Section */}
        {user && (
          <div className="flex items-center justify-between pt-4 pb-2">
            <div className="flex items-center gap-4">
              <div className="relative">
                <UserAvatar 
                  src={user.avatar} 
                  name={user.name}
                  className="h-16 w-16 border-3 border-primary/30 shadow-lg shadow-primary/20"
                  fallbackClassName="text-xl"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h2 className="font-bold text-xl text-foreground">
                  {user.name.includes('@') ? user.name.split('@')[0] : user.name}
                </h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <span>Welcome back!</span>
                  <span className="text-primary">✨</span>
                </p>
              </div>
            </div>
            
            {/* Tier Badge */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 px-3 py-1.5 rounded-full border border-primary/30">
              <span className="text-xs font-semibold text-primary">{userTier}</span>
            </div>
          </div>
        )}

        {/* Page Title */}
        <div className="text-center space-y-3 py-4">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
            <Coins className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Daily Rewards</span>
          </div>
          <h1 className="font-headline text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            Claim Your Tokens
          </h1>
          <p className="text-muted-foreground text-lg">
            Collect your daily EPSN rewards and grow your balance
          </p>
        </div>

        {/* Balance Card */}
        <Card className="border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl shadow-2xl shadow-primary/10 overflow-hidden">
          <CardHeader className="text-center p-8 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="relative mx-auto mb-4">
              <Image src="/le.png" alt="EPSN Token" width={80} height={80} className="animate-pulse" />
            </div>
            
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Your Balance</p>
              <CardTitle className="font-headline text-6xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {balance.toLocaleString()}
              </CardTitle>
              <p className="text-lg font-semibold text-muted-foreground">EPSN Tokens</p>
              
              {/* Conversion Display */}
              <div className="space-y-3 pt-4 border-t border-border/30">
                <div className="grid grid-cols-1 gap-4">
                  {/* IDR Conversion */}
                  <div className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200/50 dark:border-green-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">IDR Value</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatIDR(balanceInIDR)}
                    </p>
                    <p className="text-xs text-green-600/70 dark:text-green-400/70">
                      @ {EPSN_TO_IDR.toLocaleString()} IDR per EPSN
                    </p>
                  </div>
                </div>
                
                {/* Exchange Rate Info */}
                <div className="bg-gradient-to-r from-muted/30 to-muted/20 p-3 rounded-lg">
                  <p className="text-xs text-center text-muted-foreground">
                    💱 Exchange Rates: 1 EPSN = {EPSN_TO_IDR.toLocaleString()} IDR • 1 PSN = {formatIDR(PSN_TO_IDR)}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          
          {/* Claim Section */}
          <div className="p-6 space-y-6 bg-gradient-to-b from-background/60 to-background/80 backdrop-blur-sm">
            <div className='text-center space-y-3'>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/50 rounded-full">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Daily Claim System</span>
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Your <span className="font-semibold text-primary">{userTier}</span> plan allows <span className="font-bold text-foreground">{claimsPerDay}</span> claim{claimsPerDay > 1 ? 's' : ''} per day
                </p>
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-3 rounded-lg">
                  <p className="text-sm font-medium text-primary">
                    💎 Daily Earning Potential: {formatIDR(claimsPerDay * 10 * EPSN_TO_IDR)} IDR
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {claimsPerDay} × 10 EPSN × {EPSN_TO_IDR.toLocaleString()} IDR
                  </p>
                </div>
              </div>
            </div>
            
            {cooldown > 0 ? (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-xl" />
                    <div className="relative bg-gradient-to-br from-background/80 to-background/60 p-6 rounded-2xl border border-border/50">
                      <p className="font-mono text-5xl font-bold tracking-tight text-foreground mb-2">
                        {timeRemaining}
                      </p>
                      <div className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                        <span>Next claim available</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-primary">{Math.round(100 - cooldown)}%</span>
                  </div>
                  <Progress value={100 - cooldown} className="h-4 bg-secondary/50" />
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-primary/20 to-green-500/20 rounded-2xl blur-xl animate-pulse" />
                  <div className="relative bg-gradient-to-br from-green-50/80 to-primary/10 dark:from-green-900/20 dark:to-primary/10 p-6 rounded-2xl border border-green-200/50 dark:border-green-800/50">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" />
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">Ready to Claim!</p>
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-green-600/80 dark:text-green-400/80">
                        Press the button below to collect your 10 EPSN tokens
                      </p>
                      <div className="bg-green-100/50 dark:bg-green-900/30 p-2 rounded-lg">
                        <p className="text-xs font-medium text-green-700 dark:text-green-300">
                          💰 Reward Value: {formatIDR(10 * EPSN_TO_IDR)} IDR
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Claim Button */}
          <CardFooter className="p-6 bg-gradient-to-t from-background/80 to-transparent">
            <Button 
              onClick={handleClaim} 
              disabled={cooldown > 0 || isClaiming} 
              className={cn(
                "w-full text-lg font-bold h-16 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]",
                cooldown > 0 
                  ? "bg-gradient-to-r from-secondary to-secondary/80 text-muted-foreground cursor-not-allowed" 
                  : "bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-2xl shadow-primary/30 hover:shadow-primary/40"
              )} 
              size="lg"
            >
              <div className="flex items-center justify-center gap-3">
                {isClaiming ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin"/>
                    <span>Processing Claim...</span>
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin"/>
                    <span>On Cooldown</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-6 w-6 animate-pulse"/>
                    <div className="text-center">
                      <span>Claim 10 EPSN Now</span>
                      <div className="text-xs opacity-80">
                        ({formatIDR(10 * EPSN_TO_IDR)} IDR)
                      </div>
                    </div>
                    <div className="ml-2 px-2 py-1 bg-primary-foreground/20 rounded-full">
                      <span className="text-xs font-bold">FREE</span>
                    </div>
                  </>
                )}
              </div>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
    
