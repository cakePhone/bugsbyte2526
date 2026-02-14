const UPHOLD_API_BASE = "https://api.uphold.com/v0";

export interface CoinCatalogEntry {
  symbol: string;
  source: "uphold";
}

const DEFAULT_SYMBOL_LIMIT = 25;
const CACHE_TTL_MS = 5 * 60 * 1000;

const FIAT_SYMBOLS = new Set([
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "AUD",
  "CAD",
  "NZD",
  "SEK",
  "NOK",
  "DKK",
]);

type UpholdTicker = {
  pair?: string;
  ask?: string;
  bid?: string;
};

let cached: { coins: CoinCatalogEntry[]; expiresAt: number } | null = null;

async function fetchUpholdTickers(): Promise<UpholdTicker[]> {
  const res = await fetch(`${UPHOLD_API_BASE}/ticker`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Uphold ticker fetch failed (${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function extractSymbols(
  tickers: UpholdTicker[],
  quote: string,
): CoinCatalogEntry[] {
  const symbols = new Set<string>();

  tickers.forEach((ticker) => {
    const pair = String(ticker.pair || "").toUpperCase();
    if (!pair.endsWith(`-${quote}`)) return;
    const base = pair.split("-")[0];
    if (!base || FIAT_SYMBOLS.has(base)) return;
    if (base.length < 2 || base.length > 12) return;
    symbols.add(base);
  });

  if (!symbols.has("USDT")) symbols.add("USDT");

  return Array.from(symbols)
    .sort((a, b) => a.localeCompare(b))
    .map((symbol) => ({ symbol, source: "uphold" as const }));
}

export async function getAvailableCoins(options?: {
  limit?: number;
  quote?: "USD";
}): Promise<CoinCatalogEntry[]> {
  const limit = Math.max(1, Number(options?.limit || DEFAULT_SYMBOL_LIMIT));
  const quote = options?.quote || "USD";

  if (cached && cached.expiresAt > Date.now()) {
    return cached.coins.slice(0, limit);
  }

  const fallbackSymbols = ["BTC", "ETH", "XRP", "USDT", "SOL", "ADA", "DOGE"];

  let coins: CoinCatalogEntry[] = [];
  try {
    const tickers = await fetchUpholdTickers();
    coins = extractSymbols(tickers, quote);
  } catch {
    coins = [];
  }

  const safeCoins =
    coins.length > 0
      ? coins
      : fallbackSymbols.map((symbol) => ({ symbol, source: "uphold" as const }));

  cached = {
    coins: safeCoins,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return safeCoins.slice(0, limit);
}

export async function getAvailableSymbols(options?: {
  limit?: number;
  quote?: "USD";
}): Promise<string[]> {
  const coins = await getAvailableCoins(options);
  return coins.map((coin) => coin.symbol);
}
