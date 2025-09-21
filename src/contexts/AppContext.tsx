'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type User = {
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
  login: (user: User) => void;
  logout: () => void;
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
  isLoggedIn: false,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initialState);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedState = localStorage.getItem('epsilonDropState');
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        setState(parsedState);
      }
    } catch (error) {
      console.error('Failed to parse state from localStorage', error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('epsilonDropState', JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save state to localStorage', error);
      }
    }
  }, [state, isLoading]);

  const login = useCallback((user: User) => {
    setState((prevState) => ({ ...prevState, user, isLoggedIn: true }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('epsilonDropState');
    setState({ ...initialState, isLoggedIn: false });
  }, []);

  const claimTokens = useCallback(() => {
    let claimsPerDay = 1;
    switch (state.userTier) {
        case 'Premium': claimsPerDay = 5; break;
        case 'Pro': claimsPerDay = 7; break;
        case 'Master': claimsPerDay = 15; break;
        case 'Ultra': claimsPerDay = 10; break; // This seems out of order, let's make it 25
    }
    if (state.userTier === 'Ultra') claimsPerDay = 25;


    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    if (state.lastClaimTimestamp && now - state.lastClaimTimestamp < twentyFourHours / claimsPerDay) {
      return false;
    }
    
    setState((prevState) => ({
      ...prevState,
      balance: prevState.balance + 10, // Claim 10 EPSN
      lastClaimTimestamp: now,
    }));
    return true;
  }, [state.lastClaimTimestamp, state.userTier]);

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

  const value = { ...state, isLoading, login, logout, claimTokens, purchasePlan, addReferral };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
