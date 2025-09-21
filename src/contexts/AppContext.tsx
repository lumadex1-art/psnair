'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { auth, googleProvider } from '@/lib/firebase';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { secureClaimTokens } from '@/app/actions';


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

type UserTier = 'Free' | 'Premium' | 'Pro' | 'Master' | 'Ultra';

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
  addReferral: () => void;
};

const AppContext = createContext<AppState | undefined>(undefined);

const initialState = {
  user: null,
  balance: 0,
  referralCode: 'EPSILON42',
  referrals: [],
  userTier: 'Free' as UserTier,
  lastClaimTimestamp: null,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [state, setState] = useState(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setIsLoggedIn(true);
        const storedState = localStorage.getItem(`epsilonDropState_${fbUser.uid}`);
        if (storedState) {
          const parsedState = JSON.parse(storedState);
          setState(parsedState);
          setUser(parsedState.user);
        } else {
           const newUser: User = {
            uid: fbUser.uid,
            name: fbUser.displayName || 'Test User',
            username: fbUser.email || '@testuser',
            avatar: fbUser.photoURL || 'https://picsum.photos/seed/user/100/100',
          };
          setUser(newUser);
          const newState = { ...initialState, user: newUser };
          setState(newState);
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

 const claimTokens = useCallback(async (): Promise<{success: boolean, message: string}> => {
    const result = await secureClaimTokens(state.lastClaimTimestamp, state.userTier);
    
    if (result.success && result.newTimestamp) {
        setState((prevState) => ({
            ...prevState,
            balance: prevState.balance + 10,
            lastClaimTimestamp: result.newTimestamp,
        }));
    }
    
    return { success: result.success, message: result.message };
}, [state.userTier, state.lastClaimTimestamp]);


  const purchasePlan = useCallback((plan: UserTier) => {
    setState((prevState) => ({ ...prevState, userTier: plan }));
  }, []);

  const addReferral = useCallback(() => {
     if (state.referrals.length >= 5) return;
     const newReferral = {
        name: `Referral #${state.referrals.length + 1}`,
        avatar: PlaceHolderImages[state.referrals.length % PlaceHolderImages.length].imageUrl,
     }
     setState(prevState => ({ ...prevState, referrals: [...prevState.referrals, newReferral]}));
  }, [state.referrals]);

  const value = { ...state, user, isLoggedIn, isLoading, login, logout, claimTokens, purchasePlan, addReferral };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
