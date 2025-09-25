
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertTriangle, KeyRound } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

function ActionHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const mode = searchParams.get('mode');
  const actionCode = searchParams.get('oobCode');
  const continueUrl = searchParams.get('continueUrl');


  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resetting'>('loading');
  const [message, setMessage] = useState('Processing your request...');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  useEffect(() => {
    const handleAction = async () => {
      try {
        switch (mode) {
          case 'verifyEmail':
            if (!actionCode) throw new Error("Action code is missing.");
            await applyActionCode(auth, actionCode);
            setStatus('success');
            setMessage('Email verification successful! Your account is now active. You will be redirected to the login page.');
            setTimeout(() => router.push('/'), 5000);
            break;
            
          case 'resetPassword':
            if (!actionCode) throw new Error("Action code is missing.");
            await verifyPasswordResetCode(auth, actionCode);
            setStatus('resetting');
            setMessage('Verification successful. Please enter your new password.');
            break;
            
          default:
            setStatus('error');
            setMessage('Unsupported action or invalid link.');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'An error occurred. The link may have expired or been used already.');
      }
    };

    handleAction();
  }, [mode, actionCode, router]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
        setStatus('error');
        setMessage('Passwords do not match. Please try again.');
        return;
    }
    if (!actionCode) return;

    setStatus('loading');
    try {
        await confirmPasswordReset(auth, actionCode, newPassword);
        setStatus('success');
        setMessage('Your password has been successfully reset. Please log in with your new password.');
    } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Failed to reset password.');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
            <p className="text-muted-foreground">{message}</p>
          </div>
        );
      case 'success':
        return (
          <Alert variant="default" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-700 dark:text-green-300">Success!</AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-400">
              {message}
            </AlertDescription>
            <div className="mt-4">
                <Link href={continueUrl || '/'}>
                    <Button className="w-full">Continue to Login</Button>
                </Link>
            </div>
          </Alert>
        );
      case 'error':
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {message}
            </AlertDescription>
             <div className="mt-4">
                <Link href="/">
                    <Button variant="destructive" className="w-full">Return to Homepage</Button>
                </Link>
            </div>
          </Alert>
        );
      case 'resetting':
         return (
            <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input 
                        id="new-password" 
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input 
                        id="confirm-password" 
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                    />
                </div>
                <Button type="submit" className="w-full">
                    <KeyRound className="mr-2 h-4 w-4" />
                    Reset Password
                </Button>
            </form>
         )
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/5">
        <CardHeader className="text-center space-y-4">
           <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center backdrop-blur-sm">
                <Image src="/pp.svg" alt='logo' width={36} height={36}/>
            </div>
          <CardTitle className="text-2xl">Account Action Center</CardTitle>
          <CardDescription>{message || 'Validating your action...'}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthActionPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
            <ActionHandler />
        </Suspense>
    )
}
