'use client';

import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ReferralsPage() {
  const { referralCode, referrals } = useAppContext();
  const { toast } = useToast();
  const referralLink = `https://epsilondrop.app/join?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: 'Copied to clipboard!',
      description: 'Your referral link is ready to be shared.',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(120,119,198,0.1),transparent)] pointer-events-none" />
      
      <div className="relative z-10 space-y-8 px-4 pb-6">
        {/* Header Section */}
        <div className="text-center space-y-6 pt-6">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full border border-primary/30">
            <Copy className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold text-primary">Referral Program</span>
          </div>
          
          <div className="space-y-3">
            <h1 className="font-headline text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Invite & Earn
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Share your referral link and earn rewards when friends join EpsilonDrop
            </p>
          </div>
        </div>

        {/* Referral Link Card */}
        <Card className="border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl shadow-2xl shadow-primary/10 overflow-hidden">
          <CardHeader className="pb-4 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Copy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Your Referral Link</CardTitle>
                <CardDescription className="text-base">
                  Share this magic link with friends and earn together! 🎉
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <Input 
                    value={referralLink} 
                    readOnly 
                    className="bg-background/50 border-border/50 pr-12 font-mono text-sm h-12 focus:border-primary/50 transition-all" 
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleCopy}
                  className="h-12 w-12 border-border/50 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 group"
                >
                  <Copy className="h-5 w-5 group-hover:text-primary transition-colors" />
                </Button>
              </div>
            </div>
            
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center p-3 bg-accent/30 rounded-lg">
                <p className="text-2xl font-bold text-primary">{referrals.length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Referrals</p>
              </div>
              <div className="text-center p-3 bg-accent/30 rounded-lg">
                <p className="text-2xl font-bold text-green-500">{referrals.length * 50}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">EPSN Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Referrals List */}
        <Card className="border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl shadow-xl shadow-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">{referrals.length}</span>
                </div>
                Your Referrals
              </CardTitle>
              <Badge variant="secondary" className="font-semibold">
                {referrals.length}/5
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {referrals.length > 0 ? (
              <div className="space-y-3">
                {referrals.map((ref, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-background/80 to-background/60 border border-border/30 hover:border-primary/30 transition-all duration-200 group">
                    <div className="relative">
                      <UserAvatar 
                        src={ref.avatar} 
                        name={ref.name}
                        className="h-12 w-12 border-2 border-primary/30 group-hover:border-primary/50 transition-colors"
                      />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {ref.name}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <span>Joined successfully</span>
                        <span className="text-green-500">✓</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-500">+50 EPSN</p>
                      <p className="text-xs text-muted-foreground">Reward</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-lg" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
                    <Copy className="h-8 w-8 text-primary/60" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-foreground">No referrals yet</p>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Share your referral link with friends to start earning rewards together!
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                  <span className="text-xs font-medium text-primary">💡 Tip: Share on social media for better reach</span>
                </div>
              </div>
            )}
            
          </CardContent>
        </Card>
        
        {/* Referral Program Info */}
        <div className="text-center space-y-4 pt-4">
          <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
            <p className="text-sm font-medium text-primary mb-2">🎁 Referral Rewards</p>
            <p className="text-xs text-muted-foreground">
              Earn 50 EPSN for each friend who joins • Your friends get bonus tokens too!
            </p>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Maximum 5 referrals per account • Rewards are instant upon successful signup
          </p>
        </div>
      </div>
    </div>
  );
}
