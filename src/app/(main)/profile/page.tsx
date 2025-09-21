'use client';

import { useAppContext } from '@/contexts/AppContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Coins, Star, Repeat } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, balance, userTier, logout } = useAppContext();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (!user) {
    return null; // Or a loading state
  }

  return (
    <div className="space-y-6 px-4">
      <div className="flex flex-col items-center space-y-4 pt-4">
        <Avatar className="h-28 w-28 border-4 border-primary/50">
          <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person" />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h1 className="font-headline text-2xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">{user.username}</p>
        </div>
      </div>

      <Card className="text-center bg-secondary/30 border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-base font-normal text-muted-foreground">
            <Coins className="h-5 w-5" />
            <span>Balance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-headline text-4xl font-bold">{balance.toLocaleString()} <span className="text-muted-foreground">EPSN</span></p>
        </CardContent>
      </Card>
      
      <Link href="/swap" passHref>
        <Button variant="secondary" className="w-full">
            <Repeat className="mr-2 h-4 w-4" />
            Go to Swap
        </Button>
      </Link>

      <Card className="bg-secondary/30 border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Account Tier</span>
            <Star className="h-5 w-5 text-primary" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant={userTier !== 'Free' ? 'default' : 'secondary'} className={cn(userTier !== 'Free' ? 'bg-primary text-lg' : 'text-base', 'px-4 py-1')}>
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
