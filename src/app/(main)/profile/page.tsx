'use client';

import { useAppContext } from '@/contexts/AppContext';
import { UserAvatar } from '@/components/UserAvatar';
import { BalanceStatus } from '@/components/BalanceStatus';
import { ReferralCode } from '@/components/ReferralCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Coins, Star, Repeat, Copy, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, balance, userTier, logout, referralCode, referrals } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const referralLink = `https://epsilondrop.app/join?ref=${referralCode}`;
  
  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: 'Copied to clipboard!',
      description: 'Your referral link is ready to be shared.',
    });
  };

  if (!user) {
    return null; // Or a loading state
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(120,119,198,0.1),transparent)] pointer-events-none" />
      
      <div className="relative z-10 space-y-8 px-4 pb-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center space-y-6 pt-8">
          <div className="relative">
            {/* Avatar Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 rounded-full blur-2xl animate-pulse" />
            
            {/* Avatar Container */}
            <div className="relative">
              <UserAvatar 
                src={user.avatar} 
                name={user.name}
                className="h-32 w-32 border-4 border-primary/40 shadow-2xl shadow-primary/25 ring-4 ring-background/50"
                fallbackClassName="text-4xl"
              />
              
              {/* Online Status */}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-background flex items-center justify-center shadow-lg">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              </div>
              
              {/* Tier Badge */}
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-primary/80 px-3 py-1 rounded-full border-2 border-background shadow-lg">
                <span className="text-xs font-bold text-primary-foreground">{userTier}</span>
              </div>
            </div>
          </div>
          
          {/* User Info */}
          <div className="text-center space-y-3">
            <h1 className="font-headline text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              {user.name.includes('@') ? user.name.split('@')[0] : user.name}
            </h1>
            <p className="text-muted-foreground text-lg flex items-center justify-center gap-2">
              <span>@{user.username}</span>
              <span className="text-primary">✨</span>
            </p>
            {user.name.includes('@') && (
              <p className="text-xs text-muted-foreground">
                {user.name}
              </p>
            )}
            
            {/* Stats Row */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{balance.toLocaleString()}</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">EPSN</p>
                  <BalanceStatus />
                </div>
              </div>
              <div className="w-px h-8 bg-border/50" />
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">Active</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl shadow-2xl shadow-primary/10 overflow-hidden">
          <CardHeader className="text-center p-6 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="relative mx-auto mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 rounded-full blur-lg" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 shadow-xl">
                <Coins className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Total Balance
            </CardTitle>
            <div className="space-y-1">
              <p className="font-headline text-5xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {balance.toLocaleString()}
              </p>
              <p className="text-lg font-semibold text-muted-foreground">EPSN Tokens</p>
            </div>
          </CardHeader>
        </Card>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/swap" className="block">
            <Card className="border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="relative mx-auto mb-3 w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 group-hover:scale-110 transition-transform duration-300">
                  <Repeat className="h-6 w-6 text-blue-500" />
                </div>
                <p className="font-semibold text-foreground">Swap Tokens</p>
                <p className="text-xs text-muted-foreground mt-1">Exchange EPSN</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/shop" className="block">
            <Card className="border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="relative mx-auto mb-3 w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 group-hover:scale-110 transition-transform duration-300">
                  <Star className="h-6 w-6 text-purple-500" />
                </div>
                <p className="font-semibold text-foreground">Upgrade Plan</p>
                <p className="text-xs text-muted-foreground mt-1">Get premium</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Account Tier Card */}
        <Card className="border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl shadow-xl shadow-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-xl">
              <span className="flex items-center gap-2">
                <Star className="h-6 w-6 text-primary" />
                Account Tier
              </span>
              <div className="text-right">
                <Badge 
                  variant={userTier !== 'Free' ? 'default' : 'secondary'} 
                  className={cn(
                    'px-4 py-2 text-sm font-bold',
                    userTier !== 'Free' 
                      ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25' 
                      : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  {userTier}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 rounded-lg bg-accent/50">
                <p className="text-2xl font-bold text-primary">
                  {userTier === 'Premium' ? '5' : userTier === 'Pro' ? '7' : userTier === 'Master' ? '15' : userTier === 'Ultra' ? '25' : '1'}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Daily Claims</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/50">
                <p className="text-2xl font-bold text-green-500">∞</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Valid Until</p>
              </div>
            </div>
            
            {userTier === 'Free' && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                <p className="text-sm font-medium text-primary mb-2">🚀 Upgrade to Premium</p>
                <p className="text-xs text-muted-foreground">Get more daily claims and exclusive benefits!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral Section */}
        <ReferralCode />

        {/* Logout Button */}
        <Card className="border border-red-200/50 bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-900/20 dark:to-red-800/10 backdrop-blur-xl">
          <CardContent className="p-4">
            <Button 
              variant="outline" 
              className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 transition-all duration-200" 
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
