'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { ReferralInput } from '@/components/ReferralInput';
import { ReferralStats } from '@/components/ReferralStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Gift, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ReferralPage() {
  const { user, isLoggedIn } = useAppContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [referralProcessed, setReferralProcessed] = useState(false);
  const [hasUsedReferral, setHasUsedReferral] = useState(false);

  // Get referral code from URL params
  const urlReferralCode = searchParams.get('ref');

  useEffect(() => {
    // Check if user already used a referral code
    if (user && (user as any).referredBy) {
      setHasUsedReferral(true);
    }
  }, [user]);

  const handleReferralProcessed = (result: any) => {
    setReferralProcessed(true);
    setHasUsedReferral(true);
    
    // Optionally redirect after success
    setTimeout(() => {
      router.push('/profile');
    }, 3000);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h2 className="text-xl font-semibold">Login Required</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Please login to use referral codes
                  </p>
                </div>
                <Link href="/">
                  <Button className="w-full">
                    Go to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/profile">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Referral System</h1>
              <p className="text-sm text-muted-foreground">Invite friends & earn rewards</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Success State */}
        {referralProcessed && (
          <Card className="border-green-200 bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-900/20 dark:to-green-800/10">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 mx-auto text-green-600 dark:text-green-400" />
                <div>
                  <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">
                    Referral Processed!
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    You've received your bonus tokens. Redirecting to profile...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already Used Referral */}
        {hasUsedReferral && !referralProcessed && (
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-900/20 dark:to-blue-800/10">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Gift className="h-12 w-12 mx-auto text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                    Already Referred
                  </h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    You've already used a referral code. Check your stats below!
                  </p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  Referral Code: {(user as any)?.referredBy || 'N/A'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Referral Input (for new users) */}
        {!hasUsedReferral && !referralProcessed && (
          <>
            {/* URL Referral Code Notice */}
            {urlReferralCode && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <Gift className="h-8 w-8 mx-auto text-primary" />
                    <div>
                      <p className="text-sm font-medium">
                        You were invited with code: <strong>{urlReferralCode}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This code has been pre-filled for you
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <ReferralInput 
              onReferralProcessed={handleReferralProcessed}
            />
          </>
        )}

        {/* Referral Stats */}
        <ReferralStats />

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How Referrals Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Share Your Code</p>
                  <p className="text-xs text-muted-foreground">
                    Share your unique referral code with friends
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Friend Joins</p>
                  <p className="text-xs text-muted-foreground">
                    They sign up using your referral code
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Both Get Rewards</p>
                  <p className="text-xs text-muted-foreground">
                    You get 20 EPSN, they get 10 EPSN bonus
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> Each user can only use one referral code, and you cannot refer yourself.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
