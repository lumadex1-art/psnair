
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { auth, db, googleProvider } from '@/lib/firebase';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useWallet } from '@solana/wallet-adapter-react';
import { PLAN_CONFIG } from '@/lib/config';
import { generateUniqueReferralCode } from '@/utils/referralCode';
import { useToast } from '@/hooks/use-toast';

type User = {
  uid: string;
  name: string;
  username: string;
  avatar: string;
  email: string;
};

type Referral = {
  name: string;
  avatar: string;
};

type UserTier = keyof typeof PLAN_CONFIG.PRICES;

type AppState = {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  balance: number;
  referralCode: string;
  referrals: Referral[];
  userTier: UserTier;
  lastClaimTimestamp: number | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  claimTokens: () => Promise<{success: boolean, message: string}>;
  purchasePlan: (plan: UserTier) => void;
};

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [referralCode, setReferralCode] = useState<string>('');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [userTier, setUserTier] = useState<UserTier>('Free');
  const [lastClaimTimestamp, setLastClaimTimestamp] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { disconnect } = useWallet();
  const { toast } = useToast();

  const getOrCreateUserDocument = useCallback(async (fbUser: FirebaseUser) => {
    const userDocRef = doc(db, 'users', fbUser.uid);
    let userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const generatedReferralCode = await generateUniqueReferralCode(fbUser.uid);
      const newUser = {
        displayName: fbUser.displayName || 'Anonymous User',
        email: fbUser.email,
        providers: { google: true },
        balance: 0,
        plan: { id: 'Free', maxDailyClaims: 1, rewardPerClaim: 1 },
        claimStats: { todayClaimCount: 0, lastClaimDayKey: '', lastClaimAt: null },
        referralCode: generatedReferralCode,
        referralStats: { totalReferred: 0, totalEarned: 0, lastReferralAt: null },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await setDoc(userDocRef, newUser);
      userDoc = await getDoc(userDocRef); // Re-fetch the doc
    }
    return userDoc;
  }, []);

  const syncUserData = useCallback((fbUser: FirebaseUser | null) => {
    if (fbUser) {
      const unsubscribe = onSnapshot(doc(db, "users", fbUser.uid), (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          const appUser: User = {
            uid: fbUser.uid,
            name: userData.displayName || fbUser.displayName || 'User',
            username: (userData.displayName || fbUser.displayName || 'user').replace(/\s+/g, '').toLowerCase(),
            avatar: fbUser.photoURL || '',
            email: userData.email || fbUser.email || '',
          };
          setUser(appUser);
          setBalance(userData.balance || 0);
          setUserTier(userData.plan?.id || 'Free');
          setLastClaimTimestamp(userData.claimStats?.lastClaimAt?.toMillis() || null);
          setReferralCode(userData.referralCode || '');
        }
      });
      return unsubscribe;
    } else {
      // Clear all state on logout
      setUser(null);
      setFirebaseUser(null);
      setBalance(0);
      setReferralCode('');
      setReferrals([]);
      setUserTier('Free');
      setLastClaimTimestamp(null);
      setIsLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      const unsubscribeSync = syncUserData(fbUser);
      setIsLoggedIn(!!fbUser);
      setIsLoading(false);
      
      return () => {
        if (unsubscribeSync) unsubscribeSync();
      };
    });

    return () => unsubscribeAuth();
  }, [syncUserData]);

  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      await getOrCreateUserDocument(fbUser);
      // Auth state change will handle the rest
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'An unknown error occurred during login.',
      });
      setIsLoading(false);
    }
  }, [getOrCreateUserDocument, toast]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      await disconnect(); // Disconnect wallet if connected
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Logout Failed',
        description: error.message,
      });
    } finally {
      // The onAuthStateChanged listener will handle state cleanup
      setIsLoading(false);
    }
  }, [disconnect, toast]);

  const claimTokens = useCallback(async (): Promise<{success: boolean, message: string}> => {
    if (!firebaseUser) {
      return { success: false, message: 'You must be logged in to claim tokens.' };
    }
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { getFunctions } = await import('firebase/functions');
      const functions = getFunctions();
      const claimFunction = httpsCallable(functions, 'claim');
      
      const idempotencyKey = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      const result = await claimFunction({ idempotencyKey });
      const data = result.data as any;

      if (data.success) {
        // Data will refresh via onSnapshot, but we can show a toast immediately
        toast({ title: 'Success!', description: data.message });
        return { success: true, message: data.message };
      } else {
        toast({ variant: 'destructive', title: 'Claim Failed', description: data.message });
        return { success: false, message: data.message };
      }
    } catch (e: any) {
      console.error("Claim error:", e);
      toast({ variant: 'destructive', title: 'Claim Error', description: e.message });
      return { success: false, message: e?.message || 'An unknown error occurred.' };
    }
  }, [firebaseUser, toast]);

  const purchasePlan = useCallback(async (plan: UserTier) => {
    if (!firebaseUser) return;
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    await updateDoc(userDocRef, { "plan.id": plan, "plan.upgradedAt": Timestamp.now() });
    // State will update via onSnapshot
  }, [firebaseUser]);

  const value = { 
    user, 
    firebaseUser,
    balance, 
    referralCode, 
    referrals, 
    userTier, 
    lastClaimTimestamp, 
    isLoggedIn, 
    isLoading, 
    loginWithGoogle,
    logout, 
    claimTokens, 
    purchasePlan 
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
