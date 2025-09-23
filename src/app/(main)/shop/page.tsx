
'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Wallet, RefreshCw, TrendingUp, Link as LinkIcon, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { getSolanaPrice, getPlanPricing, formatSolAmount, formatUsdAmount } from '@/lib/pricing';
import Image from 'next/image';
import { auth } from '@/lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PLAN_CONFIG } from '@/lib/config';

type Tier = keyof typeof PLAN_CONFIG.PRICES;

const MERCHANT_WALLET = new PublicKey('Fj86LrcDNkiDRs3rQs4dZEDaj769N8bTTvipANV8vBby');

const plans = [
    { name: 'Starter' as Tier, usdPrice: 4.99, description: 'For active claimers.', features: ['5 EPSN per day', 'Lifetime access', 'Priority Support'], isPopular: false },
    { name: 'Silver' as Tier, usdPrice: 7.99, description: 'For dedicated users.', features: ['10 EPSN per day', 'Faster Cooldowns', 'Priority Support'], isPopular: true },
    { name: 'Gold' as Tier, usdPrice: 14.99, description: 'For serious enthusiasts.', features: ['20 EPSN per day', 'Exclusive Tools', 'Gold Badge'], isPopular: false },
    { name: 'Platinum' as Tier, usdPrice: 24.99, description: 'For power users.', features: ['50 EPSN per day', 'All Tools', 'Platinum Community'], isPopular: false },
    { name: 'Diamond' as Tier, usdPrice: 39.99, description: 'For ultimate power users.', features: ['100 EPSN per day', 'VIP Support', 'Exclusive NFT Access'], isPopular: false },
];

interface PlanPricing {
  usd: number;
  sol: number;
  solPrice: number;
  isStale: boolean;
}

