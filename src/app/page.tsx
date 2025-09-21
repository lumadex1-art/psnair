'use client';

import { Bot, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useEffect } from 'react';

export default function LoginPage() {
  const { login, isLoggedIn } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn) {
      router.replace('/claim');
    }
  }, [isLoggedIn, router]);

  const handleLogin = () => {
    login({
      name: 'Test User',
      username: '@testuser',
      avatar: 'https://picsum.photos/seed/user/100/100',
    });
    router.push('/claim');
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card className="border-none bg-transparent shadow-none">
          <CardHeader className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
              <Bot className="h-12 w-12" />
            </div>
            <h1 className="font-headline text-3xl font-bold text-foreground">
              EpsilonDrop
            </h1>
            <p className="text-muted-foreground">
              Claim your daily EPSN tokens.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleLogin}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              size="lg"
            >
              Login with Telegram
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Securely connect using your Telegram account.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
