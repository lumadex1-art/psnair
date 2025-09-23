
'use client';

import { Phone, MessageSquare, Loader2, KeyRound, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const { isLoggedIn, sendOtp, verifyOtp, isLoading: isAuthLoading } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Setup reCAPTCHA verifier
  const setupRecaptcha = useCallback(() => {
    if (!auth) return null;
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
    return window.recaptchaVerifier;
  }, []);

  useEffect(() => {
    // This effect runs once on mount to setup the verifier
    setupRecaptcha();
  }, [setupRecaptcha]);


  useEffect(() => {
    // If user is logged in, redirect to the claim page
    if (isLoggedIn) {
      router.replace('/claim');
    }
  }, [isLoggedIn, router]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast({
        variant: 'destructive',
        title: 'Input Required',
        description: 'Please enter your phone number.',
      });
      return;
    }
    
    // Simple validation for phone number format (e.g., starts with +)
    // You might want a more robust library for this in production
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
        toast({
            variant: 'destructive',
            title: 'Invalid Phone Number',
            description: 'Please use international format (e.g., +6281234567890)',
        });
        return;
    }


    setIsProcessing(true);
    const verifier = setupRecaptcha();
    if (!verifier) {
        setIsProcessing(false);
        toast({ variant: 'destructive', title: 'reCAPTCHA Error', description: 'Could not initialize reCAPTCHA.'});
        return;
    }
    const result = await sendOtp(phoneNumber, verifier);
    setIsProcessing(false);

    if (result.success) {
      setOtpSent(true);
      toast({
        title: 'Code Sent!',
        description: 'An OTP has been sent to your phone number.',
      });
    } else {
        toast({
            variant: 'destructive',
            title: result.errorTitle || 'Failed to Send Code',
            description: result.errorMessage || 'An unknown error occurred.',
        });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
        toast({
            variant: 'destructive',
            title: 'Input Required',
            description: 'Please enter the OTP code.',
        });
        return;
    }

    setIsProcessing(true);
    const result = await verifyOtp(otp);
    setIsProcessing(false);

    if (!result.success) {
        toast({
            variant: 'destructive',
            title: result.errorTitle || 'Login Failed',
            description: result.errorMessage || 'An unknown error occurred.',
        });
    }
    // On success, the useEffect hook will handle the redirect
  };
  
  if (isAuthLoading || isLoggedIn) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* reCAPTCHA container */}
      <div id="recaptcha-container"></div>
      
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
                  {otpSent ? 'Enter the code we sent you' : 'Sign in with your phone number'}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!otpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-3">
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                            type="tel" 
                            placeholder="e.g., +6281234567890"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            required
                            className="pl-10 h-12"
                            />
                        </div>
                        <Button type="submit" disabled={isProcessing || !phoneNumber} className="w-full h-12 text-base font-bold">
                            {isProcessing ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending Code...</>
                            ) : (
                            'Send Code'
                            )}
                        </Button>
                    </form>
                ) : (
                     <form onSubmit={handleVerifyOtp} className="space-y-3">
                        <div className="relative">
                            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                            type="text" 
                            placeholder="6-digit code"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                            className="pl-10 h-12 tracking-[0.3em] text-center"
                            maxLength={6}
                            />
                        </div>
                        <Button type="submit" disabled={isProcessing || !otp} className="w-full h-12 text-base font-bold">
                            {isProcessing ? (
                                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</>
                            ) : (
                                <> <Smartphone className="mr-2 h-5 w-5" /> Verify & Login</>
                            )}
                        </Button>
                        <Button variant="link" size="sm" onClick={() => setOtpSent(false)} className="w-full">
                            Use a different phone number?
                        </Button>
                    </form>
                )}
            </CardContent>
          </Card>
        
          {/* Footer */}
          <div className="text-center space-y-2 pt-6">
            <p className="text-xs text-muted-foreground">
              By signing in, you agree to our Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
