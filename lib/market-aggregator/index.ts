/**
 * Geisha Gains - Market Aggregator Service
 * Coffee Driven Development - BugsByte 2026
 *
 * Fetches BTC/USDT prices from Uphold and (mock) Binance simultaneously,
 * then normalises them into a single spread object.
 */

import { fetchUpholdPrice, type ExchangePrice } from './uphold';
import { fetchBinancePrice } from './binance';

export interface AggregatedPrices {
  exchangeA: ExchangePrice;
  exchangeB: ExchangePrice;
  spread: number; // absolute difference between mid-prices
}

/**
 * Fetch order-book mid-prices for BTC/USDT from both exchanges in
 * parallel and return the normalised spread.
 */
export async function getPrices(): Promise<AggregatedPrices> {
  const [uphold, binance] = await Promise.all([
    fetchUpholdPrice(),
    // Pass nothing on the first call; Binance mock will use its default base.
    // We kick off both requests simultaneously so neither blocks the other.
    fetchBinancePrice(),
  ]);

  // If Uphold succeeds we can retroactively tighten the Binance mock
  // around the real price.  For a true parallel fetch we accept the
  // independent results and just compute the spread.
  const spread = Math.abs(uphold.mid - binance.mid);

  return {
    exchangeA: uphold,
    exchangeB: binance,
    spread: parseFloat(spread.toFixed(2)),
  };
}
