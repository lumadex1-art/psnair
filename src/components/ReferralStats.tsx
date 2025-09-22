'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import { Users, TrendingUp, Gift, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReferralStatsData {
  referralCode: string;
  totalReferred: number;
  totalEarned: number;
  lastReferralAt: any;
  recentReferrals: Array<{
    id: string;
    refereeName: string;
    bonusAmount: number;
    createdAt: any;
    status: string;
  }>;
}

export function ReferralStats() {
  const { user } = useAppContext();
  const [stats, setStats] = useState<ReferralStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadReferralStats = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError('');

        // Call Firebase Function to get referral stats
        const { httpsCallable } = await import('firebase/functions');
        const { getFunctions } = await import('firebase/functions');
        const functions = getFunctions();
        const statsFunction = httpsCallable(functions, 'referralStats');
        
        const result = await statsFunction({});
        const data = result.data as any;

        if (data.success) {
          setStats(data.stats);
        } else {
          setError('Failed to load referral stats');
        }
      } catch (error: any) {
        setError('Failed to load referral stats');
      } finally {
        setLoading(false);
      }
    };

    loadReferralStats();
  }, [user]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Users className="h-8 w-8 mx-auto text-muted-foreground animate-pulse" />
              <p className="text-sm text-muted-foreground">Loading referral stats...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-destructive/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Users className="h-8 w-8 mx-auto text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card className="w-full bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200/50 dark:border-blue-800/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Referral Performance
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track your referral success and earnings
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-background/50 rounded-lg border border-blue-200/30 dark:border-blue-800/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalReferred}
              </span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Friends Referred
            </p>
          </div>
          
          <div className="text-center p-4 bg-background/50 rounded-lg border border-green-200/30 dark:border-green-800/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.totalEarned}
              </span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              EPSN Earned
            </p>
          </div>
        </div>

        {/* Last Referral */}
        {stats.lastReferralAt && (
          <div className="bg-background/30 rounded-lg p-3 border border-border/30">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last referral:</span>
              <span className="font-medium">
                {new Date(stats.lastReferralAt.toDate()).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {/* Recent Referrals */}
        {stats.recentReferrals && stats.recentReferrals.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Recent Referrals
            </h4>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stats.recentReferrals.map((referral) => (
                <div 
                  key={referral.id} 
                  className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar 
                      name={referral.refereeName}
                      className="h-8 w-8"
                    />
                    <div>
                      <p className="text-sm font-medium">{referral.refereeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(referral.createdAt.toDate()).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs",
                        referral.status === 'completed' 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                      )}
                    >
                      {referral.status === 'completed' ? '✅' : '⏳'} {referral.status}
                    </Badge>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      +{referral.bonusAmount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.totalReferred === 0 && (
          <div className="text-center py-8 space-y-3">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                No referrals yet
              </p>
              <p className="text-xs text-muted-foreground">
                Share your referral code to start earning bonuses!
              </p>
            </div>
          </div>
        )}

        {/* Performance Insights */}
        {stats.totalReferred > 0 && (
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
            <h4 className="font-semibold text-sm text-primary mb-2">
              🎉 Great job!
            </h4>
            <p className="text-xs text-muted-foreground">
              You've successfully referred {stats.totalReferred} friend{stats.totalReferred !== 1 ? 's' : ''} 
              {' '}and earned {stats.totalEarned} EPSN tokens. Keep sharing to earn more!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ReferralStats;
