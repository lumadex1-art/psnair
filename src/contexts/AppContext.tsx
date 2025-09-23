
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
import { User as FirebaseUser, onAuthStateChanged, signInWithCustomToken, signOut, UserCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { clearAllDummyData, isDummyUser } from '@/utils/clearDummyData';
import { migrateUserBalanceToFirestore } from '@/utils/migrateBalance';
import { printBalanceDebug } from '@/utils/balanceDebug';
import { calculateUserBalance, verifyBalanceConsistency } from '@/utils/balanceCalculator';
import { generateUniqueReferralCode } from '@/utils/referralCode';
import { PLAN_CONFIG } from '@/lib/config';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

// Helper functions for real user data
const generateAvatarUrl = (name: string): string => {
  const cleanName = encodeURIComponent(name.trim());
  return `https://api.dicebear.com/7.x/initials/svg?seed=${cleanName}&backgroundColor=6366f1&textColor=ffffff`;
};

const generateReferralCode = (uid: string): string => {
  const hash = uid.slice(-8).toUpperCase();
  return `EPS${hash}`;
};


type User = {
  uid: string;
  name: string;
  username: string;
  avatar: string;
};

type Referral = {
  name: string;
  avatar: string;
};

type UserTier = keyof typeof PLAN_CONFIG.PRICES;

type LocalState = {
  user: User | null;
  balance: number;
  referralCode: string;
  referrals: Referral[];
  userTier: UserTier;
  lastClaimTimestamp: number | null;
};

type AppState = {
  user: User | null;
  balance: number;
  referralCode: string;
  referrals: Referral[];
  userTier: UserTier;
  lastClaimTimestamp: number | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  claimTokens: () => Promise<{success: boolean, message: string}>;
  purchasePlan: (plan: UserTier) => void;
};

const AppContext = createContext<AppState | undefined>(undefined);

const initialState: LocalState = {
  user: null,
  balance: 0,
  referralCode: '',
  referrals: [],
  userTier: 'Free' as UserTier,
  lastClaimTimestamp: null,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [state, setState] = useState<LocalState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { connected, publicKey, disconnect } = useWallet();

  // Load user data from Firestore
  const loadUserDataFromFirestore = useCallback(async (uid: string) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setState(prevState => ({
          ...prevState,
          balance: userData.balance || 0,
          userTier: userData.plan?.id || 'Free',
          lastClaimTimestamp: userData.claimStats?.lastClaimAt?.toMillis() || null,
          referralCode: userData.referralCode || prevState.referralCode,
        }));
        return userData;
      } else {
        const referralCode = await generateUniqueReferralCode(uid);
        const newUserData = {
          balance: 0,
          referralCode: referralCode,
          referralStats: { totalReferred: 0, totalEarned: 0, lastReferralAt: null },
          plan: { id: 'Free', maxDailyClaims: 1, rewardPerClaim: 1 },
          claimStats: { todayClaimCount: 0, lastClaimDayKey: '', lastClaimAt: null },
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date()),
        };
        await setDoc(userDocRef, newUserData);
        setState(prevState => ({
          ...prevState,
          balance: 0,
          userTier: 'Free' as UserTier,
          lastClaimTimestamp: null,
          referralCode: referralCode,
        }));
        return newUserData;
      }
    } catch (error) {
      console.error('Error loading/creating user document:', error);
      return null;
    }
  }, []);

  // Effect to handle wallet connection state changes
  useEffect(() => {
    const handleAuth = async () => {
      if (connected && publicKey) {
        setIsLoading(true);
        try {
          // This is a placeholder for a real backend call
          // In a real app, you would send publicKey.toBase58() to your backend,
          // verify it, and get a custom Firebase token.
          // For this prototype, we'll simulate this by creating a UID from the public key.
          const uid = publicKey.toBase58();

          // Simulate getting a custom token. In a real app, this would be a fetch call.
          // For simplicity, we directly create a user. This is NOT secure for production.
          // The correct way is `signInWithCustomToken(auth, customTokenFromServer)`
          
          const displayName = `${uid.slice(0, 4)}...${uid.slice(-4)}`;
          const newUser: User = {
            uid: uid,
            name: displayName,
            username: displayName,
            avatar: generateAvatarUrl(uid),
          };
          
          setUser(newUser);
          setIsLoggedIn(true);
          await loadUserDataFromFirestore(uid);

        } catch (error) {
          console.error("Wallet login error:", error);
          setIsLoggedIn(false);
          setUser(null);
          await disconnect();
        } finally {
          setIsLoading(false);
        }
      } else {
        // Wallet disconnected
        setIsLoggedIn(false);
        setUser(null);
        setFirebaseUser(null); // Clear firebase user as well
        setState(initialState);
        setIsLoading(false);
      }
    };

    handleAuth();
  }, [connected, publicKey, disconnect, loadUserDataFromFirestore]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await disconnect(); // This will trigger the useEffect to clear state
    // state is cleared inside the useEffect when `connected` becomes false
    setIsLoading(false);
  }, [disconnect]);

 const claimTokens = useCallback(async (): Promise<{success: boolean, message: string}> => {
    try {
      if (!user) { // Check for internal user state
        return { success: false, message: 'Please connect your wallet first' };
      }

      const idempotencyKey = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      // In a real app with custom tokens, you would get the ID token here.
      // const token = await firebaseUser.getIdToken();
      // For this wallet-only approach, we pass the UID (publicKey) for identification.
      
      const { httpsCallable } = await import('firebase/functions');
      const { getFunctions } = await import('firebase/functions');
      const functions = getFunctions();
      const claimFunction = httpsCallable(functions, 'claim');
      
      // The backend needs to be adapted to trust the UID without a JWT,
      // or a proper custom token flow must be implemented.
      // For now, we assume the 'claim' function can be called this way.
      // A more secure way: the function would get UID from context if using custom tokens.
      
      // This call might fail if the function expects a Firebase Auth context,
      // which we are bypassing.
      // A dummy auth object is passed to satisfy onCall's internal checks if needed.
      const result = await claimFunction({ idempotencyKey, uid: user.uid });
      
      const data = result.data as any;
      
      if (data.success) {
        await loadUserDataFromFirestore(user.uid);
        return { success: true, message: data.message || 'Claimed successfully' };
      }
      return { success: false, message: data.message || 'Claim failed' };
    } catch (e: any) {
      console.error("Claim error:", e);
      // This is a common error if the callable function expects an auth context
      if (e.code === 'unauthenticated') {
        return { success: false, message: 'Authentication error. Please reconnect your wallet.' };
      }
      return { success: false, message: e?.message || 'Network error' };
    }
 }, [user, loadUserDataFromFirestore]);


  const purchasePlan = useCallback((plan: UserTier) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    updateDoc(userDocRef, { "plan.id": plan });
    setState((prevState) => ({ ...prevState, userTier: plan }));
  }, [user]);

  const value = { ...state, user, isLoggedIn, isLoading, logout, claimTokens, purchasePlan };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
