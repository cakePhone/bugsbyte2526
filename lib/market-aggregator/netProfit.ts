/**
 * Geisha Gains - Net Profit Calculator
 * Coffee Driven Development - BugsByte 2026
 *
 * Calculates whether a cross-exchange arbitrage trade is
 * profitable after accounting for trading fees and slippage.
 */

export interface NetProfitInput {
  /** Mid-price on exchange A (e.g. Uphold) */
  priceA: number;
  /** Mid-price on exchange B (e.g. Binance) */
  priceB: number;
  /** Per-leg trading fee as a decimal (default 0.001 = 0.1%) */
  feePerLeg?: number;
  /** Slippage buffer as a decimal (default 0.0005 = 0.05%) */
  slippage?: number;
}

export interface NetProfitResult {
  /** Raw absolute spread between the two prices */
  rawSpread: number;
  /** Raw spread as a percentage of the cheaper price */
  rawSpreadPct: number;
  /** Total cost (fees + slippage) as an absolute value */
  totalCost: number;
  /** Total cost as a percentage */
  totalCostPct: number;
  /** Net profit after costs */
  netProfit: number;
  /** Net profit as a percentage */
  netProfitPct: number;
  /** Whether executing the trade is worthwhile */
  shouldTrade: boolean;
}

const DEFAULT_FEE_PER_LEG = 0.001; // 0.1 %
const DEFAULT_SLIPPAGE = 0.0005;   // 0.05 %

/**
 * Calculate the net profit of a buy-on-A / sell-on-B arbitrage
 * after subtracting trading fees (one per leg) and a slippage buffer.
 */
export function calculateNetProfit(input: NetProfitInput): NetProfitResult {
  const {
    priceA,
    priceB,
    feePerLeg = DEFAULT_FEE_PER_LEG,
    slippage = DEFAULT_SLIPPAGE,
  } = input;

  const cheapPrice = Math.min(priceA, priceB);
  const rawSpread = Math.abs(priceA - priceB);
  const rawSpreadPct = cheapPrice > 0 ? (rawSpread / cheapPrice) * 100 : 0;

  // Two legs: buy on the cheaper exchange, sell on the more expensive one.
  const feeCost = cheapPrice * feePerLeg * 2;           // 0.1 % × 2 = 0.2 %
  const slippageCost = cheapPrice * slippage;            // configurable buffer
  const totalCost = feeCost + slippageCost;
  const totalCostPct = cheapPrice > 0 ? (totalCost / cheapPrice) * 100 : 0;

  const netProfit = rawSpread - totalCost;
  const netProfitPct = cheapPrice > 0 ? (netProfit / cheapPrice) * 100 : 0;

  return {
    rawSpread: round(rawSpread),
    rawSpreadPct: round(rawSpreadPct),
    totalCost: round(totalCost),
    totalCostPct: round(totalCostPct),
    netProfit: round(netProfit),
    netProfitPct: round(netProfitPct),
    shouldTrade: netProfit > 0,
  };
}

function round(n: number, decimals = 4): number {
  return parseFloat(n.toFixed(decimals));
}
