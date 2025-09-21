'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Coins,
  Users,
  ShoppingBag,
  User,
  Map,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/claim', icon: Coins, label: 'Claim' },
  { href: '/referrals', icon: Users, label: 'Referrals' },
  { href: '/shop', icon: ShoppingBag, label: 'Shop' },
  { href: '/roadmap', icon: Map, label: 'Roadmap' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 mx-auto max-w-md border-t bg-card/95 backdrop-blur-sm">
      <nav className="grid h-16 grid-cols-5 items-center gap-2 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-primary',
                isActive && 'text-primary'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
