'use client';

import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GenerateRewardTool } from './components/GenerateRewardTool';

export default function ReferralsPage() {
  const { referralCode, referrals, addReferral } = useAppContext();
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
    <div className="space-y-8 px-4">
      <Card className="bg-secondary/30 border-primary/10">
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>
            Share this link with your friends. You get rewards when they sign up!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Input value={referralLink} readOnly className="bg-background" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <GenerateRewardTool />

      <Card className="bg-secondary/30 border-primary/10">
        <CardHeader>
          <CardTitle>Your Referrals ({referrals.length}/5)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {referrals.length > 0 ? (
            referrals.map((ref, index) => (
              <div key={index} className="flex items-center space-x-4 rounded-lg bg-background p-3">
                <Avatar>
                  <AvatarImage src={ref.avatar} alt={ref.name} data-ai-hint="person" />
                  <AvatarFallback>{ref.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{ref.name}</p>
                  <p className="text-sm text-muted-foreground">Joined successfully</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">You haven't referred anyone yet.</p>
              <p className="text-sm text-muted-foreground">Share your link to get started!</p>
            </div>
          )}
           {process.env.NODE_ENV === 'development' && referrals.length < 5 && (
            <Button onClick={addReferral} variant="outline" className="w-full mt-4">
              (Dev) Add a referral
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
