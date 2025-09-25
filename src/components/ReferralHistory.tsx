'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Coins, Calendar, User, TrendingUp } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

// Helper function untuk format tanggal
const formatDate = (dateValue: any): string => {
  try {
    if (!dateValue) return 'Unknown date';
    
    // Handle Firestore Timestamp
    if (dateValue.seconds) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString();
    }
    
    // Handle Date object
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString();
    }
    
    // Handle string/number
    return new Date(dateValue).toLocaleDateString();
  } catch (error) {
    return 'Invalid date';
  }
};

// Helper function untuk memformat nama
const formatUserName = (name: string): string => {
  if (typeof name !== 'string') return 'User';
  // Jika nama adalah email, ambil bagian sebelum @
  if (name.includes('@')) {
    return name.split('@')[0];
  }
  // Jika bukan email, kembalikan nama apa adanya
  return name;
}

interface ReferralHistoryItem {
  id: string;
  referredUser: {
    uid: string;
    name: string;
    joinedAt: any;
  };
  reward: {
    amount: number;
    currency: string;
    claimedAt: any;
  };
  status: string;
  referralCode: string;
}

interface MonthlyStats {
  thisMonth: number;
  lastMonth: number;
}

export function ReferralHistory() {
  const { user } = useAppContext();
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({ thisMonth: 0, lastMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchReferralHistory();
    }
  }, [user]);

  const fetchReferralHistory = async () => {
    try {
      const getReferralHistory = httpsCallable(functions, 'referralHistory');
      const result = await getReferralHistory();
      const data = result.data as any;
      
      if (data.success) {
        setHistory(data.history);
        setMonthlyStats(data.monthlyStats);
      }
    } catch (error) {
      // Error handled silently for production
    } finally {
      setLoading(false);
    }
  };

  const monthlyGrowth = monthlyStats.lastMonth > 0 
    ? ((monthlyStats.thisMonth - monthlyStats.lastMonth) / monthlyStats.lastMonth) * 100 
    : 0;

  if (loading) {
    return (
      <Card className="border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Monthly Stats Card */}
      <Card className="border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Monthly Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-accent/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{monthlyStats.thisMonth}</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
            <div className="text-center p-3 bg-accent/50 rounded-lg">
              <p className="text-2xl font-bold">{monthlyStats.lastMonth}</p>
              <p className="text-xs text-muted-foreground">Last Month</p>
            </div>
          </div>
          
          {monthlyGrowth !== 0 && (
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className={`h-4 w-4 ${monthlyGrowth > 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-sm font-medium ${monthlyGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}% from last month
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral History Card */}
      <Card className="border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl shadow-xl shadow-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Referral History
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            People who joined using your referral code
          </p>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No referrals yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Share your referral code to start earning rewards!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border border-border/30 rounded-lg bg-background/30 hover:bg-background/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {item.referredUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{formatUserName(item.referredUser.name)}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Joined {formatDate(item.referredUser.joinedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-600 font-semibold mb-1">
                      <Coins className="h-4 w-4" />
                      <span>+{item.reward.amount} {item.reward.currency}</span>
                    </div>
                    <Badge 
                      variant={item.status === 'completed' ? 'default' : 'secondary'}
                      className={item.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : ''}
                    >
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
