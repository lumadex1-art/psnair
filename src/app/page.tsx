
'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useEffect } from 'react';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function LoginPage() {
  const { isLoggedIn } = useAppContext();
  const { connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    // If wallet is connected and app context is logged in, redirect
    if (isLoggedIn && connected) {
      router.replace('/claim');
    }
  }, [isLoggedIn, connected, router]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent)] pointer-events-none" />
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-full blur-xl" />
              <div className="relative mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center backdrop-blur-sm shadow-2xl">
                <Image src="/pp.svg" alt='logo' width={40} height={40}/>
              </div>
            </div>
            
            <div className="space-y-3">
              <h1 className="font-headline text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                PSNCHAIN
              </h1>
              <p className="text-muted-foreground text-lg font-medium">
                Claim your daily EPSN tokens
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Secure • Fast • Rewarding</span>
              </div>
            </div>
          </div>

          {/* Login Card */}
          <Card className="border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/5">
            <CardHeader className="pb-4">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Join the Airdrop</h2>
                <p className="text-sm text-muted-foreground">
                  Connect your Solana wallet to begin
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
               <WalletMultiButton className="!w-full !bg-primary !text-primary-foreground !h-12 !text-base !font-bold hover:!bg-primary/90 !transition-all !duration-200 !rounded-lg" />
              <p className="text-center text-xs text-muted-foreground">
                We support Phantom, Solflare, and other popular wallets.
              </p>
            </CardContent>
          </Card>
        
          {/* Footer */}
          <div className="text-center space-y-2 pt-6">
            <p className="text-xs text-muted-foreground">
              By connecting your wallet, you agree to our Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
