/**
 * Geisha Gains - Mock Binance Exchange Fetcher
 * Coffee Driven Development - BugsByte 2026
 *
 * Simulates a Binance-like BTC/USDT order book response.
 * In production this would hit the real Binance REST API;
 * for the hackathon we derive a realistic price from the primary feed's
 * feed plus a small random spread.
 */

import type { ExchangePrice } from "./uphold";

/**
 * Generate a mock Binance BTC/USDT price.
 *
 * Accepts an optional `referencePrice` (e.g. from primary feed) so the
 * mock stays realistic.  If none is provided, falls back to a
 * hard-coded base price.
 */
export async function fetchBinancePrice(
  referencePrice?: number,
): Promise<ExchangePrice> {
  // Simulate network latency (50-150 ms)
  await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));

  const base = referencePrice ?? 97_000;

  // Drift ±0.4 % from the reference to create a visible spread
  const drift = (Math.random() - 0.5) * 0.008 * base;
  const ask = base + drift + base * 0.0003; // ask slightly above mid
  const bid = base + drift - base * 0.0003; // bid slightly below mid

  return {
    exchange: "Binance",
    pair: "BTC/USDT",
    ask: parseFloat(ask.toFixed(2)),
    bid: parseFloat(bid.toFixed(2)),
    mid: parseFloat(((ask + bid) / 2).toFixed(2)),
    timestamp: Date.now(),
  };
}
