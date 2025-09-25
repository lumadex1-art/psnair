
/**
 * Application Configuration
 * 
 * 🔒 SENSITIVE data → Environment variables (.env)
 * 📊 PUBLIC data → This file (safe to commit)
 */

// ===== PUBLIC CONFIGURATION (Safe to commit) =====

/**
 * Solana Network Configuration
 */
export const SOLANA_CONFIG = {
  // Public wallet address (safe to expose)
  MERCHANT_WALLET: process.env.NEXT_PUBLIC_MERCHANT_WALLET || "Fj86LrcDNkiDRs3rQs4dZEDaj769N8bTTvipANV8vBby",
  
  // Network settings (public)
  NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK || "mainnet-beta",
  
  // RPC endpoints - Use environment variables for security
  RPC_ENDPOINTS: {
    mainnet: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    devnet: "https://api.devnet.solana.com",
    testnet: "https://api.testnet.solana.com",
  },
} as const;

/**
 * Plan Pricing Configuration (Public)
 */
export const PLAN_CONFIG = {
  // Plan prices in SOL (public information) - Synced with backend
  PRICES: {
    Free: 0,
    Starter: 0.0183486,    // ✅ TAMBAHKAN: Sesuai backend
    Silver: 0.0367,
    Gold: 0.0734,
    Platinum: 0.2064, 
    Diamond: 0.4128,
  },
  
  // Plan features (public) - Synced with backend plans.ts
  FEATURES: {
    Free: {
      maxDailyClaims: 1,
      rewardPerClaim: 1,
      features: ['1 EPSN per day', 'Basic Support'],
    },
    Starter: {                // ✅ TAMBAHKAN: Sesuai backend
      maxDailyClaims: 1,
      rewardPerClaim: 5,
      features: ['5 EPSN per day', 'Priority Support'],
    },
    Silver: {
      maxDailyClaims: 1,
      rewardPerClaim: 10,
      features: ['10 EPSN per day', 'Faster Cooldowns', 'Priority Support'],
    },
    Gold: {
      maxDailyClaims: 1,
      rewardPerClaim: 20,
      features: ['20 EPSN per day', 'Exclusive Tools Access', 'Master Badge'],
    },
    Platinum: {
      maxDailyClaims: 1,
      rewardPerClaim: 50,
      features: ['50 EPSN per day', 'All Exclusive Tools', 'Ultra Community Access', 'Highest Priority Support'],
    },
    Diamond: {
      maxDailyClaims: 1,
      rewardPerClaim: 100,
      features: ['100 EPSN per day', 'All Exclusive Tools', 'Ultra Community Access', 'Highest Priority Support'],
    },
  },
} as const;

/**
 * Referral System Configuration (Public)
 */
export const REFERRAL_CONFIG = {
  // Reward amounts (public)
  REWARDS: {
    referrer: 1,      // EPSN for referrer
    referee: 10,       // EPSN for referee
  },
  
  // Code settings (public)
  CODE_LENGTH: 6,
  EXCLUDED_CHARS: ['0', 'O', 'I', 'L', '1'],
  ALLOWED_CHARS: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
  
  // Limits (public)
  MAX_REFERRALS_PER_USER: parseInt(process.env.MAX_REFERRALS_PER_USER || '100'),
} as const;

/**
 * UI/UX Configuration (Public)
 */
export const UI_CONFIG = {
  // App branding (public)
  APP_NAME: "EpsilonDrop",
  APP_DESCRIPTION: "Claim your daily EPSN tokens",
  
  // Theme settings (public)
  DEFAULT_THEME: "dark",
  
  // Animation settings (public)
  ANIMATION_DURATION: 200,
  
  // Pagination (public)
  ITEMS_PER_PAGE: 20,
} as const;

/**
 * Rate Limiting Configuration (Public)
 */
export const RATE_LIMIT_CONFIG = {
  // Claim limits (public)
  CLAIM_COOLDOWN_MS: 24 * 60 * 60 * 1000, // 24 hours
  
  // API limits (public)
  MAX_REQUESTS_PER_MINUTE: 60,
  
  // Referral limits (public)
  MAX_REFERRAL_ATTEMPTS_PER_DAY: 5,
} as const;

/**
 * Development Configuration (Public)
 */
export const DEV_CONFIG = {
  // Debug settings
  ENABLE_DEBUG: process.env.NODE_ENV === 'development',
  ENABLE_CONSOLE_LOGS: process.env.NODE_ENV === 'development',
  
  // Testing settings
  ENABLE_TEST_MODE: process.env.NODE_ENV === 'test',
  
  // Analytics
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true',
} as const;

// ===== DERIVED CONFIGURATION =====

/**
 * Get current Solana RPC endpoint
 */
export const getCurrentRpcEndpoint = () => {
  return SOLANA_CONFIG.RPC_ENDPOINTS[
    SOLANA_CONFIG.NETWORK as keyof typeof SOLANA_CONFIG.RPC_ENDPOINTS
  ];
};

/**
 * Get plan price in lamports
 */
export const getPlanPriceInLamports = (planId: keyof typeof PLAN_CONFIG.PRICES) => {
  const priceInSol = PLAN_CONFIG.PRICES[planId];
  return Math.ceil(priceInSol * 1_000_000_000); // Convert SOL to lamports
};

/**
 * Check if plan is premium (paid)
 */
export const isPremiumPlan = (planId: string) => {
  return planId !== 'Free' && planId in PLAN_CONFIG.PRICES;
};

/**
 * Get plan features
 */
export const getPlanFeatures = (planId: keyof typeof PLAN_CONFIG.FEATURES) => {
  return PLAN_CONFIG.FEATURES[planId] || PLAN_CONFIG.FEATURES.Free;
};

// ===== TYPE EXPORTS =====

export type PlanId = keyof typeof PLAN_CONFIG.PRICES;
export type SolanaNetwork = keyof typeof SOLANA_CONFIG.RPC_ENDPOINTS;

// ===== VALIDATION =====

/**
 * Validate configuration on app startup
 */
export const validateConfig = () => {
  const errors: string[] = [];
  
  // Check required environment variables
  if (!process.env.NEXT_PUBLIC_MERCHANT_WALLET) {
    errors.push('NEXT_PUBLIC_MERCHANT_WALLET is required');
  }
  
  // Validate Solana network
  if (!['mainnet-beta', 'devnet', 'testnet'].includes(SOLANA_CONFIG.NETWORK)) {
    errors.push('Invalid SOLANA_NETWORK');
  }
  
  // Validate plan prices
  Object.entries(PLAN_CONFIG.PRICES).forEach(([plan, price]) => {
    if (typeof price !== 'number' || price < 0) {
      errors.push(`Invalid price for plan ${plan}: ${price}`);
    }
  });
  
  if (errors.length > 0) {
    throw new Error('Invalid configuration');
  }
  
};
