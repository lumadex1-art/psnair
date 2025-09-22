
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { auth, googleProvider, db } from '@/lib/firebase';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { clearAllDummyData, isDummyUser } from '@/utils/clearDummyData';
import { migrateUserBalanceToFirestore } from '@/utils/migrateBalance';
import { printBalanceDebug } from '@/utils/balanceDebug';
import { calculateUserBalance, verifyBalanceConsistency } from '@/utils/balanceCalculator';
import { generateUniqueReferralCode } from '@/utils/referralCode';
import { PLAN_CONFIG } from '@/lib/config';

// Helper functions for real user data
const generateAvatarUrl = (name: string): string => {
  // Use DiceBear API for consistent, beautiful avatars based on name
  const cleanName = encodeURIComponent(name.trim());
  return `https://api.dicebear.com/7.x/initials/svg?seed=${cleanName}&backgroundColor=6366f1&textColor=ffffff`;
};

const generateReferralCode = (uid: string): string => {
  // Generate referral code from user ID
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
  login: () => Promise<void>;
  logout: () => Promise<void>;
  claimTokens: () => Promise<{success: boolean, message: string}>;
  purchasePlan: (plan: UserTier) => void;
};

const AppContext = createContext<AppState | undefined>(undefined);

const initialState: LocalState = {
  user: null,
  balance: 0,
  referralCode: '', // Will be generated based on user ID
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

  // Load user data from Firestore - Simple approach
  const loadUserDataFromFirestore = useCallback(async (uid: string) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Check if balance exists, if not calculate from claims
        if (userData.balance === undefined || userData.balance === null) {
          if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ No balance field found, calculating from claims...');
          }
          
          // Calculate balance from claims collection
          const balanceCalculation = await calculateUserBalance(uid);
          
          if (balanceCalculation) {
            // Update state with calculated balance
            setState(prevState => ({
              ...prevState,
              balance: balanceCalculation.totalBalance,
              userTier: userData.plan?.id || 'Free',
              lastClaimTimestamp: userData.claimStats?.lastClaimAt?.toMillis() || null,
            }));
            
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Balance calculated from claims:', balanceCalculation.totalBalance);
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.error('❌ Failed to calculate balance from claims');
            }
            setState(prevState => ({
              ...prevState,
              balance: 0,
              userTier: userData.plan?.id || 'Free',
              lastClaimTimestamp: userData.claimStats?.lastClaimAt?.toMillis() || null,
            }));
          }
        } else {
          // Update state with Firestore data directly
          setState(prevState => ({
            ...prevState,
            balance: userData.balance || 0,
            userTier: userData.plan?.id || 'Free',
            lastClaimTimestamp: userData.claimStats?.lastClaimAt?.toMillis() || null,
            referralCode: userData.referralCode || prevState.referralCode,
          }));
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Balance loaded from users collection:', userData.balance || 0, 'EPSN');
          }
        }
        return userData;
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ No user document found, creating with 0 balance');
        }
        
        // Generate unique referral code for new user
        const referralCode = await generateUniqueReferralCode(uid);
        
        // Create user document with 0 balance and referral code
        const newUserData = {
          balance: 0,
          referralCode: referralCode,
          referralStats: {
            totalReferred: 0,
            totalEarned: 0,
            lastReferralAt: null,
          },
          plan: { id: 'Free', maxDailyClaims: 1 },
          claimStats: {
            todayClaimCount: 0,
            lastClaimDayKey: '',
            lastClaimAt: null,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await setDoc(userDocRef, newUserData);
        
        setState(prevState => ({
          ...prevState,
          balance: 0,
          userTier: 'Free',
          lastClaimTimestamp: null,
          referralCode: referralCode,
        }));
        
        return newUserData;
      }
    } catch (error) {
      console.error('❌ Error loading user data from Firestore:', error);
      return null;
    }
  }, []);

  // Save state to localStorage after Firestore update
  const saveStateToLocalStorage = useCallback((uid: string, stateToSave: LocalState) => {
    try {
      localStorage.setItem(`epsilonDropState_${uid}`, JSON.stringify(stateToSave));
      console.log('State saved to localStorage');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setIsLoggedIn(true);
        const storedState = localStorage.getItem(`epsilonDropState_${fbUser.uid}`);
        if (storedState) {
          const parsedState = JSON.parse(storedState);
          
          // Check if stored user data contains dummy data and needs refresh
          if (isDummyUser(parsedState.user)) {
            // Refresh with real Firebase Auth data
            const displayName = fbUser.displayName || fbUser.email || 'User';
            const newUser: User = {
              uid: fbUser.uid,
              name: displayName,
              username: fbUser.email?.split('@')[0] || 'user',
              avatar: fbUser.photoURL || generateAvatarUrl(displayName),
            };
            setUser(newUser);
            const newState: LocalState = { 
              ...parsedState, 
              user: newUser,
              referralCode: generateReferralCode(fbUser.uid)
            };
            setState(newState);
          } else {
            // Load from localStorage first for fast UI
            setState(parsedState);
            setUser(parsedState.user);
          }
          
          // Always load fresh data from Firestore to ensure accuracy
          const firestoreData = await loadUserDataFromFirestore(fbUser.uid);
          if (firestoreData) {
            // Update localStorage with fresh Firestore data
            const updatedState = {
              ...parsedState,
              balance: firestoreData.balance || 0,
              userTier: firestoreData.plan?.id || 'Free',
              lastClaimTimestamp: firestoreData.claimStats?.lastClaimAt?.toMillis() || null,
            };
            saveStateToLocalStorage(fbUser.uid, updatedState);
          } else {
            // If no Firestore data but localStorage has balance, migrate it
            if (parsedState.balance && parsedState.balance > 0) {
              console.log('Migrating localStorage balance to Firestore:', parsedState.balance);
              await migrateUserBalanceToFirestore(fbUser.uid, parsedState.balance);
              // Reload after migration
              await loadUserDataFromFirestore(fbUser.uid);
            }
          }
          
          // Debug balance consistency in development
          if (process.env.NODE_ENV === 'development') {
            setTimeout(() => printBalanceDebug(fbUser.uid), 1000);
          }
        } else {
          // Create user from real Firebase Auth data - prioritize email if no displayName
          const displayName = fbUser.displayName || fbUser.email || 'User';
          const newUser: User = {
            uid: fbUser.uid,
            name: displayName,
            username: fbUser.email?.split('@')[0] || 'user',
            avatar: fbUser.photoURL || generateAvatarUrl(displayName),
          };
          setUser(newUser);
          
          // For new users, load from Firestore first, then create state
          const firestoreData = await loadUserDataFromFirestore(fbUser.uid);
          const newState: LocalState = { 
            ...initialState, 
            user: newUser,
            referralCode: generateReferralCode(fbUser.uid),
            balance: firestoreData?.balance || 0,
            userTier: firestoreData?.plan?.id || 'Free',
            lastClaimTimestamp: firestoreData?.claimStats?.lastClaimAt?.toMillis() || null,
          };
          setState(newState);
          saveStateToLocalStorage(fbUser.uid, newState);
        }
      } else {
        setUser(null);
        setIsLoggedIn(false);
        setState(initialState);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading && firebaseUser) {
      try {
        const fullState = { ...state, user };
        localStorage.setItem(`epsilonDropState_${firebaseUser.uid}`, JSON.stringify(fullState));
      } catch (error) {
        console.error('Failed to save state to localStorage', error);
      }
    }
  }, [state, user, firebaseUser, isLoading]);

  const login = useCallback(async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error("Error signing in with Google", error);
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    if (firebaseUser) {
      localStorage.removeItem(`epsilonDropState_${firebaseUser.uid}`);
    }
    await signOut(auth);
    setUser(null);
    setIsLoggedIn(false);
    setState(initialState);
    setIsLoading(false);
  }, [firebaseUser]);

  // Clear dummy data on app start
  useEffect(() => {
    clearAllDummyData();
  }, []);

 const claimTokens = useCallback(async (): Promise<{success: boolean, message: string}> => {
    try {
      if (!firebaseUser) {
        return { success: false, message: 'Please login first' };
      }
      
      const rewardAmount = state.userTier === 'Free' ? 1 : 10;

      // Simple idempotency key
      const idempotencyKey = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      // Get Firebase ID token
      const token = await firebaseUser.getIdToken();
      
      // Call Firebase Function
      const { httpsCallable } = await import('firebase/functions');
      const { getFunctions } = await import('firebase/functions');
      const functions = getFunctions();
      const claimFunction = httpsCallable(functions, 'claim');
      
      const result = await claimFunction({ idempotencyKey });
      const data = result.data as any;
      
      if (data.success) {
        // Load fresh balance from Firestore after successful claim
        const firestoreData = await loadUserDataFromFirestore(firebaseUser.uid);
        
        if (firestoreData) {
          // Update state with fresh calculated balance
          setState((prevState) => {
            const newState = {
              ...prevState,
              balance: firestoreData.balance || prevState.balance + rewardAmount,
              lastClaimTimestamp: firestoreData.claimStats?.lastClaimAt?.toMillis() || Date.now(),
            };
            
            // Save updated state to localStorage
            saveStateToLocalStorage(firebaseUser.uid, newState);
            
            return newState;
          });
        } else {
          // Fallback to local update if Firestore fails
          setState((prevState) => {
             const fallbackReward = prevState.userTier === 'Free' ? 1 : 10;
            const newState = {
              ...prevState,
              balance: prevState.balance + fallbackReward,
              lastClaimTimestamp: Date.now(),
            };
            
            saveStateToLocalStorage(firebaseUser.uid, newState);
            return newState;
          });
        }
        return { success: true, message: data.message || `Claimed ${rewardAmount} EPSN successfully` };
      }
      return { success: false, message: data.message || 'Claim failed' };
    } catch (e: any) {
      console.error('Claim error:', e);
      return { success: false, message: e?.message || 'Network error' };
    }
 }, [firebaseUser, state.userTier, loadUserDataFromFirestore, saveStateToLocalStorage]);


  const purchasePlan = useCallback((plan: UserTier) => {
    setState((prevState) => ({ ...prevState, userTier: plan }));
  }, []);

  const value = { ...state, user, isLoggedIn, isLoading, login, logout, claimTokens, purchasePlan };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
