/**
 * Alpha Vantage API Integration
 * 
 * Fast market data for stocks and cryptocurrencies.
 * Supports: TIME_SERIES_INTRADAY, TIME_SERIES_DAILY, DIGITAL_CURRENCY_DAILY, CRYPTO_INTRADAY
 */

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "ZPPNRMU4YDC7KEAJ";
const BASE_URL = "https://www.alphavantage.co/query";

// In-memory cache to avoid hitting rate limits
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export interface AVPricePoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface AVQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

type AVInterval = "1min" | "5min" | "15min" | "30min" | "60min";
type AVOutputSize = "compact" | "full";

/**
 * Check if symbol is a stock (vs crypto)
 */
export function isStockSymbol(symbol: string): boolean {
  // Common US stock patterns - uppercase letters, 1-5 chars
  const stockPatterns = /^[A-Z]{1,5}$/;
  // Known crypto symbols
  const cryptoSymbols = new Set([
    "BTC", "ETH", "XRP", "SOL", "ADA", "DOGE", "LTC", "AVAX",
    "DOT", "MATIC", "LINK", "UNI", "ATOM", "FIL", "NEAR",
    "APE", "SAND", "MANA", "AAVE", "CRV", "COMP", "MKR",
    "SHIB", "ALGO", "FTM", "HBAR", "BNB", "XLM", "TRX",
    "USDT", "USDC", "DAI", "BUSD"
  ]);
  
  if (cryptoSymbols.has(symbol.toUpperCase())) return false;
  return stockPatterns.test(symbol.toUpperCase());
}

/**
 * Get cached data or fetch fresh
 */
function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data as T;
  }
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Fetch with retry and error handling
 */
async function fetchAV<T>(params: Record<string, string>): Promise<T | null> {
  const url = new URL(BASE_URL);
  url.searchParams.set("apikey", ALPHA_VANTAGE_API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  
  const cacheKey = url.toString();
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;
  
  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { "User-Agent": "GeishaGains/1.0" },
    });
    
    if (!res.ok) {
      console.error(`[AV] HTTP ${res.status} for ${params.function}`);
      return null;
    }
    
    const data = await res.json();
    
    // Check for API error messages
    if (data?.["Error Message"] || data?.["Note"]) {
      console.error(`[AV] API Error:`, data["Error Message"] || data["Note"]);
      return null;
    }
    
    setCache(cacheKey, data);
    return data as T;
  } catch (err) {
    console.error(`[AV] Fetch error:`, err);
    return null;
  }
}

/**
 * Get intraday stock data
 */
