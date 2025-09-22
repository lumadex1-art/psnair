'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
}

// Generate consistent avatar URL based on name
const generateAvatarUrl = (name: string): string => {
  const cleanName = encodeURIComponent(name.trim());
  return `https://api.dicebear.com/7.x/initials/svg?seed=${cleanName}&backgroundColor=6366f1&textColor=ffffff`;
};

// Get initials from name or email
const getInitials = (name?: string | null): string => {
  if (!name) return 'U';
  
  // If it's an email, use the part before @
  if (name.includes('@')) {
    const emailPart = name.split('@')[0];
    return emailPart.slice(0, 2).toUpperCase();
  }
  
  // If it's a regular name
  const words = name.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export function UserAvatar({ src, name, className, fallbackClassName }: UserAvatarProps) {
  const displayName = name || 'User';
  const initials = getInitials(displayName);
  
  // Use provided src, or generate one from name, or use initials
  const avatarSrc = src || generateAvatarUrl(displayName);

  return (
    <Avatar className={cn('border-2 border-primary/30', className)}>
      <AvatarImage 
        src={avatarSrc} 
        alt={displayName}
        className="object-cover"
      />
      <AvatarFallback 
        className={cn(
          'bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold',
          fallbackClassName
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
