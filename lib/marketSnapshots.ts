import { prisma } from "@/lib/prisma";

export type QuoteCurrency = "USDT" | "EUR";

const SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  XRP: "ripple",
  USDT: "tether",
};

const SYMBOLS = Object.keys(SYMBOL_TO_ID);

export async function collectMarketSnapshots() {
  const ids = Object.values(SYMBOL_TO_ID).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,eur`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Market snapshot fetch failed (${res.status})`);
  }

  const data = (await res.json()) as Record<
    string,
    { usd?: number; eur?: number }
  >;
  const now = new Date();

  const rows = SYMBOLS.flatMap((symbol) => {
    const id = SYMBOL_TO_ID[symbol];
    const usd = Number(data[id]?.usd || 0);
    const eur = Number(data[id]?.eur || 0);

    return [
      {
        symbol: `${symbol}_USDT`,
        price: usd,
        source: "coingecko",
        timestamp: now,
      },
      {
        symbol: `${symbol}_EUR`,
        price: eur,
        source: "coingecko",
        timestamp: now,
      },
    ];
  });

  await prisma.marketSnap.createMany({ data: rows });

  return rows;
}

export async function getLatestQuotePrices(
  quoteCurrency: QuoteCurrency,
): Promise<Record<string, number>> {
  const quoteSuffix = quoteCurrency === "EUR" ? "EUR" : "USDT";
  const keys = SYMBOLS.map((symbol) => `${symbol}_${quoteSuffix}`);

  let snaps = await prisma.marketSnap.findMany({
    where: { symbol: { in: keys } },
    orderBy: { timestamp: "desc" },
    take: 50,
  });

  const found = new Set(snaps.map((s) => s.symbol));
  const missing = keys.some((key) => !found.has(key));

  if (missing) {
    await collectMarketSnapshots();
    snaps = await prisma.marketSnap.findMany({
      where: { symbol: { in: keys } },
      orderBy: { timestamp: "desc" },
      take: 50,
    });
  }

  const latestByKey = new Map<string, number>();
  for (const snap of snaps) {
    if (!latestByKey.has(snap.symbol)) {
      latestByKey.set(snap.symbol, snap.price);
    }
  }

  const out: Record<string, number> = {};
  for (const symbol of SYMBOLS) {
    out[symbol] = latestByKey.get(`${symbol}_${quoteSuffix}`) || 0;
  }

  return out;
}
