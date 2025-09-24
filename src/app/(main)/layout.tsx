
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { BottomNav } from '@/components/BottomNav';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn, isLoading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn) {
        router.replace('/');
      } else if (auth.currentUser && !auth.currentUser.emailVerified) {
        router.replace('/auth/verify-otp');
      }
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading || !isLoggedIn || (auth.currentUser && !auth.currentUser.emailVerified)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-background">
      <main className="flex-1 overflow-y-auto pt-6 pb-24 no-scrollbar">{children}</main>
      <BottomNav />
    </div>
  );
}
