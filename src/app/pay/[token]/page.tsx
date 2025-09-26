
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
import { auth } from '@/lib/firebase';
import Link from 'next/link';

// Import payment functions dan types
import { 
  createPaymentIntent, 
  confirmPayment, 
  MERCHANT_WALLET,
  PaymentError,
  formatSolAmount // Menggunakan formatSolAmount dari payment utils
} from '@/lib/payment';

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
            // 1. Create payment intent menggunakan frontend logic (hanya planId)
            const paymentIntent = await createPaymentIntent(details.planId);
            
            // Check if payment intent creation failed
            if ('error' in paymentIntent) {
                throw new Error(paymentIntent.error);
            }

            // 2. Create Solana transaction
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
            const tx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: MERCHANT_WALLET,
                    lamports: details.amountLamports,
                })
            );
            tx.feePayer = publicKey;
            tx.recentBlockhash = blockhash;

            // 3. Send transaction
            const signature = await sendTransaction(tx, connection);
            await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

            // 4. Confirm payment menggunakan frontend logic (transactionId dan signature)
            const confirmResult = await confirmPayment(paymentIntent.transactionId, signature);
            
            // Check if payment confirmation failed
            if ('error' in confirmResult) {
                throw new Error(confirmResult.error);
            }

            setStatus('success');
            toast({ 
                title: 'Payment Successful!', 
                description: confirmResult.message 
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
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
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
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <CardTitle className="text-red-600">Payment Error</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/dashboard">
                            <Button className="w-full">Return to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Success state
    if (status === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <CardTitle className="text-green-600">Payment Successful!</CardTitle>
                        <CardDescription>
                            Your payment has been processed and is pending admin approval.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/dashboard">
                            <Button className="w-full">Return to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Main payment UI
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <Wallet className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <CardTitle>Complete Payment</CardTitle>
                    <CardDescription>
                        Confirm your subscription payment
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                    {details && (
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Plan:</span>
                                <span className="font-medium">{details.planName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Amount:</span>
                                <span className="font-medium">{formatSolAmount(details.amountLamports)} SOL</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">User:</span>
                                <span className="font-medium">{details.userName}</span>
                            </div>
                        </div>
                    )}

                    {!user ? (
                        <div className="text-center">
                            <p className="text-gray-600 mb-4">Please sign in to continue</p>
                            <Link href="/auth">
                                <Button className="w-full">Sign In</Button>
                            </Link>
                        </div>
                    ) : !connected ? (
                        <div className="text-center">
                            <p className="text-gray-600 mb-4">Connect your wallet to pay</p>
                            <WalletMultiButton className="!w-full" />
                        </div>
                    ) : (
                        <Button 
                            onClick={handlePayment}
                            disabled={status === 'processing'}
                            className="w-full"
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
