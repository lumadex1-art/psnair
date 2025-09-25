
'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Wallet, RefreshCw, TrendingUp, Loader2, Landmark, Copy, Hourglass, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getSolanaPrice, getPlanPricing, formatSolAmount, formatUsdAmount } from '@/lib/pricing';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PLAN_CONFIG } from '@/lib/config';
import { ScrollArea } from '@/components/ui/scroll-area';

type Tier = keyof typeof PLAN_CONFIG.PRICES;

const MERCHANT_WALLET = new PublicKey('Fj86LrcDNkiDRs3rQs4dZEDaj769N8bTTvipANV8vBby');

const plans = Object.entries(PLAN_CONFIG.FEATURES)
  .filter(([name]) => name !== 'Free')
  .map(([name, data]) => ({
    name: name as Tier,
    description: data.features.join(', '),
    features: data.features,
    isPopular: false,
  }));

const idrPrices: Record<Tier, string> = {
    "Free": "Rp0",
    "Starter": "Rp65.600",
    "Silver": "Rp131.200",
    "Gold": "Rp262.400",
    "Platinum": "Rp738.000",
    "Diamond": "Rp1.476.000",
}

interface PlanPricing {
  usd: number;
  sol: number;
  solPrice: number;
  isStale: boolean;
}

interface BankTransferDetails {
    planName: Tier;
    planPrice: string;
}

interface PurchaseConfirmationDetails {
    plan: Tier;
    priceSol: number;
    priceUsd: number;
}


export default function ShopPage() {
  const { userTier, user } = useAppContext();
  const { toast } = useToast();
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [planPricing, setPlanPricing] = useState<Record<Tier, PlanPricing>>({} as Record<Tier, PlanPricing>);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [purchasingPlan, setPurchasingPlan] = useState<Tier | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);

  // State for Bank Transfer Dialog
  const [isBankTransferOpen, setIsBankTransferOpen] = useState(false);
  const [bankTransferDetails, setBankTransferDetails] = useState<BankTransferDetails | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // State for Purchase Confirmation Dialog
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationDetails, setConfirmationDetails] = useState<PurchaseConfirmationDetails | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');


  const loadPricing = async () => {
    try {
      setIsLoadingPrices(true);
      const currentSolPrice = await getSolanaPrice();
      setSolPrice(currentSolPrice);
      const pricing: Record<Tier, PlanPricing> = {} as Record<Tier, PlanPricing>;
      for (const plan of plans) {
        const usdPrice = PLAN_CONFIG.PRICES[plan.name] * currentSolPrice;
        pricing[plan.name] = await getPlanPricing(usdPrice);
      }
      setPlanPricing(pricing);
      setLastUpdated(new Date());
    } catch (error) {
    } finally {
      setIsLoadingPrices(false);
    }
  };

  useEffect(() => {
    loadPricing();
    const interval = setInterval(loadPricing, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      connection.getBalance(publicKey).then(balance => {
        setSolBalance(balance / LAMPORTS_PER_SOL);
      });
      // Optional: Listen for balance changes
      const subscriptionId = connection.onAccountChange(publicKey, (accountInfo) => {
        setSolBalance(accountInfo.lamports / LAMPORTS_PER_SOL);
      });
      return () => {
        connection.removeAccountChangeListener(subscriptionId);
      }
    } else {
      setSolBalance(null);
    }
  }, [connected, publicKey, connection]);

  const openConfirmationDialog = (plan: Tier) => {
    const pricing = planPricing[plan];
    if (!pricing) {
        toast({ variant: 'destructive', title: 'Error', description: 'Plan pricing not available.' });
        return;
    }
    setConfirmationDetails({
        plan,
        priceSol: PLAN_CONFIG.PRICES[plan],
        priceUsd: pricing.usd,
    });
    setConfirmationInput('');
    setIsConfirmationOpen(true);
};


