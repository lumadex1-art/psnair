
'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { loginWithEmail, registerWithEmail, isLoggedIn } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      router.replace('/claim');
    }
  }, [isLoggedIn, router]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let result;

    if (isRegistering) {
      result = await registerWithEmail(email, password);
      if (result.success && result.message) {
        toast({
          title: 'Registration Successful',
          description: result.message,
        });
        // Clear form and switch to login view
        setEmail('');
        setPassword('');
        setIsRegistering(false);
      }
    } else {
      result = await loginWithEmail(email, password);
    }

    if (!result.success) {
      toast({
        variant: 'destructive',
        title: isRegistering ? 'Registration Failed' : 'Authentication Failed',
        description: result.error,
      });
    }
    
    // onAuthStateChanged will redirect on successful verified login
    setIsSubmitting(false);
  };

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
                <h2 className="text-xl font-semibold">{isRegistering ? 'Create an Account' : 'Welcome Back'}</h2>
                <p className="text-sm text-muted-foreground">
                  {isRegistering ? 'Sign up to start earning rewards' : 'Sign in to continue'}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : (isRegistering ? 'Sign Up' : 'Sign In')}
                </Button>
              </form>
              
              <div className="text-center pt-4 border-t border-border/30">
                {isRegistering ? (
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Button variant="link" className="p-0 h-auto" onClick={() => setIsRegistering(false)}>
                      Sign In
                    </Button>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Button variant="link" className="p-0 h-auto" onClick={() => setIsRegistering(true)}>
                      Sign Up
                    </Button>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        
          {/* Footer */}
          <div className="text-center space-y-2 pt-6">
            <p className="text-xs text-muted-foreground">
              By signing in, you agree to our Terms of Service
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
