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
import { formatSolAmount } from '@/lib/pricing';
import Link from 'next/link';

const MERCHANT_WALLET = new PublicKey('Fj86LrcDNkiDRs3rQs4dZEDaj769N8bTTvipANV8vBby');

interface PaymentDetails {
    uid: string;
    userName: string;
    planId: string;
    planName: string;
    amountLamports: number;
}

export default function PayPage() {
    const params = useParams();
    const { token } = params;
    const { toast } = useToast();
    const { connected, publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();

    const [details, setDetails] = useState<PaymentDetails | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'success' | 'error'>('loading');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            if (!token) return;
            setStatus('loading');
            try {
                const response = await fetch('https://getpaymentlinkdetails-ivtinaswgq-uc.a.run.app', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to fetch details.');
                setDetails(data);
                setStatus('ready');
            } catch (err: any) {
                setError(err.message);
                setStatus('error');
            }
        };
        fetchDetails();
    }, [token]);

    const handlePayment = async () => {
        if (!details || !connected || !publicKey) return;

        setStatus('processing');
        try {
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

            const signature = await sendTransaction(tx, connection);
            await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

            const confirmResponse = await fetch('https://solanaconfirmcors-ivtinaswgq-uc.a.run.app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentToken: token, signature }),
            });

            if (!confirmResponse.ok) throw new Error((await confirmResponse.json()).error || 'Backend confirmation failed.');

            setStatus('success');
            toast({ title: 'Payment Successful!', description: `The user's plan has been upgraded.` });

        } catch (err: any) {
            setError(err.message);
            setStatus('error');
            toast({ variant: 'destructive', title: 'Payment Failed', description: err.message });
        }
    };
    
    const renderContent = () => {
        switch (status) {
            case 'loading':
                return <div className="text-center"><Loader2 className="h-8 w-8 mx-auto animate-spin" /><p className="mt-2">Loading payment details...</p></div>;
            case 'error':
                return (
                     <div className="text-center space-y-4">
                        <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
                        <h3 className="text-xl font-semibold">Payment Link Invalid</h3>
                        <p className="text-muted-foreground">{error}</p>
                         <Link href="/shop"><Button variant="outline">Go Back</Button></Link>
                    </div>
                );
            case 'success':
                 return (
                     <div className="text-center space-y-4">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                        <h3 className="text-xl font-semibold">Payment Successful!</h3>
                        <p className="text-muted-foreground">Thank you! User {details?.userName}'s account has been upgraded to the {details?.planName} plan.</p>
                        <Link href="/"><Button>Return to Home</Button></Link>
                    </div>
                 );
            case 'ready':
            case 'processing':
                if (!details) return null;
                return (
                    <>
                        <CardHeader>
                            <CardTitle>Confirm Payment</CardTitle>
                            <CardDescription>You are about to pay for a plan upgrade.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-muted/50 rounded-lg border">
                                <p className="text-sm text-muted-foreground">Upgrading plan for user:</p>
                                <p className="font-semibold text-lg">{details.userName}</p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg border">
                                <p className="text-sm text-muted-foreground">New Plan:</p>
                                <p className="font-semibold text-lg">{details.planName}</p>
                            </div>
                             <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 text-center">
                                <p className="text-sm text-primary font-medium">Amount to Pay</p>
                                <p className="font-headline text-4xl font-bold text-primary">{formatSolAmount(details.amountLamports / 1_000_000_000)} SOL</p>
                            </div>
                            <div className="flex justify-center pt-4">
                                <WalletMultiButton className="!bg-background !text-foreground hover:!bg-accent !border-border/50 !rounded-lg" />
                            </div>
                             <Button onClick={handlePayment} disabled={!connected || status === 'processing'} className="w-full h-12 text-lg">
                                {status === 'processing' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><Wallet className="mr-2 h-5 w-5"/>Pay Now</>}
                            </Button>
                        </CardContent>
                    </>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
               {renderContent()}
            </Card>
        </div>
    );
}
