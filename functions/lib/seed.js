"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedData = void 0;
const admin = __importStar(require("firebase-admin"));
const plans_1 = require("./config/plans");
const db = admin.firestore();
const presaleSeeds = [
    {
        slug: "psnchain",
        title: "PSNChain",
        url: "https://psnchain.example.com/presale",
        description: "Presale PSNChain resmi.",
        isActive: true,
        order: 1,
    },
    {
        slug: "lumadex",
        title: "LumaDex",
        url: "https://lumadex.example.com/presale",
        description: "Presale LumaDex.",
        isActive: true,
        order: 2,
    },
    {
        slug: "brisc",
        title: "BRISC",
        url: "https://brisc.example.com/presale",
        description: "Presale BRISC.",
        isActive: true,
        order: 3,
    },
    {
        slug: "blc",
        title: "BLC",
        url: "https://blc.example.com/presale",
        description: "Presale BLC.",
        isActive: true,
        order: 4,
    },
];
const seedData = async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const batch = db.batch();
        const now = admin.firestore.Timestamp.now();
        // Seed plans from configuration
        for (const [planId, planData] of Object.entries(plans_1.BACKEND_PLAN_CONFIG)) {
            const planRef = db.collection("plans").doc(planId);
            batch.set(planRef, Object.assign(Object.assign({}, planData), { createdAt: now, updatedAt: now }));
        }
        // Seed presales
        for (const presale of presaleSeeds) {
            const presaleRef = db.collection("presales").doc(presale.slug);
            batch.set(presaleRef, Object.assign(Object.assign({}, presale), { createdAt: now, updatedAt: now }));
        }
        // Seed admin settings
        const settingsRef = db.collection("admin_settings").doc("general");
        batch.set(settingsRef, {
            timezone: "Asia/Jakarta",
            captchaRequired: false,
            dailyStartHour: 0,
            createdAt: now,
            updatedAt: now,
        });
        await batch.commit();
        res.json({
            success: true,
            message: "Seed data created successfully",
            seeded: {
                plans: Object.keys(plans_1.BACKEND_PLAN_CONFIG).length,
                presales: presaleSeeds.length,
                settings: 1,
            },
        });
    }
    catch (error) {
        console.error("Seed error:", error);
        res.status(500).json({ error: "Failed to seed data" });
    }
};
exports.seedData = seedData;
//# sourceMappingURL=seed.js.map