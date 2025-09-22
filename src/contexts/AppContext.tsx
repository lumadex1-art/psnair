
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
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, Timestamp } from 'firebase/firestore';
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
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean, error?: string }>;
  registerWithEmail: (email: string, pass: string) => Promise<{ success: boolean, error?: string }>;
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
    console.log('[DEBUG] 1. loadUserDataFromFirestore called for UID:', uid);
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        console.log('[DEBUG] 2. User document exists in Firestore.');
        const userData = userDoc.data();
        
        // Check if balance exists, if not calculate from claims
        if (userData.balance === undefined || userData.balance === null) {
          console.log('[DEBUG] 2a. Balance missing, calculating from claims...');
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
            
          } else {
            setState(prevState => ({
              ...prevState,
              balance: 0,
              userTier: userData.plan?.id || 'Free',
              lastClaimTimestamp: userData.claimStats?.lastClaimAt?.toMillis() || null,
            }));
          }
        } else {
          console.log('[DEBUG] 2b. Balance exists, loading from Firestore data.');
          // Update state with Firestore data directly
          setState(prevState => ({
            ...prevState,
            balance: userData.balance || 0,
            userTier: userData.plan?.id || 'Free',
            lastClaimTimestamp: userData.claimStats?.lastClaimAt?.toMillis() || null,
            referralCode: userData.referralCode || prevState.referralCode,
          }));
          
        }
        return userData;
      } else {
        console.log('[DEBUG] 2. User document does NOT exist. Creating new user document...');
        // Generate unique referral code for new user
        const referralCode = await generateUniqueReferralCode(uid);
        console.log('[DEBUG] 3. Generated unique referral code:', referralCode);
        
        // Create user document with 0 balance and referral code
        const newUserData = {
          balance: 0,
          referralCode: referralCode,
          referralStats: {
            totalReferred: 0,
            totalEarned: 0,
            lastReferralAt: null,
          },
          plan: { id: 'Free', maxDailyClaims: 1, rewardPerClaim: 1 },
          claimStats: {
            todayClaimCount: 0,
            lastClaimDayKey: '',
            lastClaimAt: null,
          },
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date()),
        };
        
        await setDoc(userDocRef, newUserData);
        console.log('[DEBUG] 4. New user document created in Firestore.');
        
        setState(prevState => {
            const finalState = {
                ...prevState,
                balance: 0,
                userTier: 'Free' as UserTier,
                lastClaimTimestamp: null,
                referralCode: referralCode,
            };
            console.log('[DEBUG] 5. Setting state for new user:', finalState);
            return finalState;
        });
        
        return newUserData;
      }
    } catch (error) {
      console.error('[DEBUG] Error in loadUserDataFromFirestore:', error);
      return null;
    }
  }, []);

  // Save state to localStorage after Firestore update
  const saveStateToLocalStorage = useCallback((uid: string, stateToSave: LocalState) => {
    try {
      localStorage.setItem(`epsilonDropState_${uid}`, JSON.stringify(stateToSave));
    } catch (error) {
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log('[DEBUG] onAuthStateChanged triggered. User:', fbUser?.uid || 'null');
      setFirebaseUser(fbUser);
      if (fbUser) {
        setIsLoggedIn(true);
        const storedState = localStorage.getItem(`epsilonDropState_${fbUser.uid}`);
        
        const displayName = fbUser.displayName || fbUser.email || 'User';
        const newUser: User = {
            uid: fbUser.uid,
            name: displayName,
            username: fbUser.email?.split('@')[0] || 'user',
            avatar: fbUser.photoURL || generateAvatarUrl(displayName),
        };
        setUser(newUser);

        if (storedState) {
          const parsedState = JSON.parse(storedState);
          // Load from localStorage first for fast UI
          setState({...parsedState, user: newUser});
        }
        
        // Always load fresh data from Firestore to ensure accuracy
        const firestoreData = await loadUserDataFromFirestore(fbUser.uid);
        if (firestoreData) {
          // Update state and localStorage with fresh Firestore data
          setState(prevState => {
            const updatedState = {
              ...prevState,
              user: newUser,
              balance: firestoreData.balance || 0,
              userTier: firestoreData.plan?.id || 'Free',
              lastClaimTimestamp: firestoreData.claimStats?.lastClaimAt?.toMillis() || null,
              referralCode: firestoreData.referralCode || prevState.referralCode,
            };
            console.log('[DEBUG] Final state update (existing user):', updatedState);
            saveStateToLocalStorage(fbUser.uid, updatedState);
            return updatedState;
          });
        } else if (storedState) {
          // If no Firestore data but localStorage has balance, migrate it
          const parsedState = JSON.parse(storedState);
          if (parsedState.balance && parsedState.balance > 0) {
            await migrateUserBalanceToFirestore(fbUser.uid, parsedState.balance);
            // Reload after migration
            await loadUserDataFromFirestore(fbUser.uid);
          }
        } else {
            // New user, no local state. Firestore document has been created.
            setState(prevState => {
              const newState = {
                ...initialState,
                user: newUser,
                referralCode: firestoreData?.referralCode || generateReferralCode(fbUser.uid),
                balance: firestoreData?.balance || 0,
                userTier: firestoreData?.plan?.id || 'Free',
                lastClaimTimestamp: firestoreData?.claimStats?.lastClaimAt?.toMillis() || null,
              };
              console.log('[DEBUG] Final state update (new user fallback):', newState);
              saveStateToLocalStorage(fbUser.uid, newState);
              return newState;
          });
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

  const login = useCallback(async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error('[DEBUG] Login error:', error);
      setIsLoading(false);
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, []);

  const registerWithEmail = useCallback(async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle user creation in Firestore
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
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
            const planFeatures = PLAN_CONFIG.FEATURES[prevState.userTier] || PLAN_CONFIG.FEATURES['Free'];
            const rewardAmount = planFeatures?.maxDailyClaims > 1 ? 10 : 1;
            
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
            const planFeatures = PLAN_CONFIG.FEATURES[prevState.userTier] || PLAN_CONFIG.FEATURES['Free'];
            const fallbackReward = planFeatures?.maxDailyClaims > 1 ? 10 : 1;
            
            const newState = {
              ...prevState,
              balance: prevState.balance + fallbackReward,
              lastClaimTimestamp: Date.now(),
            };
            
            saveStateToLocalStorage(firebaseUser.uid, newState);
            return newState;
          });
        }
        return { success: true, message: data.message || 'Claimed successfully' };
      }
      return { success: false, message: data.message || 'Claim failed' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Network error' };
    }
 }, [firebaseUser, loadUserDataFromFirestore, saveStateToLocalStorage]);


  const purchasePlan = useCallback((plan: UserTier) => {
    setState((prevState) => ({ ...prevState, userTier: plan }));
  }, []);

  const value = { ...state, user, isLoggedIn, isLoading, login, loginWithEmail, registerWithEmail, logout, claimTokens, purchasePlan };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

    