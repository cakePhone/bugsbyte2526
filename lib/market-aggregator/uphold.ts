/**
 * Geisha Gains - Primary Exchange Fetcher
 * Coffee Driven Development - BugsByte 2026
 *
 * Fetches BTC-USDT price from internal shared price service.
 */

import { fetchAllPrices } from "@/lib/uphold-api";

export interface ExchangePrice {
  exchange: string;
  pair: string;
  ask: number;
  bid: number;
  mid: number; // midpoint price
  timestamp: number;
}

/**
 * Backward-compatible export name used by the aggregator.
 */
export async function fetchUpholdPrice(): Promise<ExchangePrice> {
  const prices = await fetchAllPrices(["BTC"]);
  const btc = prices.find((entry) => entry.symbol === "BTC");
  const mid = Number(btc?.price || 0);

  if (!Number.isFinite(mid) || mid <= 0) {
    throw new Error("Primary price feed returned invalid BTC price");
  }

  const spread = Math.max(mid * 0.0003, 0.5);
  const ask = mid + spread;
  const bid = Math.max(0, mid - spread);

  return {
    exchange: "Primary",
    pair: "BTC/USDT",
    ask,
    bid,
    mid: (ask + bid) / 2,
    timestamp: Date.now(),
  };
}