export async function getStockIntraday(
  symbol: string,
  interval: AVInterval = "5min",
  outputsize: AVOutputSize = "compact"
): Promise<AVPricePoint[]> {
  const data = await fetchAV<Record<string, unknown>>({
    function: "TIME_SERIES_INTRADAY",
    symbol: symbol.toUpperCase(),
    interval,
    outputsize,
    adjusted: "true",
  });
  
  if (!data) return [];
  
  const timeSeriesKey = `Time Series (${interval})`;
  const timeSeries = data[timeSeriesKey] as Record<string, Record<string, string>> | undefined;
  
  if (!timeSeries) return [];
  
  return Object.entries(timeSeries)
    .map(([dateStr, values]) => ({
      timestamp: new Date(dateStr).getTime(),
      open: parseFloat(values["1. open"]),
      high: parseFloat(values["2. high"]),
      low: parseFloat(values["3. low"]),
      close: parseFloat(values["4. close"]),
      volume: parseFloat(values["5. volume"]),
    }))
    .filter(p => Number.isFinite(p.timestamp) && Number.isFinite(p.close) && p.close > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get daily stock data
 */
export async function getStockDaily(
  symbol: string,
  outputsize: AVOutputSize = "compact"
): Promise<AVPricePoint[]> {
  const data = await fetchAV<Record<string, unknown>>({
    function: "TIME_SERIES_DAILY",
    symbol: symbol.toUpperCase(),
    outputsize,
  });
  
  if (!data) return [];
  
  const timeSeries = data["Time Series (Daily)"] as Record<string, Record<string, string>> | undefined;
  
  if (!timeSeries) return [];
  
  return Object.entries(timeSeries)
    .map(([dateStr, values]) => ({
      timestamp: new Date(dateStr).getTime(),
      open: parseFloat(values["1. open"]),
      high: parseFloat(values["2. high"]),
      low: parseFloat(values["3. low"]),
      close: parseFloat(values["4. close"]),
      volume: parseFloat(values["5. volume"]),
    }))
    .filter(p => Number.isFinite(p.timestamp) && Number.isFinite(p.close) && p.close > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get daily crypto data
 */
export async function getCryptoDaily(
  symbol: string,
  market: string = "USD"
): Promise<AVPricePoint[]> {
  const data = await fetchAV<Record<string, unknown>>({
    function: "DIGITAL_CURRENCY_DAILY",
    symbol: symbol.toUpperCase(),
    market,
  });
  
  if (!data) return [];
  
  const timeSeries = data["Time Series (Digital Currency Daily)"] as Record<string, Record<string, string>> | undefined;
  
  if (!timeSeries) return [];
  
  return Object.entries(timeSeries)
    .map(([dateStr, values]) => ({
      timestamp: new Date(dateStr).getTime(),
      open: parseFloat(values["1a. open (USD)"]) || parseFloat(values["1. open"]),
      high: parseFloat(values["2a. high (USD)"]) || parseFloat(values["2. high"]),
      low: parseFloat(values["3a. low (USD)"]) || parseFloat(values["3. low"]),
      close: parseFloat(values["4a. close (USD)"]) || parseFloat(values["4. close"]),
      volume: parseFloat(values["5. volume"]) || 0,
    }))
    .filter(p => Number.isFinite(p.timestamp) && Number.isFinite(p.close) && p.close > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get real-time quote for a stock
 */
export async function getStockQuote(symbol: string): Promise<AVQuote | null> {
  const data = await fetchAV<Record<string, unknown>>({
    function: "GLOBAL_QUOTE",
    symbol: symbol.toUpperCase(),
  });
  
  if (!data) return null;
  
  const quote = data["Global Quote"] as Record<string, string> | undefined;
  if (!quote) return null;
  
  const price = parseFloat(quote["05. price"]);
  if (!Number.isFinite(price)) return null;
  
  return {
    symbol: quote["01. symbol"],
    price,
    change: parseFloat(quote["09. change"]) || 0,
    changePercent: parseFloat(quote["10. change percent"]?.replace("%", "")) || 0,
    volume: parseFloat(quote["06. volume"]) || 0,
    timestamp: Date.now(),
  };
}

/**
 * Get real-time crypto exchange rate
 */
export async function getCryptoExchangeRate(
  fromCurrency: string,
  toCurrency: string = "USD"
): Promise<AVQuote | null> {
  const data = await fetchAV<Record<string, unknown>>({
    function: "CURRENCY_EXCHANGE_RATE",
    from_currency: fromCurrency.toUpperCase(),
    to_currency: toCurrency.toUpperCase(),
  });
  
  if (!data) return null;
  
  const exchangeRate = data["Realtime Currency Exchange Rate"] as Record<string, string> | undefined;
  if (!exchangeRate) return null;
  
  const price = parseFloat(exchangeRate["5. Exchange Rate"]);
  if (!Number.isFinite(price)) return null;
  
  return {
    symbol: fromCurrency.toUpperCase(),
    price,
    change: 0,
    changePercent: 0,
    volume: 0,
    timestamp: Date.now(),
  };
}

/**
 * Search for symbols (stocks, ETFs, etc.)
 */
export async function searchSymbol(keywords: string): Promise<Array<{
  symbol: string;
  name: string;
  type: string;
  region: string;
  matchScore: number;
}>> {
  const data = await fetchAV<Record<string, unknown>>({
    function: "SYMBOL_SEARCH",
    keywords,
  });
  
  if (!data) return [];
  
  const matches = data["bestMatches"] as Array<Record<string, string>> | undefined;
  if (!Array.isArray(matches)) return [];
  
  return matches.map(m => ({
    symbol: m["1. symbol"],
    name: m["2. name"],
    type: m["3. type"],
    region: m["4. region"],
    matchScore: parseFloat(m["9. matchScore"]) || 0,
  }));
}

/**
 * Get unified price history (auto-detects stock vs crypto)
 */
export async function getPriceHistory(
  symbol: string,
  timeframe: "intraday" | "daily" | "weekly" | "monthly" = "daily"
): Promise<AVPricePoint[]> {
  const isStock = isStockSymbol(symbol);
  
  if (isStock) {
    if (timeframe === "intraday") {
      return getStockIntraday(symbol, "5min", "compact");
    }
    return getStockDaily(symbol, "compact");
  }
  
  // Crypto
  return getCryptoDaily(symbol, "USD");
}

/**
 * Get current price (auto-detects stock vs crypto)
 */
export async function getCurrentPrice(symbol: string): Promise<number | null> {
  const isStock = isStockSymbol(symbol);
  
  if (isStock) {
    const quote = await getStockQuote(symbol);
    return quote?.price ?? null;
  }
  
  const rate = await getCryptoExchangeRate(symbol, "USD");
  return rate?.price ?? null;
}
