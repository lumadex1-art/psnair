'use client';

import { useAppContext } from '@/contexts/AppContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Coins, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const { user, balance, userTier, logout } = useAppContext();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  if (!user) {
    return null; // Or a loading state
  }

  return (
    <div className="space-y-6 px-4">
      <div className="flex flex-col items-center space-y-4">
        <Avatar className="h-24 w-24 border-2 border-primary">
          <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person" />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h1 className="font-headline text-2xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">{user.username}</p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/80 to-accent/80 text-primary-foreground text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-base font-medium">
            <Coins className="h-5 w-5" />
            <span>Balance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-headline text-3xl font-bold">{balance.toLocaleString()} EPSN</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base font-medium">
            <span>Account Tier</span>
            <Star className="h-5 w-5 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant={userTier !== 'Free' ? 'default' : 'secondary'} className={userTier !== 'Free' ? 'bg-primary' : ''}>
            {userTier}
          </Badge>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={handleLogout}>
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </div>
  );
}
