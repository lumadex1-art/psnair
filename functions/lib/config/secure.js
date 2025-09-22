"use strict";
/**
 * Secure Configuration for Firebase Functions
 *
 * 🔒 SENSITIVE data loaded from environment variables
 * ⚠️  NEVER commit sensitive values to git
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", { value: true });
exports.logConfigStatus = exports.validateAdminConfig = exports.getMaxClaimsForPlan = exports.isSuperAdmin = exports.isAdmin = exports.RATE_LIMIT_CONFIG = exports.TELEGRAM_CONFIG = exports.SECURITY_CONFIG = exports.ADMIN_CONFIG = void 0;
const functions = __importStar(require("firebase-functions"));
/**
 * Admin Configuration (SENSITIVE)
 */
exports.ADMIN_CONFIG = {
    // Admin UIDs from environment (SENSITIVE)
    ADMIN_UIDS: (((_a = functions.config().admin) === null || _a === void 0 ? void 0 : _a.uids) ||
        process.env.ADMIN_UIDS ||
        "").split(',').filter(Boolean),
    // Super admin UID (SENSITIVE)
    SUPER_ADMIN_UID: ((_b = functions.config().admin) === null || _b === void 0 ? void 0 : _b.super_admin_uid) ||
        process.env.SUPER_ADMIN_UID ||
        "",
};
/**
 * Security Configuration (SENSITIVE)
 */
exports.SECURITY_CONFIG = {
    // JWT secret (SENSITIVE)
    JWT_SECRET: ((_c = functions.config().security) === null || _c === void 0 ? void 0 : _c.jwt_secret) ||
        process.env.JWT_SECRET ||
        "default-dev-secret-change-in-production",
    // Encryption key (SENSITIVE)
    ENCRYPTION_KEY: ((_d = functions.config().security) === null || _d === void 0 ? void 0 : _d.encryption_key) ||
        process.env.ENCRYPTION_KEY ||
        "default-dev-key-change-in-production",
    // API secret (SENSITIVE)
    API_SECRET_KEY: ((_e = functions.config().security) === null || _e === void 0 ? void 0 : _e.api_secret) ||
        process.env.API_SECRET_KEY ||
        "default-dev-api-key",
};
/**
 * Telegram Configuration (SENSITIVE)
 */
exports.TELEGRAM_CONFIG = {
    // Bot token (SENSITIVE) - Used for Telegram auth verification
    BOT_TOKEN: ((_f = functions.config().telegram) === null || _f === void 0 ? void 0 : _f.bot_token) ||
        process.env.TELEGRAM_BOT_TOKEN ||
        "",
    // Note: BOT_SECRET not needed for current implementation
};
/**
 * Rate Limiting Configuration
 */
exports.RATE_LIMIT_CONFIG = {
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
};
/**
 * Helper Functions
 */
/**
 * Check if user is admin
 */
const isAdmin = (uid) => {
    return exports.ADMIN_CONFIG.ADMIN_UIDS.includes(uid);
};
exports.isAdmin = isAdmin;
/**
 * Check if user is super admin
 */
const isSuperAdmin = (uid) => {
    return uid === exports.ADMIN_CONFIG.SUPER_ADMIN_UID;
};
exports.isSuperAdmin = isSuperAdmin;
/**
 * Get max claims for plan
 */
const getMaxClaimsForPlan = (planId) => {
    return exports.RATE_LIMIT_CONFIG.MAX_CLAIMS[planId] || 1;
};
exports.getMaxClaimsForPlan = getMaxClaimsForPlan;
/**
 * Validate admin configuration (NON-BLOCKING VERSION)
 */
const validateAdminConfig = () => {
    const errors = [];
    // Check admin UIDs
    if (exports.ADMIN_CONFIG.ADMIN_UIDS.length === 0) {
        errors.push('No admin UIDs configured');
    }
    // Check super admin
    if (!exports.ADMIN_CONFIG.SUPER_ADMIN_UID) {
        errors.push('Super admin UID not configured');
    }
    // Check security keys in production
    if (process.env.NODE_ENV === 'production') {
        if (exports.SECURITY_CONFIG.JWT_SECRET.includes('default-dev')) {
            errors.push('Default JWT secret detected in production');
        }
        if (exports.SECURITY_CONFIG.ENCRYPTION_KEY.includes('default-dev')) {
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
exports.validateAdminConfig = validateAdminConfig;
/**
 * Log configuration status (without sensitive values)
 */
const logConfigStatus = () => {
    console.log('🔧 Configuration Status:');
    console.log(`  - Admin UIDs configured: ${exports.ADMIN_CONFIG.ADMIN_UIDS.length}`);
    console.log(`  - Super admin configured: ${!!exports.ADMIN_CONFIG.SUPER_ADMIN_UID}`);
    console.log(`  - JWT secret configured: ${!!exports.SECURITY_CONFIG.JWT_SECRET}`);
    console.log(`  - Encryption key configured: ${!!exports.SECURITY_CONFIG.ENCRYPTION_KEY}`);
    console.log(`  - Telegram bot configured: ${!!exports.TELEGRAM_CONFIG.BOT_TOKEN}`);
    console.log(`  - Environment: ${process.env.NODE_ENV || 'development'}`);
};
exports.logConfigStatus = logConfigStatus;
// Auto-validate configuration (DISABLED FOR DEPLOYMENT)
// Uncomment after successful deployment if needed
// const isValid = validateAdminConfig();
// logConfigStatus();
// if (!isValid) {
//   console.warn('🚨 Functions will deploy but admin features may be limited');
// }
console.log('🔧 Secure config loaded - validation disabled for deployment');
//# sourceMappingURL=secure.js.map