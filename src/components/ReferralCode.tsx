'use client';

import { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Copy, Share2, Users, Gift, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReferralCode() {
  const { referralCode, user } = useAppContext();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    if (!referralCode) return;
    
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy referral code",
        variant: "destructive",
      });
    }
  };

  const shareReferralCode = async () => {
    if (!referralCode) return;
    
    const shareData = {
      title: 'Join EpsilonDrop with my referral code!',
      text: `Use my referral code ${referralCode} to get bonus EPSN tokens when you join EpsilonDrop!`,
      url: `${window.location.origin}?ref=${referralCode}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy share text to clipboard
        await navigator.clipboard.writeText(
          `${shareData.text}\n\n${shareData.url}`
        );
        toast({
          title: "Share text copied!",
          description: "Share text copied to clipboard",
        });
      }
    } catch (error) {
    }
  };

  if (!referralCode) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Users className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading referral code...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="h-5 w-5 text-primary" />
          Your Referral Code
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Share your code and earn 1 EPSN for each friend who joins!
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Referral Code Display */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                value={referralCode}
                readOnly
                className="text-center text-xl font-mono font-bold tracking-wider bg-background/50 border-primary/30 focus:border-primary"
              />
            </div>
            <Button
              onClick={copyToClipboard}
              variant="outline"
              size="icon"
              className={cn(
                "transition-all duration-200",
                copied 
                  ? "bg-green-100 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400" 
                  : "hover:bg-primary/10 hover:border-primary/30"
              )}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          
          {copied && (
            <div className="text-center">
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                ✅ Copied to clipboard!
              </Badge>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={shareReferralCode}
            variant="outline"
            className="flex items-center gap-2 hover:bg-primary/10 hover:border-primary/30"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center gap-2 hover:bg-primary/10 hover:border-primary/30"
            onClick={() => {
              toast({
                title: "QR Code",
                description: "QR code feature coming soon!",
              });
            }}
          >
            <QrCode className="h-4 w-4" />
            QR Code
          </Button>
        </div>

        {/* Reward Info */}
        <div className="bg-background/50 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            Referral Rewards
          </h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>You earn:</span>
              <span className="font-semibold text-primary">1 EPSN</span>
            </div>
            <div className="flex justify-between">
              <span>Your friend gets:</span>
              <span className="font-semibold text-primary">1 EPSN</span>
            </div>
          </div>
        </div>

        {/* Share URL Preview */}
        <div className="text-xs text-muted-foreground bg-background/30 rounded p-2 font-mono break-all">
          {`${window.location.origin}?ref=${referralCode}`}
        </div>
      </CardContent>
    </Card>
  );
}

export default ReferralCode;
