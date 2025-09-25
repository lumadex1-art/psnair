
'use client';

import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Perbaikan import OtpVerification
import OtpVerification from '@/components/OtpVerification';

export default function LoginPage() {
  const { isLoggedIn, isLoading: isAuthLoading, firebaseUser } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [pendingUserEmail, setPendingUserEmail] = useState('');
  const [isWaitingForVerification, setIsWaitingForVerification] = useState(false);

  useEffect(() => {
    // Check if user is logged in and email is verified
    if (isLoggedIn && firebaseUser) {
      // If user is waiting for verification but email is now verified, redirect
      if (isWaitingForVerification && firebaseUser.emailVerified) {
        setIsWaitingForVerification(false);
        setShowOtpVerification(false);
        router.replace('/claim');
        return;
      }
      
      // If user is logged in and email is verified, redirect to claim page
      if (firebaseUser.emailVerified) {
        router.replace('/claim');
        return;
      }
      
      // If user is logged in but email is not verified, show OTP verification
      if (!firebaseUser.emailVerified && !showOtpVerification) {
        setShowOtpVerification(true);
        setPendingUserEmail(firebaseUser.email || '');
        setIsWaitingForVerification(true);
      }
    }
  }, [isLoggedIn, firebaseUser, router, showOtpVerification, isWaitingForVerification]);

  // Show loading screen while checking auth state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const validateForm = () => {
    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
      });
      return false;
    }

    if (isSignUp && password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Password Mismatch',
        description: 'Passwords do not match. Please try again.',
      });
      return false;
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Weak Password',
        description: 'Password must be at least 6 characters long.',
      });
      return false;
    }

    return true;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsProcessing(true);

    try {
      if (isSignUp) {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Set pending email for OTP verification
        setPendingUserEmail(email);
        setIsWaitingForVerification(true);
        
        toast({
          title: 'Account Created!',
          description: 'Please verify your email to complete registration.',
        });
        
        // Show OTP verification screen
        setShowOtpVerification(true);
      } else {
        // Sign in existing user
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if email is verified
        if (!userCredential.user.emailVerified) {
          setPendingUserEmail(email);
          setIsWaitingForVerification(true);
          setShowOtpVerification(true);
          
          toast({
            title: 'Email Verification Required',
            description: 'Please verify your email to continue.',
          });
        } else {
          toast({
            title: 'Welcome Back!',
            description: 'You have been signed in successfully.',
          });
        }
      }
    } catch (error: any) {
      let errorMessage = 'An unknown error occurred.';
      let errorTitle = isSignUp ? 'Sign Up Failed' : 'Sign In Failed';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please choose a stronger password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }

      toast({
        variant: 'destructive',
        title: errorTitle,
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOtpVerificationSuccess = async () => {
    // Reload user to get updated emailVerified status
    if (firebaseUser) {
      await firebaseUser.reload();
    }
    
    setShowOtpVerification(false);
    setPendingUserEmail('');
    setIsWaitingForVerification(false);
    
    toast({
      title: 'Registration Complete!',
      description: 'Your email has been verified successfully.',
    });
    
    // User will be automatically redirected by the auth state change
  };

  const handleBackToLogin = async () => {
    // Sign out the user if they want to go back
    if (firebaseUser && !firebaseUser.emailVerified) {
      await signOut(auth);
    }
    
    setShowOtpVerification(false);
    setPendingUserEmail('');
    setIsWaitingForVerification(false);
  };

  // Show OTP verification screen
  if (showOtpVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <OtpVerification
            email={pendingUserEmail}
            onVerificationSuccess={handleOtpVerificationSuccess}
            onBack={handleBackToLogin}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 rounded-full blur-2xl" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center">
              <Image
                src="/pp.svg"
                alt="PSNCHAIN"
                width={40}
                height={40}
                className="rounded-full"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="font-headline text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
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
              <h2 className="text-xl font-semibold">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isSignUp ? 'Join the airdrop with your email' : 'Sign in to your account'}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {/* Email Field */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-10 h-12"
                />
              </div>

              {/* Password Field */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="pl-10 pr-10 h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Confirm Password Field (Sign Up Only) */}
              {isSignUp && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="pl-10 pr-10 h-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={isProcessing || !email || !password || (isSignUp && !confirmPassword)} 
                className="w-full h-12 text-base font-bold"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                  </>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </Button>
            </form>

            {/* Toggle Sign Up/Sign In */}
            <div className="text-center pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </p>
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-primary hover:text-primary/80 p-0 h-auto font-semibold"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
