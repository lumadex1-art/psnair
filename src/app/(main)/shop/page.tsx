
'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Wallet, RefreshCw, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { getSolanaPrice, getPlanPricing, formatSolAmount, formatUsdAmount } from '@/lib/pricing';
import Image from 'next/image';
import { PLAN_CONFIG } from '@/lib/config';

type Tier = keyof typeof PLAN_CONFIG.PRICES;

// Merchant (treasury) wallet on Solana mainnet
const MERCHANT_WALLET = new PublicKey('Fj86LrcDNkiDRs3rQs4dZEDaj769N8bTTvipANV8vBby');

// Plan configurations with USD base prices (one-time payment)
const plans = [
  {
    name: 'Starter' as Tier,
    usdPrice: 4.99,
    description: 'For active claimers who want more.',
    features: PLAN_CONFIG.FEATURES.Starter.features,
    isPopular: false,
  },
  {
    name: 'Silver' as Tier,
    usdPrice: 7.99,
    description: 'For dedicated users who want to step up.',
    features: PLAN_CONFIG.FEATURES.Silver.features,
    isPopular: true,
  },
  {
    name: 'Gold' as Tier,
    usdPrice: 14.99,
    description: 'For serious enthusiasts aiming for the top.',
    features: PLAN_CONFIG.FEATURES.Gold.features,
    isPopular: false,
  },
  {
    name: 'Platinum' as Tier,
    usdPrice: 24.99,
    description: 'For power users aiming to maximize their earnings.',
    features: PLAN_CONFIG.FEATURES.Platinum.features,
    isPopular: false,
  },
  {
    name: 'Diamond' as Tier,
    usdPrice: 37.5,
    description: 'The ultimate plan for the top-tier investors.',
    features: PLAN_CONFIG.FEATURES.Diamond.features,
    isPopular: false,
  },
];

interface PlanPricing {
  usd: number;
  sol: number;
  solPrice: number;
  isStale: boolean;
}

