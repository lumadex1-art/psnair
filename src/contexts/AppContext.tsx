'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { auth } from '@/lib/firebase';
import { User as FirebaseUser, onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';


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
  login: (userInfo: Omit<User, 'uid'>) => Promise<void>;
  logout: () => Promise<void>;
  claimTokens: () => boolean;
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
        // User is signed in.
        setIsLoggedIn(true);
        // Load user data from localStorage
        const storedState = localStorage.getItem(`epsilonDropState_${fbUser.uid}`);
        if (storedState) {
          const parsedState = JSON.parse(storedState);
          setState(parsedState);
          setUser(parsedState.user);
        } else {
           const newUser: User = {
            uid: fbUser.uid,
            name: 'Test User',
            username: '@testuser',
            avatar: 'https://picsum.photos/seed/user/100/100',
          };
          setUser(newUser);
          setState((s) => ({ ...s, user: newUser }));
        }
      } else {
        // User is signed out.
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

  const login = useCallback(async (userInfo: Omit<User, 'uid'>) => {
    setIsLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const newUser: User = {
        uid: userCredential.user.uid,
        ...userInfo,
      };
      setUser(newUser);
      setState(prevState => ({ ...prevState, user: newUser }));
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Error signing in anonymously", error);
    } finally {
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

  const claimTokens = useCallback(() => {
    let claimsPerDay = 1;
    switch (state.userTier) {
        case 'Premium': claimsPerDay = 5; break;
        case 'Pro': claimsPerDay = 7; break;
        case 'Master': claimsPerDay = 15; break;
        case 'Ultra': claimsPerDay = 25; break;
    }

    const now = Date.now();
    const cooldownDuration = (24 * 60 * 60 * 1000) / claimsPerDay;
    
    if (state.lastClaimTimestamp && now - state.lastClaimTimestamp < cooldownDuration) {
      return false;
    }
    
    setState((prevState) => ({
      ...prevState,
      balance: prevState.balance + 10, // Claim 10 EPSN
      lastClaimTimestamp: now,
    }));
    return true;
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
