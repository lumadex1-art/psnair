
'use client';

import { ArrowRight, LogIn, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Endpoint for the new Cloud Function
const SEND_LOGIN_LINK_URL = 'https://sendloginlink-ivtinaswgq-uc.a.run.app';

export default function LoginPage() {
  const { isLoggedIn, loginWithGoogle, isLoading: isAuthLoading } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => {
    // If user is logged in, redirect to the claim page
    if (isLoggedIn) {
      router.replace('/claim');
    }
  }, [isLoggedIn, router]);

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter your email address.',
      });
      return;
    }

    setIsSendingLink(true);
    setLinkSent(false);

    try {
      const response = await fetch(SEND_LOGIN_LINK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send login link. Please try again.');
      }

      setLinkSent(true);
      toast({
        title: 'Link Sent!',
        description: 'Please check your email for the magic login link.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsSendingLink(false);
    }
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
                  Sign in with Google or use a magic link
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
               <Button 
                onClick={handleGoogleLogin} 
                disabled={isAuthLoading}
                className="w-full !h-12 !text-base !font-bold hover:!bg-primary/90 !transition-all !duration-200 !rounded-lg"
               >
                 <Image src="/google.svg" alt="Google" width={24} height={24} className="mr-3" />
                 Sign in with Google
               </Button>
              
               <div className="relative">
                 <div className="absolute inset-0 flex items-center">
                   <span className="w-full border-t" />
                 </div>
                 <div className="relative flex justify-center text-xs uppercase">
                   <span className="bg-card px-2 text-muted-foreground">Or with email</span>
                 </div>
               </div>
              
              {linkSent ? (
                <Alert variant="default" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle className="text-green-700 dark:text-green-300">Check Your Inbox!</AlertTitle>
                  <AlertDescription className="text-green-600 dark:text-green-400">
                    A magic login link has been sent to your email.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="email" 
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-12"
                    />
                  </div>
                  <Button type="submit" disabled={isSendingLink || !email} className="w-full h-12 text-base font-bold">
                    {isSendingLink ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending...</>
                    ) : (
                      'Send Magic Link'
                    )}
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
