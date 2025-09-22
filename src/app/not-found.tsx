
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="text-center space-y-8 max-w-md">
        <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-full blur-2xl" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
                <Search className="h-12 w-12 text-primary/60" />
            </div>
        </div>
        
        <div className="space-y-4">
            <h1 className="font-headline text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              404
            </h1>
            <h2 className="text-2xl font-semibold">Page Not Found</h2>
            <p className="text-muted-foreground text-lg">
              Oops! The page you are looking for does not exist. It might have been moved or deleted.
            </p>
        </div>
        
        <Link href="/">
          <Button 
            variant="outline" 
            className="h-12 px-6 text-base bg-background/50 hover:bg-accent/50 transition-all duration-200"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Go back to Homepage
          </Button>
        </Link>

        <p className="text-xs text-muted-foreground pt-8">
            psnaidrop • Secure Airdrop Platform
        </p>
      </div>
    </div>
  );
}
