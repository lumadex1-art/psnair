'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { auth } from '@/lib/firebase';

interface OtpVerificationProps {
  email: string;
  onVerificationSuccess: () => void;
  onBack: () => void;
}

export default function OtpVerification({ email, onVerificationSuccess, onBack }: OtpVerificationProps) {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid OTP',
        description: 'Please enter a valid 6-digit OTP.',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const verifyFunction = httpsCallable(functions, 'verifyemailotp');
      await verifyFunction({ otp });
      
      // Reload user to get updated emailVerified status from Firebase Auth
      await auth.currentUser?.reload();

      toast({
        title: 'Email Verified!',
        description: 'Your account has been successfully verified.',
      });
      onVerificationSuccess();

    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: error.message || 'The OTP is incorrect or has expired.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (isResending) return;

    setIsResending(true);
    try {
      const resendFunction = httpsCallable(functions, 'resendemailotp');
      await resendFunction();
      
      toast({
        title: 'OTP Sent',
        description: 'A new OTP code has been sent to your email.',
      });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Resend Failed',
        description: error.message || 'Could not send a new OTP. Please try again later.',
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
            disabled={isResending}
            className="w-full"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
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
