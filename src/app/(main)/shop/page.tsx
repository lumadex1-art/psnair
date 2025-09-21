'use client';

import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

type Tier = 'Free' | 'Premium' | 'Pro' | 'Master' | 'Ultra';

// Dummy conversion rate for simulation
const SOL_PRICE_USD = 150; 

const plans = [
  {
    name: 'Premium' as Tier,
    priceUSD: 4.99,
    description: 'For active claimers who want more.',
    features: ['5 Claims per day', 'Priority Support'],
    isPopular: false,
  },
  {
    name: 'Pro' as Tier,
    priceUSD: 7.99,
    description: 'For dedicated users who want to step up.',
    features: ['7 Claims per day', 'Faster Cooldowns', 'Priority Support'],
    isPopular: true,
  },
  {
    name: 'Master' as Tier,
    priceUSD: 14.99,
    description: 'For serious enthusiasts aiming for the top.',
    features: ['15 Claims per day', 'Exclusive Tools Access', 'Master Badge'],
    isPopular: false,
  },
  {
    name: 'Ultra' as Tier,
    priceUSD: 24.99,
    description: 'For power users aiming to maximize their earnings.',
    features: ['25 Claims per day', 'All Exclusive Tools', 'Ultra Community Access', 'Highest Priority Support'],
    isPopular: false,
  },
];

export default function ShopPage() {
  const { userTier, purchasePlan } = useAppContext();
  const { toast } = useToast();
  const { connected, publicKey } = useWallet();

  const handlePurchase = (plan: Tier) => {
    // In a real app, this would trigger a Solana transaction.
    // For now, we simulate a successful purchase.
    console.log(`Simulating purchase of ${plan} for wallet: ${publicKey?.toBase58()}`);
    purchasePlan(plan);
    toast({
      title: 'Purchase Successful!',
      description: `You are now on the ${plan} plan.`,
    });
  };
  
  const getPriceInSol = (priceUSD: number) => {
    return (priceUSD / SOL_PRICE_USD).toFixed(4);
  }

  return (
    <div className="space-y-8 px-4">
      <div className="text-center">
        <h1 className="font-headline text-3xl font-bold">Upgrade Your Plan</h1>
        <p className="text-muted-foreground">Unlock more claims and features with SOL.</p>
      </div>

      <div className="flex justify-center">
        <WalletMultiButton />
      </div>

      <div className="space-y-6">
        {plans.map((plan) => (
          <Card key={plan.name} className={cn('bg-secondary/30 border-primary/10', plan.isPopular && 'border-2 border-primary relative')}>
            {plan.isPopular && (
                <Badge className="absolute -top-3 right-4">MOST POPULAR</Badge>
              )}
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{plan.name} Tier</span>
                <div className="text-right">
                    <p className="font-headline text-2xl font-bold">${plan.priceUSD}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                    <p className="font-mono text-sm text-primary">~ {getPriceInSol(plan.priceUSD)} SOL</p>
                </div>
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handlePurchase(plan.name)}
                disabled={userTier === plan.name || !connected}
                className="w-full"
                variant={userTier === plan.name ? 'outline' : (plan.isPopular ? 'default' : 'secondary')}
                size="lg"
              >
                {userTier === plan.name ? 'Current Plan' : `Upgrade with SOL`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
