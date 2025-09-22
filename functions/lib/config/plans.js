"use strict";
/**
 * Plan Configuration - Backend
 * Single source of truth untuk plan pricing dan features
 * Harus sinkron dengan frontend config.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePlanConfig = exports.VALID_PLAN_IDS = exports.PlanUtils = exports.BACKEND_PLAN_CONFIG = void 0;
/**
 * Master Plan Configuration
 * CRITICAL: Harus sinkron dengan frontend src/lib/config.ts
 */
exports.BACKEND_PLAN_CONFIG = {
    Free: {
        id: "Free",
        name: "Free Plan",
        priceInSol: 0,
        priceInLamports: 0,
        maxDailyClaims: 1,
        rewardPerClaim: 1, // NEW: Reward amount per claim
        features: ['1 EPSN per day', 'Basic Support'],
        isActive: true,
        tier: 0
    },
    Starter: {
        id: "Starter",
        name: "Starter Plan",
        priceInSol: 0.033,
        priceInLamports: 33000000,
        maxDailyClaims: 1, // CHANGED: Only 1 claim per day
        rewardPerClaim: 5, // NEW: 5 EPSN per claim
        features: ['5 EPSN per day', 'Priority Support'],
        isActive: true,
        tier: 1
    },
    Silver: {
        id: "Silver",
        name: "Silver Plan",
        priceInSol: 0.053,
        priceInLamports: 53000000,
        maxDailyClaims: 1, // CHANGED: Only 1 claim per day
        rewardPerClaim: 10, // NEW: 10 EPSN per claim
        features: ['10 EPSN per day', 'Faster Cooldowns', 'Priority Support'],
        isActive: true,
        tier: 2
    },
    Gold: {
        id: "Gold",
        name: "Gold Plan",
        priceInSol: 0.1,
        priceInLamports: 100000000,
        maxDailyClaims: 1, // CHANGED: Only 1 claim per day
        rewardPerClaim: 20, // NEW: 20 EPSN per claim
        features: ['20 EPSN per day', 'Exclusive Tools Access', 'Gold Badge'],
        isActive: true,
        tier: 3
    },
    Platinum: {
        id: "Platinum",
        name: "Platinum Plan",
        priceInSol: 0.167,
        priceInLamports: 167000000,
        maxDailyClaims: 1, // CHANGED: Only 1 claim per day
        rewardPerClaim: 50, // NEW: 50 EPSN per claim
        features: ['50 EPSN per day', 'All Exclusive Tools', 'Platinum Community Access', 'Highest Priority Support'],
        isActive: true,
        tier: 4
    },
    Diamond: {
        id: "Diamond",
        name: "Diamond Plan",
        priceInSol: 0.25,
        priceInLamports: 250000000,
        maxDailyClaims: 1, // CHANGED: Only 1 claim per day
        rewardPerClaim: 100, // NEW: 100 EPSN per claim
        features: ['100 EPSN per day', 'All Exclusive Tools', 'Diamond Community Access', 'VIP Support', 'Exclusive NFT Access'],
        isActive: true,
        tier: 5
    }
};
/**
 * Utility functions untuk plan management
 */
exports.PlanUtils = {
    /**
     * Get plan data by ID
     */
    getPlanById(planId) {
        return exports.BACKEND_PLAN_CONFIG[planId] || null;
    },
    /**
     * Validate if plan ID exists and is active
     */
    isValidPlan(planId) {
        const plan = this.getPlanById(planId);
        return plan !== null && plan.isActive;
    },
    /**
     * Get plan price in lamports (for payment validation)
     */
    getPlanPriceInLamports(planId) {
        const plan = this.getPlanById(planId);
        return (plan === null || plan === void 0 ? void 0 : plan.priceInLamports) || 0;
    },
    /**
     * Get plan max daily claims (for claim validation)
     */
    getPlanMaxDailyClaims(planId) {
        const plan = this.getPlanById(planId);
        return (plan === null || plan === void 0 ? void 0 : plan.maxDailyClaims) || 1;
    },
    /**
     * Get reward amount per claim (for claim reward calculation)
     */
    getPlanRewardPerClaim(planId) {
        const plan = this.getPlanById(planId);
        return (plan === null || plan === void 0 ? void 0 : plan.rewardPerClaim) || 1;
    },
    /**
     * Get all active plans
     */
    getActivePlans() {
        return Object.values(exports.BACKEND_PLAN_CONFIG).filter(plan => plan.isActive);
    },
    /**
     * Check if plan is premium (paid)
     */
    isPremiumPlan(planId) {
        const plan = this.getPlanById(planId);
        return plan !== null && plan.priceInSol > 0;
    },
    /**
     * Get plan tier for comparison
     */
    getPlanTier(planId) {
        const plan = this.getPlanById(planId);
        return (plan === null || plan === void 0 ? void 0 : plan.tier) || 0;
    },
    /**
     * Compare two plans (returns true if plan1 is higher tier than plan2)
     */
    isHigherTier(planId1, planId2) {
        return this.getPlanTier(planId1) > this.getPlanTier(planId2);
    }
};
exports.VALID_PLAN_IDS = Object.keys(exports.BACKEND_PLAN_CONFIG);
/**
 * Validation function
 */
const validatePlanConfig = () => {
    const errors = [];
    Object.entries(exports.BACKEND_PLAN_CONFIG).forEach(([planId, plan]) => {
        // Validate price consistency
        const expectedLamports = Math.ceil(plan.priceInSol * 1000000000);
        if (plan.priceInLamports !== expectedLamports) {
            errors.push(`Plan ${planId}: Lamports mismatch. Expected ${expectedLamports}, got ${plan.priceInLamports}`);
        }
        // Validate required fields
        if (!plan.id || !plan.name || plan.maxDailyClaims < 1) {
            errors.push(`Plan ${planId}: Missing or invalid required fields`);
        }
        // Validate tier uniqueness
        const sameTierPlans = Object.values(exports.BACKEND_PLAN_CONFIG).filter(p => p.tier === plan.tier);
        if (sameTierPlans.length > 1) {
            errors.push(`Plan ${planId}: Duplicate tier ${plan.tier}`);
        }
    });
    if (errors.length > 0) {
        console.error('❌ Plan configuration validation failed:');
        errors.forEach(error => console.error(`  - ${error}`));
        throw new Error('Invalid plan configuration');
    }
    console.log('✅ Plan configuration validated successfully');
};
exports.validatePlanConfig = validatePlanConfig;
// Auto-validate on import
(0, exports.validatePlanConfig)();
//# sourceMappingURL=plans.js.map