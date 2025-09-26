
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import Link from 'next/link';
import { formatSolAmount } from '@/lib/pricing';


interface PaymentDetails {
    uid: string;
    userName: string;
    planId: string;
    planName: string;
    amountLamports: number;
}

export default function PayPage() {
    const params = useParams();
    const token = params.token as string;
    const { toast } = useToast();
    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected } = useWallet();
    const [user, loading] = useAuthState(auth);

    const [details, setDetails] = useState<PaymentDetails | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'success' | 'error'>('loading');
    const [error, setError] = useState<string>('');

    // Decode payment token
    useEffect(() => {
        if (!token) return;
        
        try {
            const decoded = JSON.parse(atob(token));
            setDetails(decoded);
            setStatus('ready');
        } catch (err) {
            setError('Invalid payment token');
            setStatus('error');
        }
    }, [token]);

    // Handle payment process
    const handlePayment = async () => {
        if (!details || !connected || !publicKey || !user) return;

        setStatus('processing');
        try {
            // Step 1: Create payment intent via Firebase Function
            const createIntent = httpsCallable(functions, 'createPaymentIntent');
            const intentResult = await createIntent({ planId: details.planId });
            const intentData = intentResult.data as any;

            if (!intentData.success) {
                throw new Error(intentData.error || 'Failed to create payment intent.');
            }
            
            const { transactionId, amountLamports, merchantWallet } = intentData;

            // 2. Create Solana transaction
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
            const tx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: new PublicKey(merchantWallet),
                    lamports: amountLamports,
                })
            );
            tx.feePayer = publicKey;
            tx.recentBlockhash = blockhash;

            // 3. Send transaction
            const signature = await sendTransaction(tx, connection);
            await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

            // 4. Confirm payment via Firebase Function
            const confirmPaymentFunc = httpsCallable(functions, 'confirmPayment');
            const confirmResult = await confirmPaymentFunc({ transactionId, signature });
            const confirmData = confirmResult.data as any;
            
            if (!confirmData.success) {
                throw new Error(confirmData.error || 'Backend confirmation failed.');
            }

            setStatus('success');
            toast({ 
                title: 'Payment Successful!', 
                description: confirmData.message 
            });

        } catch (err: any) {
            console.error('Payment error:', err);
            const errorMessage = err.message || 'Payment failed';
            setError(errorMessage);
            setStatus('error');
            toast({ 
                title: 'Payment Failed', 
                description: errorMessage, 
                variant: 'destructive' 
            });
        }
    };

    // Loading state
    if (loading || status === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Loading payment details...</span>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (status === 'error') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <CardTitle className="text-red-600">Payment Error</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/shop">
                            <Button className="w-full">Return to Shop</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Success state
    if (status === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <CardTitle className="text-green-600">Payment Successful!</CardTitle>
                        <CardDescription>
                            Your payment has been processed and is pending admin approval.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/claim">
                            <Button className="w-full">Return to App</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Main payment UI
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <Wallet className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle>Complete Payment</CardTitle>
                    <CardDescription>
                        Confirm your subscription payment
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                    {details && (
                        <div className="bg-muted/50 p-4 rounded-lg space-y-2 border">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Plan:</span>
                                <span className="font-medium">{details.planName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Amount:</span>
                                <span className="font-medium">{formatSolAmount(details.amountLamports / LAMPORTS_PER_SOL)} SOL</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">User:</span>
                                <span className="font-medium">{details.userName}</span>
                            </div>
                        </div>
                    )}

                    {!user ? (
                        <div className="text-center">
                            <p className="text-muted-foreground mb-4">Please sign in to continue</p>
                            <Link href="/">
                                <Button className="w-full">Sign In</Button>
                            </Link>
                        </div>
                    ) : !connected ? (
                        <div className="text-center">
                            <p className="text-muted-foreground mb-4">Connect your wallet to pay</p>
                            <WalletMultiButton className="!w-full !bg-primary hover:!bg-primary/90 !text-primary-foreground" />
                        </div>
                    ) : (
                        <Button 
                            onClick={handlePayment}
                            disabled={status === 'processing'}
                            className="w-full"
                            size="lg"
                        >
                            {status === 'processing' ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing Payment...
                                </>
                            ) : (
                                'Pay Now'
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    