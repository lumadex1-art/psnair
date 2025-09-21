'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useEffect } from 'react';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10z"/>
        <path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/>
        <path d="M12 12v-2c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6 2.69-6 6-6z"/>
    </svg>
);


export default function LoginPage() {
  const { login, isLoggedIn } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn) {
      router.replace('/claim');
    }
  }, [isLoggedIn, router]);

  const handleLogin = async () => {
    await login();
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card className="border-none bg-transparent shadow-none">
          <CardHeader className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/10 p-4 text-primary backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16"><path d="M10.42 12.61a2.1 2.1 0 1 1 2.97 2.97L7.95 21 4 22l.99-3.95 5.43-5.44Z"/><path d="m13.84 11.2-1.01-1.01"/><path d="M16 4h2l2 2v2"/><path d="M13 22H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></svg>
            </div>
            <h1 className="font-headline text-4xl font-bold text-foreground">
              psnaidrop
            </h1>
            <p className="text-muted-foreground">
              Claim your daily EPSN tokens.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleLogin}
              className="w-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              size="lg"
            >
              <GoogleIcon/>
              Login with Google
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Securely connect using your Google account.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
