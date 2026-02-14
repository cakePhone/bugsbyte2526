export interface CoinCatalogEntry {
  symbol: string;
  source: "catalog";
}

const DEFAULT_SYMBOL_LIMIT = 25;
const CACHE_TTL_MS = 5 * 60 * 1000;

const SUPPORTED_SYMBOLS = [
  "BTC",
  "ETH",
  "XRP",
  "SOL",
  "ADA",
  "DOGE",
  "LTC",
  "AVAX",
  "DOT",
  "MATIC",
  "LINK",
  "UNI",
  "ATOM",
  "FIL",
  "NEAR",
  "APE",
  "SAND",
  "MANA",
  "AAVE",
  "CRV",
  "COMP",
  "MKR",
  "SHIB",
  "ALGO",
  "FTM",
  "HBAR",
  "BNB",
  "XLM",
  "TRX",
  "USDT",
] as const;

let cached: { coins: CoinCatalogEntry[]; expiresAt: number } | null = null;

export async function getAvailableCoins(options?: {
  limit?: number;
  quote?: "USD";
}): Promise<CoinCatalogEntry[]> {
  const limit = Math.max(1, Number(options?.limit || DEFAULT_SYMBOL_LIMIT));
  const quote = options?.quote || "USD";

  if (cached && cached.expiresAt > Date.now()) {
    return cached.coins.slice(0, limit);
  }

  const safeCoins = Array.from(new Set(SUPPORTED_SYMBOLS))
    .sort((a, b) => a.localeCompare(b))
    .map((symbol) => ({ symbol, source: "catalog" as const }));

  cached = {
    coins: safeCoins,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  void quote;

  return safeCoins.slice(0, limit);
}

export async function getAvailableSymbols(options?: {
  limit?: number;
  quote?: "USD";
}): Promise<string[]> {
  const coins = await getAvailableCoins(options);
  return coins.map((coin) => coin.symbol);
}
