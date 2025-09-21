'use client';

import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Tier = 'Free' | 'Premium' | 'Ultra';

const plans = [
  {
    name: 'Premium' as Tier,
    price: '$4.99',
    description: 'For active claimers who want more.',
    features: ['5 Claims per day', 'Priority Support'],
    isPopular: true,
  },
  {
    name: 'Ultra' as Tier,
    price: '$9.99',
    description: 'For power users aiming to maximize their earnings.',
    features: ['10 Claims per day', 'Exclusive Tools Access', 'Priority Support'],
    isPopular: false,
  },
];

export default function ShopPage() {
  const { userTier, purchasePlan } = useAppContext();
  const { toast } = useToast();

  const handlePurchase = (plan: Tier) => {
    purchasePlan(plan);
    toast({
      title: 'Purchase Successful!',
      description: `You are now on the ${plan} plan.`,
    });
  };

  return (
    <div className="space-y-6 px-4">
      <div className="text-center">
        <h1 className="font-headline text-3xl font-bold">Upgrade Your Plan</h1>
        <p className="text-muted-foreground">Unlock more claims and features.</p>
      </div>

      {plans.map((plan) => (
        <Card key={plan.name} className={cn(plan.isPopular && 'border-2 border-primary')}>
          <CardHeader>
             {plan.isPopular && (
              <div className="mb-2 text-center text-sm font-semibold text-primary">MOST POPULAR</div>
            )}
            <CardTitle className="flex items-center justify-between">
              <span>{plan.name} Tier</span>
              <span className="font-headline text-2xl font-bold">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
            </CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handlePurchase(plan.name)}
              disabled={userTier === plan.name}
              className="w-full"
              variant={userTier === plan.name ? 'outline' : 'default'}
            >
              {userTier === plan.name ? 'Current Plan' : `Upgrade to ${plan.name}`}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
