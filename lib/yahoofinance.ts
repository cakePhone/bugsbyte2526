/**
 * Yahoo Finance API Integration
 * 
 * Fast market data for stocks and cryptocurrencies.
 * No API key required - public endpoints.
 * 
 * Crypto symbols use format: BTC-USD, ETH-USD
 * Stock symbols use format: AAPL, MSFT, GOOGL
 */

// Known crypto symbols - need -USD suffix for Yahoo
const CRYPTO_SYMBOLS = new Set([
  "BTC", "ETH", "XRP", "SOL", "ADA", "DOGE", "LTC", "AVAX",
  "DOT", "MATIC", "LINK", "UNI", "ATOM", "FIL", "NEAR",
  "APE", "SAND", "MANA", "AAVE", "CRV", "COMP", "MKR",
  "SHIB", "ALGO", "FTM", "HBAR", "BNB", "XLM", "TRX",
]);

export interface YFPricePoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface YFQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap?: number;
  name?: string;
  currency?: string;
}

type YFInterval = "1m" | "2m" | "5m" | "15m" | "30m" | "60m" | "90m" | "1h" | "1d" | "5d" | "1wk" | "1mo";
type YFRange = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "10y" | "ytd" | "max";

/**
 * Convert symbol to Yahoo Finance format
 */
export function toYahooSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (CRYPTO_SYMBOLS.has(upper)) {
    return `${upper}-USD`;
  }
  return upper;
}

/**
 * Convert Yahoo symbol back to standard
 */
export function fromYahooSymbol(yahooSymbol: string): string {
  return yahooSymbol.replace("-USD", "").toUpperCase();
}

/**
 * Check if symbol is crypto
 */
export function isCrypto(symbol: string): boolean {
  return CRYPTO_SYMBOLS.has(symbol.toUpperCase());
}

/**
 * Fetch chart data from Yahoo Finance
 * This is FAST - typically < 200ms response
 */
export async function getChartData(
  symbol: string,
  interval: YFInterval = "5m",
  range: YFRange = "1d"
): Promise<YFPricePoint[]> {
  const yahooSymbol = toYahooSymbol(symbol);
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}&includePrePost=false`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-store",
    });
    
    if (!res.ok) {
      console.error(`[YF] HTTP ${res.status} for ${symbol}`);
      return [];
    }
    
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    
    if (!result) return [];
    
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    
    const points: YFPricePoint[] = [];
    
    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i] * 1000; // Convert to milliseconds
      const open = quote.open?.[i];
      const high = quote.high?.[i];
      const low = quote.low?.[i];
      const close = quote.close?.[i];
      const volume = quote.volume?.[i] || 0;
      
      if (close !== null && close !== undefined && Number.isFinite(close) && close > 0) {
        points.push({
          timestamp: ts,
          open: open ?? close,
          high: high ?? close,
          low: low ?? close,
          close,
          volume,
        });
      }
    }
    
    return points.sort((a, b) => a.timestamp - b.timestamp);
  } catch (err) {
    console.error(`[YF] Error fetching ${symbol}:`, err);
    return [];
  }
}

/**
 * Get real-time quote
 */
export async function getQuote(symbol: string): Promise<YFQuote | null> {
  const yahooSymbol = toYahooSymbol(symbol);
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-store",
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    
    if (!meta) return null;
    
    const regularMarketPrice = meta.regularMarketPrice ?? 0;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? regularMarketPrice;
    const change = regularMarketPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
    
    return {
      symbol: fromYahooSymbol(yahooSymbol),
      price: regularMarketPrice,
      change,
      changePercent,
      dayHigh: meta.regularMarketDayHigh ?? regularMarketPrice,
      dayLow: meta.regularMarketDayLow ?? regularMarketPrice,
      volume: meta.regularMarketVolume ?? 0,
      currency: meta.currency,
      name: meta.shortName || meta.longName,
    };
  } catch (err) {
    console.error(`[YF] Quote error for ${symbol}:`, err);
    return null;
  }
}

/**
 * Get multiple quotes at once (batch)
 */
export async function getBatchQuotes(symbols: string[]): Promise<Record<string, YFQuote>> {
  const results: Record<string, YFQuote> = {};
  
  // Yahoo doesn't have a true batch endpoint, but we can parallelize
  await Promise.all(
    symbols.slice(0, 20).map(async (symbol) => {
      const quote = await getQuote(symbol);
      if (quote) {
        results[symbol.toUpperCase()] = quote;
      }
    })
  );
  
  return results;
}

/**
 * Map timeframe to Yahoo Finance parameters
 */
export function getYFParams(timeframe: string): { interval: YFInterval; range: YFRange } {
  const mapping: Record<string, { interval: YFInterval; range: YFRange }> = {
    "1M": { interval: "1m", range: "1d" },
    "5M": { interval: "5m", range: "1d" },
    "15M": { interval: "15m", range: "1d" },
    "30MIN": { interval: "30m", range: "5d" },
    "1H": { interval: "5m", range: "1d" },
    "24H": { interval: "15m", range: "1d" },
    "7D": { interval: "1h", range: "5d" },
    "30D": { interval: "1d", range: "1mo" },
    "3M": { interval: "1d", range: "3mo" },
    "1Y": { interval: "1d", range: "1y" },
  };
  
  return mapping[timeframe.toUpperCase()] || { interval: "15m", range: "1d" };
}
