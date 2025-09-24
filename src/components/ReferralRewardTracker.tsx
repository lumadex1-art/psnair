'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Calendar, Target, Coins, Award } from 'lucide-react';

interface ReferralRewardTrackerProps {
  stats: {
    totalEarned: number;
    thisMonth: number;
    lastMonth: number;
    totalReferred: number;
  };
}

export function ReferralRewardTracker({ stats }: ReferralRewardTrackerProps) {
  const monthlyGrowth = stats.lastMonth > 0 
    ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100 
    : 0;

  // Calculate progress towards next milestone
  const milestones = [5, 10, 25, 50, 100];
  const nextMilestone = milestones.find(m => m > stats.totalReferred) || 100;
  const progress = (stats.totalReferred / nextMilestone) * 100;

  return (
    <Card className="border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Reward Tracker
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track your referral earnings and progress
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Earnings */}
        <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Coins className="h-6 w-6 text-primary" />
            <p className="text-3xl font-bold text-primary">
              {stats.totalEarned.toLocaleString()}
            </p>
            <span className="text-lg font-semibold text-primary">EPSN</span>
          </div>
          <p className="text-sm text-muted-foreground">Total Earned from Referrals</p>
        </div>

        {/* Monthly Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-accent/50 rounded-lg border border-border/30">
            <p className="text-xl font-semibold text-foreground">{stats.thisMonth}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3" />
              This Month
            </p>
          </div>
          <div className="text-center p-3 bg-accent/50 rounded-lg border border-border/30">
            <p className="text-xl font-semibold text-foreground">{stats.lastMonth}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3" />
              Last Month
            </p>
          </div>
        </div>

        {/* Growth Indicator */}
        {monthlyGrowth !== 0 && (
          <div className="flex items-center justify-center gap-2 p-3 bg-background/50 rounded-lg">
            <TrendingUp className={`h-4 w-4 ${monthlyGrowth > 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-sm font-medium ${monthlyGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}% from last month
            </span>
          </div>
        )}

        {/* Referral Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Progress to {nextMilestone} referrals</span>
            </div>
            <span className="text-sm text-muted-foreground">{stats.totalReferred}/{nextMilestone}</span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {nextMilestone - stats.totalReferred} more referrals to reach your next milestone!
          </p>
        </div>

        {/* Achievement Badges */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Achievements
          </p>
          <div className="flex flex-wrap gap-2">
            {milestones.map((milestone) => (
              <div
                key={milestone}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  stats.totalReferred >= milestone
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                {milestone} Referrals
                {stats.totalReferred >= milestone && ' ✓'}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}