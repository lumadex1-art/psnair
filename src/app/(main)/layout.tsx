'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { BottomNav } from '@/components/BottomNav';
import { Toaster } from '@/components/ui/toaster';

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn, isLoading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace('/');
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading || !isLoggedIn) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-background">
      <main className="flex-1 overflow-y-auto p-4 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
