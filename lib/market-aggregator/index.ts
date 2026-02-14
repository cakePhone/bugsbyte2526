/**
 * Geisha Gains - Market Aggregator Service
 * Coffee Driven Development - BugsByte 2026
 *
 * Fetches BTC/USDT prices from primary feed and (mock) Binance simultaneously,
 * then normalises them into a single spread object.
 */

import { fetchUpholdPrice, type ExchangePrice } from "./uphold";
import { fetchBinancePrice } from "./binance";

export interface AggregatedPrices {
  exchangeA: ExchangePrice;
  exchangeB: ExchangePrice;
  spread: number; // absolute difference between mid-prices
}

/**
 * Fetch order-book mid-prices for BTC/USDT from both feeds in
 * parallel and return the normalised spread.
 */
export async function getPrices(): Promise<AggregatedPrices> {
  const [primary, binance] = await Promise.all([
    fetchUpholdPrice(),
    // Pass nothing on the first call; Binance mock will use its default base.
    fetchBinancePrice(),
  ]);

  const spread = Math.abs(primary.mid - binance.mid);

  return {
    exchangeA: primary,
    exchangeB: binance,
    spread: parseFloat(spread.toFixed(2)),
  };
}
