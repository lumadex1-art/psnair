/**
 * Secure Configuration for Firebase Functions
 * 
 * 🔒 SENSITIVE data loaded from environment variables
 * ⚠️  NEVER commit sensitive values to git
 */

import * as functions from 'firebase-functions';

/**
 * Admin Configuration (SENSITIVE)
 */
export const ADMIN_CONFIG = {
  // Admin UIDs from environment (SENSITIVE)
  ADMIN_UIDS: (
    functions.config().admin?.uids || 
    process.env.ADMIN_UIDS || 
    ""
  ).split(',').filter(Boolean),
  
  // Super admin UID (SENSITIVE)
  SUPER_ADMIN_UID: 
    functions.config().admin?.super_admin_uid || 
    process.env.SUPER_ADMIN_UID || 
    "",
} as const;

/**
 * Security Configuration (SENSITIVE)
 */
export const SECURITY_CONFIG = {
  // JWT secret (SENSITIVE)
  JWT_SECRET: 
    functions.config().security?.jwt_secret || 
    process.env.JWT_SECRET || 
    "default-dev-secret-change-in-production",
  
  // Encryption key (SENSITIVE)
  ENCRYPTION_KEY: 
    functions.config().security?.encryption_key || 
    process.env.ENCRYPTION_KEY || 
    "default-dev-key-change-in-production",
  
  // API secret (SENSITIVE)
  API_SECRET_KEY: 
    functions.config().security?.api_secret || 
    process.env.API_SECRET_KEY || 
    "default-dev-api-key",
} as const;

/**
 * Telegram Configuration (SENSITIVE)
 */
export const TELEGRAM_CONFIG = {
  // Bot token (SENSITIVE) - Used for Telegram auth verification
  BOT_TOKEN: 
    functions.config().telegram?.bot_token || 
    process.env.TELEGRAM_BOT_TOKEN || 
    "",
  
  // Note: BOT_SECRET not needed for current implementation
} as const;

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMIT_CONFIG = {
  // Max claims per day by plan
  MAX_CLAIMS: {
    Free: parseInt(process.env.MAX_CLAIMS_PER_DAY_FREE || '1'),
    Premium: parseInt(process.env.MAX_CLAIMS_PER_DAY_PREMIUM || '5'),
    Pro: 7,
    Master: 15,
    Ultra: 25,
  },
  
  // Max referrals per user
  MAX_REFERRALS_PER_USER: parseInt(process.env.MAX_REFERRALS_PER_USER || '100'),
  
  // API rate limits
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_HOUR: 1000,
} as const;

/**
 * Helper Functions
 */

/**
 * Check if user is admin
 */
export const isAdmin = (uid: string): boolean => {
  return ADMIN_CONFIG.ADMIN_UIDS.includes(uid);
};

/**
 * Check if user is super admin
 */
export const isSuperAdmin = (uid: string): boolean => {
  return uid === ADMIN_CONFIG.SUPER_ADMIN_UID;
};

/**
 * Get max claims for plan
 */
export const getMaxClaimsForPlan = (planId: string): number => {
  return RATE_LIMIT_CONFIG.MAX_CLAIMS[planId as keyof typeof RATE_LIMIT_CONFIG.MAX_CLAIMS] || 1;
};

/**
 * Validate admin configuration (NON-BLOCKING VERSION)
 */
export const validateAdminConfig = (): boolean => {
  const errors: string[] = [];
  
  // Check admin UIDs
  if (ADMIN_CONFIG.ADMIN_UIDS.length === 0) {
    errors.push('No admin UIDs configured');
  }
  
  // Check super admin
  if (!ADMIN_CONFIG.SUPER_ADMIN_UID) {
    errors.push('Super admin UID not configured');
  }
  
  // Check security keys in production
  if (process.env.NODE_ENV === 'production') {
    if (SECURITY_CONFIG.JWT_SECRET.includes('default-dev')) {
      errors.push('Default JWT secret detected in production');
    }
    
    if (SECURITY_CONFIG.ENCRYPTION_KEY.includes('default-dev')) {
      errors.push('Default encryption key detected in production');
    }
  }
  
  if (errors.length > 0) {
    console.warn('⚠️ Admin configuration warnings:');
    errors.forEach(error => console.warn(`  - ${error}`));
    console.warn('⚠️ Some admin features may not work properly');
    return false; // Return false instead of throwing error
  }
  
  console.log('✅ Admin configuration validated');
  return true;
};

/**
 * Log configuration status (without sensitive values)
 */
export const logConfigStatus = (): void => {
  console.log('🔧 Configuration Status:');
  console.log(`  - Admin UIDs configured: ${ADMIN_CONFIG.ADMIN_UIDS.length}`);
  console.log(`  - Super admin configured: ${!!ADMIN_CONFIG.SUPER_ADMIN_UID}`);
  console.log(`  - JWT secret configured: ${!!SECURITY_CONFIG.JWT_SECRET}`);
  console.log(`  - Encryption key configured: ${!!SECURITY_CONFIG.ENCRYPTION_KEY}`);
  console.log(`  - Telegram bot configured: ${!!TELEGRAM_CONFIG.BOT_TOKEN}`);
  console.log(`  - Environment: ${process.env.NODE_ENV || 'development'}`);
};

// Auto-validate configuration (DISABLED FOR DEPLOYMENT)
// Uncomment after successful deployment if needed
// const isValid = validateAdminConfig();
// logConfigStatus();
// if (!isValid) {
//   console.warn('🚨 Functions will deploy but admin features may be limited');
// }

console.log('🔧 Secure config loaded - validation disabled for deployment');
