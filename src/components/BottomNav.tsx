
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Coins,
  ShoppingBag,
  User,
  Rocket,
  HelpCircle,
  Shield,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/AppContext';

const baseNavItems = [
  { href: '/claim', icon: Coins, label: 'Claim' },
  { href: '/shop', icon: ShoppingBag, label: 'Shop' },
  { href: '/launchpad', icon: Rocket, label: 'Launchpad' },
  { href: '/qna', icon: HelpCircle, label: 'QnA' },
  { href: '/profile', icon: User, label: 'Profile' },
];

const adminNavItem = { href: '/admin/payments', icon: Shield, label: 'Admin' };

// UID Admin - Ganti dengan UID admin Anda yang sebenarnya
const ADMIN_UID = "Gb1ga2KWyEPZbmEJVcrOhCp1ykH2";

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAppContext();
  
  const isAdmin = user?.uid === ADMIN_UID;
  // Sembunyikan tombol admin untuk sementara
  const navItems = baseNavItems;


  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md">
      {/* Backdrop blur with gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/90 to-transparent backdrop-blur-xl border-t border-border/50" />
      
      {/* Navigation content */}
      <nav className={cn(
        "relative grid h-20 items-center gap-1 px-2 py-2",
        isAdmin ? 'grid-cols-5' : 'grid-cols-5' // Tetap 5 kolom
      )}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 rounded-xl p-1.5 transition-all duration-200 hover:scale-105',
                isActive 
                  ? item.href.startsWith('/admin') ? 'text-red-500' : 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <div className={cn(
                  "absolute inset-0 rounded-xl border",
                  item.href.startsWith('/admin') 
                    ? 'bg-red-500/10 border-red-500/20' 
                    : 'bg-primary/10 border-primary/20'
                )} />
              )}
              
              {/* Icon with active state */}
              <div className={cn(
                'relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
                isActive && (item.href.startsWith('/admin') ? 'bg-red-500/15 shadow-lg shadow-red-500/25' : 'bg-primary/15 shadow-lg shadow-primary/25')
              )}>
                <item.icon className={cn(
                  'transition-all duration-200',
                  isActive ? 'h-5 w-5' : 'h-4.5 w-4.5'
                )} />
                
                {/* Active dot indicator */}
                {isActive && (
                  <div className={cn(
                    "absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse",
                    item.href.startsWith('/admin') ? 'bg-red-500' : 'bg-primary'
                  )} />
                )}
              </div>
              
              {/* Label */}
              <span className={cn(
                'text-[10px] font-medium transition-all duration-200',
                isActive ? 'font-semibold' : 'font-normal'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      
      {/* Safe area for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-gradient-to-t from-background to-transparent" />
    </footer>
  );
}
