'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { validateBalanceConsistency } from '@/utils/migrateBalance';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export function BalanceStatus() {
  const { user, balance } = useAppContext();
  const [syncStatus, setSyncStatus] = useState<'checking' | 'synced' | 'inconsistent' | 'error'>('checking');
  const [firestoreBalance, setFirestoreBalance] = useState<number | null>(null);

  useEffect(() => {
    const checkBalance = async () => {
      if (!user?.uid) return;

      try {
        setSyncStatus('checking');
        
        // Get localStorage balance
        const localStorageKey = `epsilonDropState_${user.uid}`;
        const storedData = localStorage.getItem(localStorageKey);
        const localBalance = storedData ? JSON.parse(storedData).balance || 0 : 0;

        // Validate consistency
        const validation = await validateBalanceConsistency(user.uid, localBalance);
        
        if (validation.error) {
          setSyncStatus('error');
          return;
        }

        setFirestoreBalance(validation.firestoreBalance);
        
        if (validation.isConsistent) {
          setSyncStatus('synced');
        } else {
          setSyncStatus('inconsistent');
        }
      } catch (error) {
        setSyncStatus('error');
      }
    };

    checkBalance();
  }, [user?.uid, balance]);

  if (!user || syncStatus === 'checking') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Syncing balance...</span>
      </div>
    );
  }

  if (syncStatus === 'synced') {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-3 w-3 mr-1" />
          Synced
        </Badge>
      </div>
    );
  }

  if (syncStatus === 'inconsistent') {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
          <AlertCircle className="h-3 w-3 mr-1" />
          Syncing...
        </Badge>
        {firestoreBalance !== null && (
          <span className="text-xs text-muted-foreground">
            Cloud: {firestoreBalance}
          </span>
        )}
      </div>
    );
  }

  if (syncStatus === 'error') {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Sync Error
        </Badge>
      </div>
    );
  }

  return null;
}