const handleSolanaPurchase = async (plan: Tier) => {
  if (!connected || !publicKey || !user) {
    toast({ variant: 'destructive', title: 'Wallet or User not connected' });
    return;
  }
  
  const priceInSol = PLAN_CONFIG.PRICES[plan];
  if (priceInSol <= 0) {
    toast({ variant: 'destructive', title: 'Invalid Plan Price' });
    return;
  }

  setPurchasingPlan(plan);
  try {
    const transactionId = doc(collection(db, 'transactions')).id;
    const amountLamports = Math.ceil(priceInSol * LAMPORTS_PER_SOL);

    // 1. Create a "pending" transaction document in Firestore
    await setDoc(doc(db, 'transactions', transactionId), {
      uid: user.uid,
      userName: user.name,
      userEmail: user.email,
      planId: plan,
      amountLamports: amountLamports,
      currency: 'SOL',
      status: 'pending',
      provider: 'solana',
      createdAt: serverTimestamp(),
      planUpgraded: false,
    });

    // 2. Create and send the on-chain transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: MERCHANT_WALLET,
        lamports: amountLamports,
      })
    );
    tx.feePayer = publicKey;
    tx.recentBlockhash = blockhash;

    const signature = await sendTransaction(tx, connection);
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    // 3. Update the transaction document with the signature and 'paid' status
    await setDoc(doc(db, 'transactions', transactionId), {
      status: 'paid',
      providerRef: signature,
      confirmedAt: serverTimestamp(),
    }, { merge: true });

    toast({
      title: 'Purchase Successful!',
      description: `Your ${plan} plan purchase is being processed. Please await admin approval for plan activation.`,
    });
  } catch (err: any) {
    toast({ variant: 'destructive', title: 'Payment failed', description: err?.message || 'Please try again.' });
  } finally {
    setPurchasingPlan(null);
    setIsConfirmationOpen(false);
  }
};

  const handleBankTransfer = (plan: Tier) => {
    setBankTransferDetails({
      planName: plan,
      planPrice: idrPrices[plan]
    });
    setIsBankTransferOpen(true);
  };

  const handleConfirmAndProceed = () => {
    if (!confirmationDetails) return;
    handleSolanaPurchase(confirmationDetails.plan);
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast({ title: 'Copied!', description: `${type} account number copied to clipboard.` });
    setTimeout(() => setCopied(null), 2000);
  };
  
  const isConfirmationInputValid = confirmationDetails ? parseFloat(confirmationInput) >= confirmationDetails.priceSol : false;


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
          
           {/* Activation Notice */}
           <div className="flex items-start gap-3 rounded-lg border border-blue-200/80 bg-blue-50/80 p-4 dark:border-blue-800/50 dark:bg-blue-900/20 max-w-2xl mx-auto">
              <Hourglass className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">Aktivasi Paket</h4>
                  <p className="text-xs text-blue-600 dark:text-blue-400/80">
                      Paket akan aktif pada klaim berikutnya.
                  </p>
              </div>
          </div>

          <div className="flex justify-center"><WalletMultiButton className="!bg-background !text-foreground hover:!bg-accent !border-border/50 !rounded-lg !font-medium !px-6 !py-3" /></div>
          
          <div className="space-y-6">
            {plans.map((plan) => {
              const pricing = planPricing[plan.name];
              const isCurrentPlan = userTier === plan.name;
              const isProcessing = purchasingPlan === plan.name;

              return (
                <Card key={plan.name} className={cn('relative border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl', isCurrentPlan && 'bg-gradient-to-br from-green-50/80 to-green-100/60 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800')}> 
                  {plan.isPopular && <Badge className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold animate-pulse">MOST POPULAR</Badge>}
                  <CardHeader className="pb-4 pt-8">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-2xl font-bold flex items-center gap-3">{plan.name}{isCurrentPlan && <Badge variant="secondary" className="text-xs">Current</Badge>}</CardTitle>
                        <CardDescription className="text-base text-muted-foreground">{plan.description}</CardDescription>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur-sm" />
                          <div className="relative bg-gradient-to-br from-background/80 to-background/60 p-3 rounded-lg border border-border/50">
                            {isLoadingPrices ? <div className="animate-pulse"><div className="h-8 bg-muted rounded w-20 mb-1"></div><div className="h-4 bg-muted rounded w-16"></div></div> : pricing ? <><p className="font-headline text-3xl font-bold text-primary">{formatSolAmount(PLAN_CONFIG.PRICES[plan.name])} SOL</p><p className="text-xs text-muted-foreground">one-time</p></> : <p className="text-sm text-muted-foreground">Loading...</p>}
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
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                       <Button onClick={() => openConfirmationDialog(plan.name)} disabled={isCurrentPlan || !connected || isLoadingPrices || isProcessing || !!purchasingPlan} className={cn('sm:w-auto w-full h-10 font-semibold text-sm', isCurrentPlan && 'bg-green-600 hover:bg-green-700 text-white')}>
                          {isProcessing && purchasingPlan === plan.name ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : isCurrentPlan ? (
                            'Current Plan'
                          ) : !connected ? (
                            'Connect Wallet'
                          ) : isLoadingPrices ? (
                            'Loading Prices...'
                          ) : (
                            `Upgrade to ${plan.name}`
                          )}
                      </Button>
                      <Button variant="outline" onClick={() => handleBankTransfer(plan.name)} disabled={isCurrentPlan} className="sm:w-auto w-full h-10 font-semibold text-sm">
                        <Landmark className="mr-2 h-4 w-4" />
                        Bank Transfer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
      
       {/* Purchase Confirmation Dialog */}
       <Dialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Confirm Your Purchase</DialogTitle>
                    <DialogDescription>
                        To ensure security, please confirm the amount before proceeding with your purchase.
                    </DialogDescription>
                </DialogHeader>
                {confirmationDetails && (
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 text-center">
                            <p className="text-sm font-medium text-primary">You are upgrading to</p>
                            <p className="font-bold text-xl">{confirmationDetails.plan}</p>
                            <p className="font-semibold text-2xl font-mono mt-2">
                                {formatSolAmount(confirmationDetails.priceSol)} SOL
                            </p>
                            <p className="text-xs text-muted-foreground">
                                (≈ {formatUsdAmount(confirmationDetails.priceUsd)})
                            </p>
                        </div>

                         <div className="p-3 bg-muted rounded-lg border text-center">
                            <p className="text-xs text-muted-foreground">Your Solana Balance</p>
                            <p className="font-mono font-semibold text-base">
                                {solBalance !== null ? `${formatSolAmount(solBalance)} SOL` : 'Loading...'}
                            </p>
                        </div>


                        <div className="space-y-2">
                            <Label htmlFor="confirmation-amount" className="text-sm font-medium">
                                Type the SOL amount to confirm:
                            </Label>
                            <Input
                                id="confirmation-amount"
                                type="number"
                                placeholder={formatSolAmount(confirmationDetails.priceSol)}
                                value={confirmationInput}
                                onChange={(e) => setConfirmationInput(e.target.value)}
                                className="text-center font-mono text-lg"
                                step="any"
                            />
                            <p className="text-xs text-muted-foreground text-center">
                                Please enter exactly <span className="font-bold">{formatSolAmount(confirmationDetails.priceSol)}</span> or more.
                            </p>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                        onClick={handleConfirmAndProceed}
                        disabled={!isConfirmationInputValid || !!purchasingPlan}
                    >
                        {purchasingPlan ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <ShieldCheck className="mr-2 h-4 w-4" />
                        )}
                        Confirm & Proceed
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


      {/* Bank Transfer Dialog */}
      <Dialog open={isBankTransferOpen} onOpenChange={setIsBankTransferOpen}>
        <DialogContent className="max-w-md p-0">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
              <DialogHeader>
                  <DialogTitle>Formulir Transfer Bank</DialogTitle>
                  <DialogDescription>
                      Silakan isi detail transfer Anda dan lakukan pembayaran ke salah satu rekening di bawah ini.
                  </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-sm font-medium text-primary">Paket Dipilih</p>
                      <p className="font-bold text-xl">{bankTransferDetails?.planName}</p>
                      <p className="font-semibold text-lg">{bankTransferDetails?.planPrice}</p>
                  </div>

                  {/* Activation Notice */}
                  <div className="flex items-start gap-3 rounded-lg border border-orange-200/80 bg-orange-50/80 p-3 dark:border-orange-800/50 dark:bg-orange-900/20">
                      <Hourglass className="h-5 w-5 flex-shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" />
                      <div className="flex-1">
                          <h4 className="font-semibold text-sm text-orange-700 dark:text-orange-300">Aktivasi Kilat! 🚀</h4>
                          <p className="text-xs text-orange-600 dark:text-orange-400/80">
                              Paket Anda akan aktif dalam maksimal 24 jam setelah konfirmasi pembayaran kami terima.
                          </p>
                      </div>
                  </div>

                  {/* Form Inputs */}
                  <div className="space-y-3">
                      <div>
                          <Label htmlFor="sender-name">Nama Pengirim</Label>
                          <Input id="sender-name" placeholder="John Doe" />
                      </div>
                      <div>
                          <Label htmlFor="sender-bank">Bank Pengirim</Label>
                          <Input id="sender-bank" placeholder="BCA, Mandiri, etc." />
                      </div>
                      <div>
                          <Label htmlFor="account-number">No. Rekening</Label>
                          <Input id="account-number" placeholder="1234567890" />
                      </div>
                      <div>
                          <Label htmlFor="amount-sent">Jumlah yang Dikirim</Label>
                          <Input id="amount-sent" placeholder={bankTransferDetails?.planPrice} />
                      </div>
                  </div>

                  {/* Bank Details */}
                  <div className="space-y-3 pt-4 border-t">
                      <h4 className="font-semibold">Rekening Tujuan</h4>
                      <div className="p-3 bg-muted rounded-lg border">
                          <p className="font-bold text-blue-600">BCA</p>
                          <div className="flex items-center justify-between">
                              <p className="font-mono text-lg">4364543214</p>
                              <Button variant="ghost" size="icon" onClick={() => handleCopy('4364543214', 'BCA')}>
                                {copied === 'BCA' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                          </div>
                          <p className="text-sm">a/n PT ASIA SISTEM TEKNOLOGI</p>
                      </div>
                        <div className="p-3 bg-muted rounded-lg border">
                          <p className="font-bold text-blue-800">MANDIRI</p>
                            <div className="flex items-center justify-between">
                              <p className="font-mono text-lg">1220013904209</p>
                              <Button variant="ghost" size="icon" onClick={() => handleCopy('1220013904209', 'Mandiri')}>
                                {copied === 'Mandiri' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          <p className="text-sm">a/n PT ASIA SISTEM TEKNOLOGI</p>
                      </div>
                  </div>

                  {/* Confirmation */}
                  <div className="text-center p-3 bg-green-100 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <a
                      href="https://wa.me/6281320035308"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 text-sm text-green-700 dark:text-green-300"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5"
                      >
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99 0-3.903-.52-5.586-1.456l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.296-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.206 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.289.173-1.414z" />
                      </svg>
                      <span>
                        Setelah transfer, harap konfirmasi ke WhatsApp{' '}
                        <strong className="font-mono">+6281320035308</strong>
                      </span>
                    </a>
                  </div>

                  {/* Confirmation */}
                  <DialogFooter className="sticky bottom-0 bg-background/95 p-6 pt-2 -mx-6 -mb-6 border-t">
                      <DialogClose asChild>
                          <Button variant="secondary">Tutup</Button>
                      </DialogClose>
                      <Button onClick={() => {
                          toast({ title: 'Informasi Terkirim', description: 'Silakan lanjutkan transfer dan konfirmasi.' });
                          setIsBankTransferOpen(false);
                      }}>
                          Kirim Informasi
                      </Button>
                  </DialogFooter>
                </div>
              </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

    