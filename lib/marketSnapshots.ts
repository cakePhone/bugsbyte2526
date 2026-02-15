import { prisma } from "@/lib/prisma";
import { getAvailableSymbols } from "@/lib/coinCatalog";
import { fetchAllPrices } from "@/lib/uphold-api";

export type QuoteCurrency = "USDT" | "EUR";

const SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  XRP: "ripple",
  USDT: "tether",
};

const DEFAULT_SYMBOLS = Object.keys(SYMBOL_TO_ID);

// In-memory cache to avoid repeated full collections
let lastCollectionTime = 0;
const COLLECTION_COOLDOWN_MS = 30_000; // Only collect once per 30 seconds

// In-memory price cache for fast lookups
const priceCache = new Map<string, { price: number; timestamp: number }>();
const PRICE_CACHE_TTL_MS = 15_000; // 15 seconds

async function fetchUsdtEurRate(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
    });
    if (!res.ok) return 0.92;
    const data = (await res.json()) as {
      rates?: Record<string, number>;
    };
    const rate = Number(data?.rates?.EUR || 0);
    if (!Number.isFinite(rate) || rate <= 0) return 0.92;
    return rate;
  } catch {
    return 0.92;
  }
}

export async function collectMarketSnapshots() {
  // Skip if recently collected (cooldown)
  const now = Date.now();
  if (now - lastCollectionTime < COLLECTION_COOLDOWN_MS) {
    return [];
  }
  lastCollectionTime = now;

  const symbols = await getAvailableSymbols({ limit: 200 });
  const timestamp = new Date();

  const rows: Array<{
    symbol: string;
    price: number;
    source: string;
    timestamp: Date;
  }> = [];

  // Parallelize chunk fetching instead of sequential
  const chunkSize = 20;
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += chunkSize) {
    chunks.push(symbols.slice(i, i + chunkSize));
  }

  const chunkResults = await Promise.all(
    chunks.map((chunk) => fetchAllPrices(chunk)),
  );

  chunkResults.flat().forEach((entry) => {
    const price = Number(entry.price || 0);
    if (!Number.isFinite(price) || price <= 0) return;

    rows.push({
      symbol: `${entry.symbol}_USDT`,
      price,
      source: "price-service",
      timestamp,
    });
  });

  if (rows.length > 0) {
    await prisma.marketSnap.createMany({ data: rows });
  }

  return rows;
}

export async function getLatestQuotePrices(
  quoteCurrency: QuoteCurrency,
): Promise<Record<string, number>> {
  const quoteSuffix = "USDT";
  const symbols = await getAvailableSymbols({ limit: 200 });
  const keys = symbols.map((symbol) => `${symbol}_${quoteSuffix}`);

  let snaps = await prisma.marketSnap.findMany({
    where: { symbol: { in: keys } },
    orderBy: { timestamp: "desc" },
    take: 200,
  });

  const found = new Set(snaps.map((s) => s.symbol));
  const missingSymbols = symbols.filter(
    (symbol) => !found.has(`${symbol}_${quoteSuffix}`),
  );

  // Only fetch missing symbols instead of full collection
  if (missingSymbols.length > 0) {
    const timestamp = new Date();
    const prices = await fetchAllPrices(missingSymbols);

    const rows = prices
      .filter((entry) => Number.isFinite(entry.price) && entry.price > 0)
      .map((entry) => ({
        symbol: `${entry.symbol}_USDT`,
        price: entry.price,
        source: "price-service",
        timestamp,
      }));

    if (rows.length > 0) {
      await prisma.marketSnap.createMany({ data: rows });
      // Re-fetch to include new data
      snaps = await prisma.marketSnap.findMany({
        where: { symbol: { in: keys } },
        orderBy: { timestamp: "desc" },
        take: 200,
      });
    }
  }

  const latestByKey = new Map<string, number>();
  for (const snap of snaps) {
    if (!latestByKey.has(snap.symbol)) {
      latestByKey.set(snap.symbol, snap.price);
    }
  }

  const out: Record<string, number> = {};
  const conversionRate = quoteCurrency === "EUR" ? await fetchUsdtEurRate() : 1;
  for (const symbol of symbols) {
    const raw = latestByKey.get(`${symbol}_${quoteSuffix}`) || 0;
    out[symbol] = raw * conversionRate;
  }

  if (!out.USDT) {
    out.USDT = conversionRate;
  }

  return out;
}

/**
 * Fast price lookup for specific symbols only (used by wallet valuation).
 * Uses in-memory cache first, then DB, then fetches only what's missing.
 */
export async function getPricesForSymbols(
  symbols: string[],
  quoteCurrency: QuoteCurrency,
): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};

  const now = Date.now();
  const quoteSuffix = "USDT";
  const out: Record<string, number> = {};
  const symbolsToFetch: string[] = [];

  // Check in-memory cache first
  for (const symbol of symbols) {
    const cacheKey = `${symbol}_${quoteSuffix}`;
    const cached = priceCache.get(cacheKey);
    if (cached && now - cached.timestamp < PRICE_CACHE_TTL_MS) {
      out[symbol] = cached.price;
    } else {
      symbolsToFetch.push(symbol);
    }
  }

  if (symbolsToFetch.length === 0) {
    // All prices from cache
    if (quoteCurrency === "EUR") {
      const rate = await fetchUsdtEurRate();
      Object.keys(out).forEach((s) => (out[s] *= rate));
    }
    return out;
  }

  // Check DB for missing symbols
  const keys = symbolsToFetch.map((s) => `${s}_${quoteSuffix}`);
  const snaps = await prisma.marketSnap.findMany({
    where: { symbol: { in: keys } },
    orderBy: { timestamp: "desc" },
    take: keys.length,
  });

  const found = new Map<string, number>();
  for (const snap of snaps) {
    if (!found.has(snap.symbol)) {
      found.set(snap.symbol, snap.price);
      // Update cache
      priceCache.set(snap.symbol, { price: snap.price, timestamp: now });
    }
  }

  const stillMissing: string[] = [];
  for (const symbol of symbolsToFetch) {
    const key = `${symbol}_${quoteSuffix}`;
    if (found.has(key)) {
      out[symbol] = found.get(key)!;
    } else {
      stillMissing.push(symbol);
    }
  }

  // Fetch only truly missing symbols from API
  if (stillMissing.length > 0) {
    const prices = await fetchAllPrices(stillMissing);
    const timestamp = new Date();
    const rows: Array<{ symbol: string; price: number; source: string; timestamp: Date }> = [];

    for (const entry of prices) {
      if (Number.isFinite(entry.price) && entry.price > 0) {
        out[entry.symbol] = entry.price;
        const cacheKey = `${entry.symbol}_${quoteSuffix}`;
        priceCache.set(cacheKey, { price: entry.price, timestamp: now });
        rows.push({
          symbol: cacheKey,
          price: entry.price,
          source: "price-service",
          timestamp,
        });
      }
    }

    // Persist to DB in background (non-blocking)
    if (rows.length > 0) {
      prisma.marketSnap.createMany({ data: rows }).catch(() => {});
    }
  }

  // Apply EUR conversion if needed
  if (quoteCurrency === "EUR") {
    const rate = await fetchUsdtEurRate();
    Object.keys(out).forEach((s) => (out[s] *= rate));
  }

  return out;
}
