/**
 * Geisha Gains - Market Price Service
 * Coffee Driven Development - BugsByte 2026
 *
 * Real-time price fetching without Uphold dependency.
 */

import { getQuote } from "@/lib/yahoofinance";

export interface UpholdTicker {
  ask: string;
  bid: string;
  currency: string;
  pair: string;
}

export interface MarketPrice {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: number;
}

/**
 * Backward-compatible export name.
 * Fetch real-time price from Yahoo-backed quote service.
 */
export async function fetchUpholdPrice(symbol: string): Promise<MarketPrice> {
  try {
    const upper = String(symbol || "").toUpperCase();
    const quote = await getQuote(upper);
    if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) {
      throw new Error(`Price unavailable for ${upper}`);
    }

    return {
      symbol: upper,
      price: quote.price,
      change24h: Number(quote.changePercent || 0),
      volume24h: Number(quote.volume || 0),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Failed to fetch ${symbol} price:`, error);
    return generateMockPrice(symbol);
  }
}

/**
 * Fetch all supported crypto prices with concurrency limit
 */
export async function fetchAllPrices(
  symbols: string[],
): Promise<MarketPrice[]> {
  const normalized = symbols
    .map((symbol) => String(symbol || "").toUpperCase())
    .filter(Boolean);

  if (normalized.length === 0) return [];

  // Process in batches of 10 concurrent requests to avoid overwhelming the API
  const BATCH_SIZE = 10;
  const results: MarketPrice[] = [];

  for (let i = 0; i < normalized.length; i += BATCH_SIZE) {
    const batch = normalized.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((symbol) => fetchUpholdPrice(symbol)),
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Generate realistic mock prices for demo
 */
function generateMockPrice(symbol: string): MarketPrice {
  const basePrices: Record<string, number> = {
    BTC: 95000,
    ETH: 3500,
    XRP: 2.5,
    SOL: 150,
    ADA: 1.2,
    DOGE: 0.15,
    LTC: 110,
  };

  const basePrice = basePrices[symbol] || 100;
  const volatility = basePrice * 0.005;
  const price = basePrice + (Math.random() - 0.5) * 2 * volatility;
  const change24h = (Math.random() - 0.5) * 10;
  const volume24h = Math.random() * 1000000;

  return {
    symbol,
    price: parseFloat(price.toFixed(2)),
    change24h: parseFloat(change24h.toFixed(2)),
    volume24h: parseFloat(volume24h.toFixed(2)),
    timestamp: Date.now(),
  };
}

/**
 * Stream prices with Server-Sent Events (for real-time updates)
 */
export async function* streamPrices(
  symbols: string[],
): AsyncGenerator<MarketPrice[], void, unknown> {
  while (true) {
    const prices = await fetchAllPrices(symbols);
    yield prices;

    // Wait 3 seconds before next update
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

/**
 * Get historical price (mock implementation)
 */
export async function getHistoricalPrice(
  symbol: string,
  timestamp: number,
): Promise<number> {
  // In a real implementation, this would query historical data
  // For hackathon, return current price with some variation
  const current = await fetchUpholdPrice(symbol);
  const variation = (Math.random() - 0.5) * 0.1; // ±10%
  return current.price * (1 + variation);
}