export default function ShopPage() {
  const { userTier, purchasePlan, user } = useAppContext();
  const { toast } = useToast();
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [planPricing, setPlanPricing] = useState<Record<Tier, PlanPricing>>({} as Record<Tier, PlanPricing>);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  const loadPricing = async () => {
    try {
      setIsLoadingPrices(true);
      const currentSolPrice = await getSolanaPrice();
      setSolPrice(currentSolPrice);
      const pricing: Record<Tier, PlanPricing> = {} as Record<Tier, PlanPricing>;
      for (const plan of plans) {
        pricing[plan.name] = await getPlanPricing(plan.usdPrice);
      }
      setPlanPricing(pricing);
      setLastUpdated(new Date());
    } catch (error) {
      toast({ title: 'Pricing Error', description: 'Failed to load current prices. Using fallback values.', variant: 'destructive' });
    } finally {
      setIsLoadingPrices(false);
    }
  };

  useEffect(() => {
    loadPricing();
    const interval = setInterval(loadPricing, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePurchase = async (plan: Tier) => {
    if (!connected || !publicKey) {
      toast({ variant: 'destructive', title: 'Wallet not connected' });
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const intentResponse = await fetch('https://solanacreateintentcors-ivtinaswgq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ planId: plan }),
      });
      const intent = await intentResponse.json();
      if (!intentResponse.ok) throw new Error(intent.error || 'Failed to create payment intent');
      
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: MERCHANT_WALLET, lamports: intent.amountLamports }));
      tx.feePayer = publicKey;
      tx.recentBlockhash = blockhash;
      
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
      
      const confirmResponse = await fetch('https://solanaconfirmcors-ivtinaswgq-uc.a.run.app', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify({ transactionId: intent.transactionId, signature }),
      });
      const confirmData = await confirmResponse.json();
      if (!confirmResponse.ok) throw new Error(confirmData.error || 'Server could not verify payment');
      
      purchasePlan(plan);
      toast({ title: 'Purchase Successful!', description: `You are now on the ${plan} plan. Please await admin approval.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Payment failed', description: err?.message || 'Please try again.' });
    }
  };

  const handleCreatePaymentLink = async (planId: Tier) => {
    if (!user) return;
    setIsCreatingLink(true);
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("User not authenticated");
        const token = await currentUser.getIdToken();

        const response = await fetch('https://createpaymentlink-ivtinaswgq-uc.a.run.app', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ planId }),
        });
        const data = await response.json();

        if (data.success) {
            setPaymentLink(data.link);
            setIsLinkDialogOpen(true);
        } else {
            throw new Error(data.error || 'Failed to create link.');
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsCreatingLink(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(paymentLink);
    toast({ title: 'Copied!', description: 'Payment link copied to clipboard.' });
  };


  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(120,119,198,0.1),transparent)] pointer-events-none" />
        <div className="relative z-10 space-y-8 px-4 pb-6">
          <div className="text-center space-y-6 pt-6">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full border border-primary/30">
              <Wallet className="h-6 w-6 text-primary" />
              <span className="text-sm font-semibold text-primary">Token Presale</span>
            </div>
            <h1 className="font-headline text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Upgrade Your Plan</h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">Unlock more daily claims with one-time Solana payments at live market rates</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/50 rounded-full border border-border/50">
              <span className="text-sm text-muted-foreground">Current Plan:</span>
              <Badge className={cn('font-semibold', userTier !== 'Free' ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>{userTier}</Badge>
            </div>
          </div>
          
          <div className="flex justify-center"><WalletMultiButton className="!bg-background !text-foreground hover:!bg-accent !border-border/50 !rounded-lg !font-medium !px-6 !py-3" /></div>
          
          <div className="space-y-6">
            {plans.map((plan) => {
              const pricing = planPricing[plan.name];
              const isCurrentPlan = userTier === plan.name;
              return (
                <Card key={plan.name} className={cn('relative border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl', plan.isPopular && 'border-2 border-primary shadow-2xl shadow-primary/20', isCurrentPlan && 'bg-gradient-to-br from-green-50/80 to-green-100/60 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800')}> 
                  {plan.isPopular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"><Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold px-4 py-1 shadow-lg animate-pulse">⭐ MOST POPULAR</Badge></div>}
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-2xl font-bold flex items-center gap-3">{plan.name}{isCurrentPlan && <Badge variant="secondary" className="text-xs">Current</Badge>}</CardTitle>
                        <CardDescription className="text-base text-muted-foreground">{plan.description}</CardDescription>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur-sm" />
                          <div className="relative bg-gradient-to-br from-background/80 to-background/60 p-3 rounded-lg border border-border/50">
                            {isLoadingPrices ? <div className="animate-pulse"><div className="h-8 bg-muted rounded w-20 mb-1"></div><div className="h-4 bg-muted rounded w-16"></div></div> : pricing ? <><p className="font-headline text-3xl font-bold text-primary">{formatSolAmount(pricing.sol)} SOL</p><p className="text-xs text-muted-foreground">one-time</p></> : <p className="text-sm text-muted-foreground">Loading...</p>}
                          </div>
                        </div>
                        {pricing && <div className="flex items-center gap-1 justify-end"><span className="text-xs text-muted-foreground">≈ {formatUsdAmount(pricing.usd)}</span>{pricing.isStale && <span className="text-xs text-orange-500">(Cached)</span>}</div>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => <li key={index} className="flex items-center space-x-3 group"><div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center"><CheckCircle className="h-3 w-3 text-primary" /></div><span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{feature}</span></li>)}
                    </ul>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={() => handlePurchase(plan.name)} disabled={isCurrentPlan || !connected || isLoadingPrices} className={cn('flex-1 font-semibold text-base', isCurrentPlan && 'bg-green-600 hover:bg-green-700 text-white')}>
                            {isCurrentPlan ? 'Current Plan' : !connected ? 'Connect Wallet' : isLoadingPrices ? 'Loading Prices...' : `Upgrade to ${plan.name}`}
                        </Button>
                        <Button variant="outline" onClick={() => handleCreatePaymentLink(plan.name)} disabled={isCurrentPlan || isCreatingLink} className="flex-1 font-semibold text-base">
                            <LinkIcon className="mr-2 h-4 w-4" />
                            {isCreatingLink ? 'Creating...' : 'Create Payment Link'}
                        </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Link Created!</DialogTitle>
            <DialogDescription>Share this link with anyone to pay for the upgrade. This link is valid for 1 hour.</DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Input value={paymentLink} readOnly />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsLinkDialogOpen(false)}>Close</Button>
            <Button onClick={copyLink}><Share2 className="mr-2 h-4 w-4"/>Copy & Share</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