export default function ShopPage() {
  const { userTier, purchasePlan } = useAppContext();
  const { toast } = useToast();
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [planPricing, setPlanPricing] = useState<Record<Tier, PlanPricing>>({} as Record<Tier, PlanPricing>);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadPricing = async () => {
    try {
      setIsLoadingPrices(true);
      
      const currentSolPrice = await getSolanaPrice();
      setSolPrice(currentSolPrice);
      
      const pricing: Record<Tier, PlanPricing> = {} as Record<Tier, PlanPricing>;
      
      for (const plan of plans) {
        const planPrice = await getPlanPricing(plan.usdPrice);
        pricing[plan.name] = planPrice;
      }
      
      setPlanPricing(pricing);
      setLastUpdated(new Date());
    } catch (error) {
      toast({
        title: 'Pricing Error',
        description: 'Failed to load current prices. Using fallback values.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // Load pricing on mount and set up refresh interval
  useEffect(() => {
    loadPricing();
    
    // Refresh pricing every 5 minutes
    const interval = setInterval(loadPricing, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handlePurchase = async (plan: Tier) => {
    try {
      if (!connected || !publicKey) {
        toast({ variant: 'destructive', title: 'Wallet not connected', description: 'Please connect your wallet first.' });
        return;
      }

      const pricing = planPricing[plan];
      if (!pricing || pricing.sol <= 0) {
        toast({ variant: 'destructive', title: 'Invalid plan price', description: 'This plan cannot be purchased.' });
        return;
      }

      // Create server intent via Firebase Function
      const { httpsCallable } = await import('firebase/functions');
      const { getFunctions } = await import('firebase/functions');
      const functions = getFunctions();
      const createIntentFunction = httpsCallable(functions, 'solanaCreateIntent');
      
      const intentResult = await createIntentFunction({ planId: plan });
      const intent = intentResult.data as any;
      
      if (!intent?.success) {
        toast({ variant: 'destructive', title: 'Intent failed', description: intent?.message || 'Unable to create intent' });
        return;
      }
      
      const lamports: number = intent.amountLamports;
      const transactionId: string = intent.transactionId;

      // Build transfer transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: publicKey });
      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: MERCHANT_WALLET,
          lamports,
        })
      );

      // Send and confirm on-chain
      const signature = await sendTransaction(tx, connection, { skipPreflight: false });
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

      // Confirm payment via Firebase Function
      const confirmFunction = httpsCallable(functions, 'solanaConfirm');
      const confirmResult = await confirmFunction({ transactionId, signature });
      const confirmData = confirmResult.data as any;
      
      if (!confirmData?.success) {
        toast({ variant: 'destructive', title: 'Verification failed', description: confirmData?.message || 'Server could not verify payment' });
        return;
      }

      // Apply plan locally after successful payment
      purchasePlan(plan);
      toast({ title: 'Purchase Successful!', description: `You are now on the ${plan} plan.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Payment failed', description: err?.message || 'Please try again.' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(120,119,198,0.1),transparent)] pointer-events-none" />
      
      <div className="relative z-10 space-y-8 px-4 pb-6">
        {/* Header Section */}
        <div className="text-center space-y-6 pt-6">
          {/* Token Logos Section */}
          <div className="flex items-center justify-center gap-8 mb-8">
            {/* LOBSTER Token */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-16 h-16">
                <Image
                  src="/lobster.png"
                  alt="LOBSTER Token"
                  width={60}
                  height={60}
                  className="rounded-full object-cover"
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">LOBSTER</span>
            </div>

            {/* PSN Token */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-16 h-16">
                <Image
                  src="/pp.svg"
                  alt="PSN Token"
                  width={60}
                  height={60}
                  className="rounded-full object-cover"
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">PSN</span>
            </div>

            {/* EPSN Token */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-16 h-16">
                <Image
                  src="/le.png"
                  alt="EPSN Token"
                  width={60}
                  height={60}
                  className="rounded-full object-cover"
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">EPSN</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full border border-primary/30">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold text-primary">Token Presale</span>
          </div>
          
          <div className="space-y-3">
            <h1 className="font-headline text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Upgrade Your Plan
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Unlock more daily claims with one-time Solana payments at live market rates
            </p>
          </div>
          
          {/* Current Tier Display */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/50 rounded-full border border-border/50">
            <span className="text-sm text-muted-foreground">Current Plan:</span>
            <Badge className={cn(
              'font-semibold',
              userTier !== 'Free' 
                ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground' 
                : 'bg-secondary text-secondary-foreground'
            )}>
              {userTier}
            </Badge>
          </div>

          {/* SOL Price Display */}
          <div className="flex items-center justify-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">SOL Price:</span>
              <span className="font-mono text-lg font-bold text-primary">
                {isLoadingPrices ? '...' : formatUsdAmount(solPrice)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadPricing}
              disabled={isLoadingPrices}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-4 w-4", isLoadingPrices && "animate-spin")} />
            </Button>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="flex justify-center">
          <div className="p-1 bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl">
            <WalletMultiButton className="!bg-background !text-foreground hover:!bg-accent !border-border/50 !rounded-lg !font-medium !px-6 !py-3" />
          </div>
        </div>

        {/* Plans Grid */}
        <div className="space-y-6">
          {plans.map((plan) => {
            const pricing = planPricing[plan.name];
            const isCurrentPlan = userTier === plan.name;
            const claimsPerDay = PLAN_CONFIG.FEATURES[plan.name]?.maxDailyClaims || 1;

            return (
              <Card 
                key={plan.name} 
                className={cn(
                  'relative border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl shadow-xl transition-all duration-300 hover:shadow-2xl',
                  plan.isPopular && 'border-2 border-primary shadow-2xl shadow-primary/20 pt-4',
                  isCurrentPlan && 'bg-gradient-to-br from-green-50/80 to-green-100/60 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800'
                )}
              > 
                {/* Popular Badge */}
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold px-4 py-1 shadow-lg animate-pulse">
                      ⭐ MOST POPULAR
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-2xl font-bold flex items-center gap-3">
                        {plan.name}
                        {isCurrentPlan && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-base text-muted-foreground">
                        {plan.description}
                      </CardDescription>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur-sm" />
                        <div className="relative bg-gradient-to-br from-background/80 to-background/60 p-3 rounded-lg border border-border/50">
                          {isLoadingPrices ? (
                            <div className="animate-pulse">
                              <div className="h-6 bg-muted rounded w-20 mb-1"></div>
                              <div className="h-4 bg-muted rounded w-16"></div>
                            </div>
                          ) : pricing ? (
                            <>
                              <p className="font-headline text-xl font-bold text-primary">
                                {formatSolAmount(pricing.sol)} SOL
                              </p>
                              <p className="text-xs text-muted-foreground">one-time</p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">Loading...</p>
                          )}
                        </div>
                      </div>
                      {pricing && (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-xs text-muted-foreground">
                            ≈ {formatUsdAmount(pricing.usd)}
                          </span>
                          {pricing.isStale && (
                            <span className="text-xs text-orange-500">
                              (Cached)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6 p-6">
                  {/* Features List */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      What's Included
                    </h4>
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-3 group">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
                            <CheckCircle className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Token Rewards Section */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Token Rewards
                    </h4>
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200/50 dark:border-green-800/50">
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 p-0.5 shadow-sm">
                          <Image
                            src="/le.png"
                            alt="EPSN Token"
                            width={28}
                            height={28}
                            className="rounded-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Daily EPSN Claims</p>
                          <p className="text-xs text-muted-foreground">Earn tokens daily</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {claimsPerDay}x
                        </p>
                        <p className="text-xs text-muted-foreground">per day</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Purchase Button */}
                  <Button 
                    onClick={() => handlePurchase(plan.name)} 
                    disabled={isCurrentPlan || !connected || isLoadingPrices}
                    className={cn(
                      'w-full h-12 font-semibold text-base transition-all duration-300',
                      plan.isPopular 
                        ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl' 
                        : 'bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 text-secondary-foreground',
                      isCurrentPlan && 'bg-green-600 hover:bg-green-700 text-white',
                      (!connected || isLoadingPrices) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {isCurrentPlan 
                      ? 'Current Plan' 
                      : !connected 
                        ? 'Connect Wallet' 
                        : isLoadingPrices
                          ? 'Loading Prices...'
                          : `Upgrade to ${plan.name}`
                    }
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Token Ecosystem Info */}
        <div className="bg-gradient-to-r from-muted/30 to-muted/20 rounded-2xl p-6 mx-4">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-foreground">Token Ecosystem</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* LOBSTER Token */}
              <div className="flex flex-col items-center space-y-3 p-4 bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border border-orange-200/50 dark:border-orange-800/50">
                <div className="relative w-12 h-12">
                  <Image
                    src="/lobster.png"
                    alt="LOBSTER Token"
                    width={44}
                    height={44}
                    className="rounded-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <h4 className="font-semibold text-foreground">LOBSTER</h4>
                  <p className="text-xs text-muted-foreground">Governance Token</p>
                  <p className="text-xs text-muted-foreground mt-1">Vote on ecosystem decisions</p>
                </div>
              </div>

              {/* PSN Token */}
              <div className="flex flex-col items-center space-y-3 p-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                <div className="relative w-12 h-12">
                  <Image
                    src="/pp.svg"
                    alt="PSN Token"
                    width={44}
                    height={44}
                    className="rounded-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <h4 className="font-semibold text-foreground">PSN</h4>
                  <p className="text-xs text-muted-foreground">Utility Token</p>
                  <p className="text-xs text-muted-foreground mt-1">Platform utilities & rewards</p>
                </div>
              </div>

              {/* EPSN Token */}
              <div className="flex flex-col items-center space-y-3 p-4 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200/50 dark:border-green-800/50">
                <div className="relative w-12 h-12">
                  <Image
                    src="/le.png"
                    alt="EPSN Token"
                    width={44}
                    height={44}
                    className="rounded-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <h4 className="font-semibold text-foreground">EPSN</h4>
                  <p className="text-xs text-muted-foreground">Reward Token</p>
                  <p className="text-xs text-muted-foreground mt-1">Daily claim rewards</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center space-y-4 pt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full">
            <span className="text-sm text-muted-foreground">
              Prices update automatically every 5 minutes via CoinGecko API
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            All payments are processed on the Solana blockchain. One-time purchase gives you lifetime access to your selected plan. Prices are calculated in real-time based on current SOL/USD rates.
          </p>
        </div>
      </div>
    </div>
  );
}
