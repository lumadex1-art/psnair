'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, MailCheck, AlertTriangle, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '@/lib/firebase';
import Image from 'next/image';
import { onAuthStateChanged } from 'firebase/auth';

export default function VerifyOtpPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        if (user.emailVerified) {
          router.replace('/claim');
        }
      } else {
        router.replace('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('OTP must be 6 digits.');
      return;
    }
    
    setIsVerifying(true);
    setError('');
    setSuccess('');

    try {
      const verifyEmailOtp = httpsCallable(functions, 'verifyemailotp');
      const result = await verifyEmailOtp({ otp });
      const data = result.data as any;

      if (data.success) {
        setSuccess(data.message);
        toast({
          title: 'Success!',
          description: data.message,
        });
        // Reload user to get updated emailVerified status
        await auth.currentUser?.reload();
        router.push('/claim');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to verify OTP.');
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleResend = async () => {
    setIsResending(true);
    setError('');
    setSuccess('');
    
    try {
      const resendEmailOtp = httpsCallable(functions, 'resendemailotp');
      const result = await resendEmailOtp();
      const data = result.data as any;

      if (data.success) {
         toast({
          title: 'OTP Resent',
          description: 'A new OTP has been sent (check logs).',
        });
      }
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Resend Failed',
        description: error.message || 'Failed to resend OTP.',
      });
    } finally {
      setIsResending(false);
    }
  };


  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/5">
        <CardHeader className="text-center space-y-4">
           <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center backdrop-blur-sm">
                <Image src="/pp.svg" alt='logo' width={36} height={36}/>
            </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            A 6-digit OTP has been sent to {currentUser?.email}. 
            (In development, please check your Firebase Functions logs for the code).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="otp">One-Time Password</Label>
              <Input 
                id="otp" 
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                required
                maxLength={6}
                placeholder="••••••"
                className="text-center text-2xl font-mono tracking-widest h-14"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

             {success && (
              <Alert variant="default" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <MailCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-700 dark:text-green-300">Success</AlertTitle>
                <AlertDescription className="text-green-600 dark:text-green-400">{success}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" className="w-full h-12" disabled={isVerifying || otp.length !== 6}>
              {isVerifying ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify Email'}
            </Button>
            
             <div className="text-center">
                <Button variant="link" size="sm" onClick={handleResend} disabled={isResending} className="text-xs text-muted-foreground">
                    {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                    Didn't receive a code? Resend
                </Button>
              </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
