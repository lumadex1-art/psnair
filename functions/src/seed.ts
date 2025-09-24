import * as admin from "firebase-admin";
import { BACKEND_PLAN_CONFIG } from "./config/plans";

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

export const seedData = async (req: any, res: any) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();

    // Seed plans from configuration
    for (const [planId, planData] of Object.entries(BACKEND_PLAN_CONFIG)) {
      const planRef = db.collection("plans").doc(planId);
      batch.set(planRef, {
        ...planData,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Seed presales
    for (const presale of presaleSeeds) {
      const presaleRef = db.collection("presales").doc(presale.slug);
      batch.set(presaleRef, {
        ...presale,
        createdAt: now,
        updatedAt: now,
      });
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
        plans: Object.keys(BACKEND_PLAN_CONFIG).length,
        presales: presaleSeeds.length,
        settings: 1,
      },
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    res.status(500).json({error: "Failed to seed data"});
  }
};
