'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { FIREBASE_ENDPOINTS, makeAuthenticatedRequest } from '@/config/endpoints';

interface OtpVerificationProps {
  email: string;
  onVerificationSuccess: () => void;
  onBack: () => void;
}

// Pastikan export default ada
export default function OtpVerification({ email, onVerificationSuccess, onBack }: OtpVerificationProps) {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();

  // Countdown timer untuk resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid OTP',
        description: 'Please enter a valid 6-digit OTP code.',
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Ensure user is authenticated before making the call
      if (!auth.currentUser) {
        throw new Error('User not authenticated. Please log in again.');
      }

      // Get fresh ID token to ensure valid authentication
      const token = await auth.currentUser.getIdToken(true);

      // Use HTTP endpoint with CORS support (Cloud Run URL)
      const response = await makeAuthenticatedRequest(
        FIREBASE_ENDPOINTS.VERIFY_EMAIL_OTP,
        {
          method: 'POST',
          body: JSON.stringify({ otp })
        },
        token
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Verification failed');
      }

      if (result.success) {
        // Reload the current user to get updated emailVerified status
        if (auth.currentUser) {
          await auth.currentUser.reload();
        }
        
        toast({
          title: 'Email Verified!',
          description: 'Your email has been successfully verified.',
        });
        
        onVerificationSuccess();
      }
    } catch (error: any) {
      let errorMessage = 'Failed to verify OTP. Please try again.';
      let errorTitle = 'Verification Failed';
      
      if (error.message?.includes('Invalid or expired OTP')) {
        errorMessage = 'Invalid or expired OTP code.';
      } else if (error.message?.includes('No OTP found')) {
        errorMessage = 'OTP not found. Please request a new one.';
      } else if (error.message?.includes('Missing or invalid authorization')) {
        errorMessage = 'Authentication failed. Please log in again.';
        errorTitle = 'Authentication Error';
      } else if (error.message?.includes('User not authenticated')) {
        errorMessage = 'Please log in again to verify your email.';
        errorTitle = 'Authentication Required';
      } else if (error.message?.includes('OTP has expired')) {
        errorMessage = 'OTP has expired. Please request a new one.';
      }

      toast({
        variant: 'destructive',
        title: errorTitle,
        description: errorMessage,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);

    try {
      // Ensure user is authenticated
      if (!auth.currentUser) {
        throw new Error('User not authenticated. Please log in again.');
      }

      // Get fresh ID token
      const token = await auth.currentUser.getIdToken(true);

      // Use HTTP endpoint with CORS support (Cloud Run URL)
      const response = await makeAuthenticatedRequest(
        FIREBASE_ENDPOINTS.RESEND_EMAIL_OTP,
        {
          method: 'POST'
        },
        token
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend OTP');
      }

      toast({
        title: 'OTP Sent!',
        description: 'A new OTP code has been sent to your email.',
      });
      
      setCountdown(60); // 60 seconds countdown
    } catch (error: any) {
      let errorMessage = 'Failed to resend OTP. Please try again.';
      
      if (error.message?.includes('Missing or invalid authorization')) {
        errorMessage = 'Please log in again to resend OTP.';
      } else if (error.message?.includes('User not authenticated')) {
        errorMessage = 'Authentication expired. Please log in again.';
      }

      toast({
        variant: 'destructive',
        title: 'Resend Failed',
        description: errorMessage,
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/5">
      <CardHeader className="pb-4">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Verify Your Email</CardTitle>
          <p className="text-sm text-muted-foreground">
            We've sent a 6-digit verification code to
          </p>
          <p className="text-sm font-medium">{email}</p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input
              id="otp"
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center text-lg tracking-widest"
              autoComplete="one-time-code"
            />
          </div>

          <Button 
            type="submit" 
            disabled={isVerifying || otp.length !== 6}
            className="w-full h-12"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </Button>
        </form>

        <div className="space-y-3">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
          </div>
          
          <Button
            type="button"
            variant="outline"
            onClick={handleResendOtp}
            disabled={isResending || countdown > 0}
            className="w-full"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : countdown > 0 ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend in {countdown}s
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend Code
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="w-full"
          >
            Back to Login
          </Button>
        </div>

        <Alert>
          <AlertDescription className="text-xs">
            The verification code will expire in 10 minutes. Check your spam folder if you don't see the email.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Juga export named untuk fleksibilitas
export { OtpVerification };