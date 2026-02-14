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
  const symbols = await getAvailableSymbols({ limit: 200 });
  const now = new Date();

  const rows: Array<{
    symbol: string;
    price: number;
    source: string;
    timestamp: Date;
  }> = [];

  const chunkSize = 20;
  for (let i = 0; i < symbols.length; i += chunkSize) {
    const chunk = symbols.slice(i, i + chunkSize);
    const prices = await fetchAllPrices(chunk);

    prices.forEach((entry) => {
      const price = Number(entry.price || 0);
      if (!Number.isFinite(price) || price <= 0) return;

      rows.push({
        symbol: `${entry.symbol}_USDT`,
        price,
        source: "price-service",
        timestamp: now,
      });
    });
  }

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
  const missing = keys.some((key) => !found.has(key));

  if (missing) {
    await collectMarketSnapshots();
    snaps = await prisma.marketSnap.findMany({
      where: { symbol: { in: keys } },
      orderBy: { timestamp: "desc" },
      take: 200,
    });
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
