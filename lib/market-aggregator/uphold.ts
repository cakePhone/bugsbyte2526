/**
 * Geisha Gains - Uphold Exchange Fetcher
 * Coffee Driven Development - BugsByte 2026
 *
 * Fetches BTC-USDT order book price from the Uphold public API.
 */

export interface ExchangePrice {
  exchange: string;
  pair: string;
  ask: number;
  bid: number;
  mid: number; // midpoint price
  timestamp: number;
}

const UPHOLD_API_BASE = "https://api.uphold.com/v0";

/**
 * Fetch the BTC-USD ticker from Uphold and return a normalised ExchangePrice.
 * Uphold doesn't list a native BTC-USDT pair, so we use BTC-USD as the
 * closest equivalent (USDT ≈ 1 USD).
 */
export async function fetchUpholdPrice(): Promise<ExchangePrice> {
  const res = await fetch(`${UPHOLD_API_BASE}/ticker/BTC-USD`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Uphold API responded with ${res.status}`);
  }

  const data: { ask: string; bid: string; currency: string } = await res.json();

  const ask = parseFloat(data.ask);
  const bid = parseFloat(data.bid);

  return {
    exchange: "Uphold",
    pair: "BTC/USDT",
    ask,
    bid,
    mid: (ask + bid) / 2,
    timestamp: Date.now(),
  };
}
