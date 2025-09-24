'use client';

import { Mail, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const { isLoggedIn, isLoading: isAuthLoading, user } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        router.replace('/auth/verify-otp');
      } else {
        router.replace('/claim');
      }
    }
  }, [isLoggedIn, router, user]);

  const handleEmailPasswordLogin = useCallback(async () => {
    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Input Error',
        description: 'Please enter both email and password.',
      });
      return;
    }
    setIsProcessing(true);
    try {
      // Try to sign in first
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Sign In Successful!',
        description: 'Welcome back to EpsilonDrop.',
      });
    } catch (signInError: any) {
      if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          toast({
            title: 'Account Created!',
            description: 'Please check your email for a verification code.',
          });
          // The onUserCreate trigger will handle OTP generation.
          // The useEffect will handle redirection.
        } catch (signUpError: any) {
          toast({
            variant: 'destructive',
            title: 'Sign Up Failed',
            description: signUpError.message || 'An unknown error occurred during sign up.',
          });
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Sign In Failed',
          description: signInError.message || 'An unknown error occurred during sign in.',
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [email, password, toast]);
  
  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        title: "Provide Email",
        description: "Please enter your email address to reset password.",
        variant: "destructive"
      });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: "Check your inbox for a link to reset your password."
      })
    } catch (error: any) {
       toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  };

  if (isAuthLoading || (isLoggedIn && auth.currentUser?.emailVerified)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent)] pointer-events-none" />
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm space-y-8">
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

          <Card className="border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/5">
            <CardHeader className="pb-4">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">
                  Join the Airdrop
                </h2>
                <p className="text-sm text-muted-foreground">
                  Sign in or create an account with your email
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    type="email" 
                    placeholder="Email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12"
                    disabled={isProcessing}
                  />
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12"
                    disabled={isProcessing}
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
              
              <Button 
                onClick={handleEmailPasswordLogin} 
                disabled={isProcessing || !email || !password} 
                className="w-full h-12 text-base font-bold"
              >
                 {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Sign In / Sign Up'
                )}
              </Button>

              <div className="text-center">
                 <Button variant="link" size="sm" onClick={handlePasswordReset} className="text-xs text-muted-foreground">
                  Forgot Password?
                </Button>
              </div>

            </CardContent>
          </Card>
        
          <div className="text-center space-y-2 pt-6">
            <p className="text-xs text-muted-foreground">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
