// Static seed data for initial development
export type PlanSeed = {
  id: 'Premium' | 'Pro' | 'Master' | 'Ultra';
  priceUSD: number;
  sol: number; // fixed SOL amount
  maxDailyClaims: number;
  perks: string[];
  isActive: boolean;
};

export const planSeeds: PlanSeed[] = [
  { id: 'Premium', priceUSD: 4.99, sol: 0.033, maxDailyClaims: 5, perks: ['Priority Support'], isActive: true },
  { id: 'Pro', priceUSD: 7.99, sol: 0.053, maxDailyClaims: 7, perks: ['Faster Cooldowns', 'Priority Support'], isActive: true },
  { id: 'Master', priceUSD: 14.99, sol: 0.1, maxDailyClaims: 15, perks: ['Exclusive Tools Access', 'Master Badge'], isActive: true },
  { id: 'Ultra', priceUSD: 24.99, sol: 0.167, maxDailyClaims: 25, perks: ['All Exclusive Tools', 'Ultra Community Access', 'Highest Priority Support'], isActive: true },
];

export type PresaleSeed = {
  slug: 'psnchain' | 'lumadex' | 'brisc' | 'blc';
  title: string;
  url: string;
  description: string;
  isActive: boolean;
  order: number;
  bannerUrl?: string;
};

export const presaleSeeds: PresaleSeed[] = [
  { slug: 'psnchain', title: 'PSNChain', url: 'https://psnchain.example.com/presale', description: 'Presale PSNChain resmi.', isActive: true, order: 1 },
  { slug: 'lumadex', title: 'LumaDex', url: 'https://lumadex.example.com/presale', description: 'Presale LumaDex.', isActive: true, order: 2 },
  { slug: 'brisc', title: 'BRISC', url: 'https://brisc.example.com/presale', description: 'Presale BRISC.', isActive: true, order: 3 },
  { slug: 'blc', title: 'BLC', url: 'https://blc.example.com/presale', description: 'Presale BLC.', isActive: true, order: 4 },
];
