/**
 * Pricing utilities for SOL/USD conversion
 * Using CoinGecko API for real-time pricing
 */

interface CoinGeckoResponse {
  solana: {
    usd: number;
  };
}

interface PricingData {
  solPrice: number;
  lastUpdated: number;
  isStale: boolean;
}

// Cache for pricing data (5 minute cache)
let pricingCache: PricingData | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get current SOL price from CoinGecko
 */
export async function getSolanaPrice(): Promise<number> {
  try {
    // Check cache first
    if (pricingCache && !pricingCache.isStale) {
      const now = Date.now();
      if (now - pricingCache.lastUpdated < CACHE_DURATION) {
        return pricingCache.solPrice;
      }
    }

    // Fetch from CoinGecko
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CoinGeckoResponse = await response.json();
    const solPrice = data.solana.usd;

    // Update cache
    pricingCache = {
      solPrice,
      lastUpdated: Date.now(),
      isStale: false,
    };

    return solPrice;
  } catch (error) {
    // Return cached price if available, otherwise fallback
    if (pricingCache) {
      pricingCache.isStale = true;
      return pricingCache.solPrice;
    }
    
    // Fallback price if no cache available
    return 150; // Approximate SOL price as fallback
  }
}

/**
 * Convert USD to SOL amount
 */
export async function usdToSol(usdAmount: number): Promise<number> {
  const solPrice = await getSolanaPrice();
  return usdAmount / solPrice;
}

/**
 * Convert SOL to USD amount
 */
export async function solToUsd(solAmount: number): Promise<number> {
  const solPrice = await getSolanaPrice();
  return solAmount * solPrice;
}

/**
 * Get plan pricing in both SOL and USD
 */
export async function getPlanPricing(usdPrice: number) {
  try {
    const solPrice = await getSolanaPrice();
    const solAmount = usdPrice / solPrice;
    
    return {
      usd: usdPrice,
      sol: solAmount,
      solPrice,
      isStale: pricingCache?.isStale || false,
    };
  } catch (error) {
    // Fallback to fixed SOL amounts if API fails
    const fallbackSolAmounts: Record<number, number> = {
      4.99: 0.033,
      7.99: 0.053,
      14.99: 0.1,
      24.99: 0.167,
    };
    
    return {
      usd: usdPrice,
      sol: fallbackSolAmounts[usdPrice] || 0.033,
      solPrice: 150, // Fallback price
      isStale: true,
    };
  }
}

/**
 * Format SOL amount for display
 */
export function formatSolAmount(amount: number): string {
  // Always show high precision for accuracy
  return amount.toFixed(7);
}

/**
 * Format USD amount for display
 */
export function formatUsdAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
