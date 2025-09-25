
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { auth, db } from '@/lib/firebase';
import { User as FirebaseUser, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useWallet } from '@solana/wallet-adapter-react';
import { PLAN_CONFIG } from '@/lib/config';
import { generateUniqueReferralCode } from '@/utils/referralCode';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { useSearchParams } from 'next/navigation';

type User = {
  uid: string;
  name: string;
  username: string;
  avatar: string;
  email: string;
  phoneNumber: string;
  referredBy?: string;
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
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  logout: () => Promise<void>;
  claimTokens: () => Promise<{success: boolean, message: string}>;
};

const AppContext = createContext<AppState | undefined>(undefined);

function AppProviderInternal({ children }: { children: React.ReactNode }) {
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
  const searchParams = useSearchParams();

  // Capture referral code from URL on initial load
  useEffect(() => {
    const refCodeFromUrl = searchParams.get('ref');
    if (refCodeFromUrl) {
      try {
        // Use sessionStorage to persist across reloads within the same tab/session
        sessionStorage.setItem('referralCode', refCodeFromUrl);
      } catch (error) {
        console.error("Could not write to sessionStorage:", error);
      }
    }
  }, [searchParams]);

  const processStoredReferral = useCallback(async () => {
    try {
      const storedRefCode = sessionStorage.getItem('referralCode');
      console.log('🔍 Stored referral code:', storedRefCode); // DEBUG LOG
      
      if (!storedRefCode) return;
  
      const functions = getFunctions();
      const processFunction = httpsCallable(functions, 'referralProcess');
      
      console.log('🚀 Processing referral with code:', storedRefCode); // DEBUG LOG
      
      const result = await processFunction({ referralCode: storedRefCode });
      
      console.log('✅ Referral processed successfully:', result); // DEBUG LOG
      
      // Clear the code after processing to prevent reuse
      sessionStorage.removeItem('referralCode');
      
      toast({
        title: "Referral Applied!",
        description: "You've received a bonus for joining via a referral link!",
      });
  
    } catch (error: any) {
      console.error("❌ Failed to process stored referral code:", error); // ENHANCED ERROR LOG
      console.error("❌ Error details:", error.message, error.code, error.details); // MORE DETAILS
      
      // Still remove the key to prevent retries
      sessionStorage.removeItem('referralCode');
    }
  }, [toast]);

  const getOrCreateUserDocument = useCallback(async (fbUser: FirebaseUser) => {
    const userDocRef = doc(db, 'users', fbUser.uid);
    let userDoc = await getDoc(userDocRef);
    let isNewUser = false;
  
    if (!userDoc.exists()) {
      isNewUser = true;
      const generatedReferralCode = await generateUniqueReferralCode(fbUser.uid);
      
      // Extract username from email (part before @)
      const extractedName = fbUser.email ? fbUser.email.split('@')[0] : 'User';
      
      const newUser = {
        displayName: fbUser.displayName || extractedName,
        name: fbUser.displayName || extractedName, // Add name field
        email: fbUser.email || '',
        phoneNumber: fbUser.phoneNumber || '',
        providers: { email: !!fbUser.email, phone: !!fbUser.phoneNumber },
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
      
      // Add delay to ensure document is fully created
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // If it's a new user, check for a referral code
    if (isNewUser) {
      console.log('🆕 New user detected, processing referral...'); // DEBUG LOG
      await processStoredReferral();
    }
  
    return userDoc;
  }, [processStoredReferral]);

  const syncUserData = useCallback((fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      setUser(null);
      setBalance(0);
      setReferralCode('');
      setReferrals([]);
      setUserTier('Free');
      setLastClaimTimestamp(null);
      return null;
    }

    const userDocRef = doc(db, 'users', fbUser.uid);
    return onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        
        // Extract username from email as fallback
        const emailUsername = fbUser.email ? fbUser.email.split('@')[0] : 'Anonymous';
        
        setUser({
          uid: fbUser.uid,
          name: userData.name || fbUser.displayName || emailUsername,
          username: userData.username || '',
          avatar: userData.avatar || fbUser.photoURL || PlaceHolderImages[0]?.imageUrl || '/default-avatar.png',
          email: userData.email || fbUser.email || '',
          phoneNumber: userData.phoneNumber || fbUser.phoneNumber || '',
          referredBy: userData.referredBy,
        });
        setBalance(userData.balance || 0);
        setUserTier(userData.plan?.id || 'Free');
        setLastClaimTimestamp(userData.claimStats?.lastClaimAt?.toMillis() || null);
        setReferralCode(userData.referralCode || '');
        setReferrals(userData.referrals || []);
      }
    });
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        await getOrCreateUserDocument(fbUser);
        setFirebaseUser(fbUser);
        setIsLoggedIn(true);
      } else {
        setFirebaseUser(null);
        setIsLoggedIn(false);
      }
      setIsLoading(false);
    });
  
    return () => unsubscribeAuth();
  }, [getOrCreateUserDocument]);

  useEffect(() => {
    const unsubscribeSync = syncUserData(firebaseUser);
    return () => {
      if (unsubscribeSync) unsubscribeSync();
    };
  }, [firebaseUser, syncUserData]);
  
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
    } catch (error: any) {
      const errorMessage = error?.message || 'An unexpected error occurred';
      toast({ variant: 'destructive', title: 'Claim Failed', description: errorMessage });
      return { success: false, message: errorMessage };
    }
  }, [firebaseUser, toast]);

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
    setIsLoggedIn,
    logout, 
    claimTokens
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <AppProviderInternal>{children}</AppProviderInternal>
    </React.Suspense>
  )
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
