import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLatestQuotePrices } from "@/lib/marketSnapshots";
import { getAvailableSymbols } from "@/lib/coinCatalog";
import { fetchAllPrices } from "@/lib/uphold-api";

const TIMEFRAME_TO_WINDOW_MS: Record<string, number> = {
  "1M": 1 * 60 * 1000,
  "5M": 5 * 60 * 1000,
  "30MIN": 30 * 60 * 1000,
  "1H": 1 * 60 * 60 * 1000,
  "24H": 24 * 60 * 60 * 1000,
  "7D": 7 * 24 * 60 * 60 * 1000,
  "30D": 30 * 24 * 60 * 60 * 1000,
  "1Y": 365 * 24 * 60 * 60 * 1000,
};

const TIMEFRAME_ALIASES: Record<string, keyof typeof TIMEFRAME_TO_WINDOW_MS> = {
  "1M": "1M",
  "1MIN": "1M",
  "1MINUTE": "1M",
  "5M": "5M",
  "5MIN": "5M",
  "5MINUTES": "5M",
  "30M": "30MIN",
  "30MIN": "30MIN",
  "30MINUTES": "30MIN",
  "1H": "1H",
  "60M": "1H",
  "60MIN": "1H",
  "24H": "24H",
  "1D": "24H",
  "7D": "7D",
  "1W": "7D",
  "30D": "30D",
  "1MO": "30D",
  "1Y": "1Y",
  "12M": "1Y",
};

const DEFAULT_SYMBOLS = ["BTC", "ETH", "XRP"];

// Delay between each symbol fetch to avoid rate limiting
const FETCH_DELAY_MS = 5000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type QuoteCurrency = "USD" | "EUR";

function normalizeTimeframe(
  input: string | null,
): keyof typeof TIMEFRAME_TO_WINDOW_MS {
  const normalized = String(input || "24H")
    .trim()
    .toUpperCase();
  return TIMEFRAME_ALIASES[normalized] || "24H";
}

async function resolveConversionRate(quote: QuoteCurrency): Promise<number> {
  if (quote === "USD") return 1;

  const prices = await getLatestQuotePrices("EUR");
  const tetherInEur = Number(prices.USDT || 0);
  if (!Number.isFinite(tetherInEur) || tetherInEur <= 0) return 1;
  return tetherInEur;
}

async function fetchAndPersistSymbol(symbol: string) {
  const market = await fetchAllPrices([symbol]);
  const current = market.find((entry) => entry.symbol === symbol);
  const price = Number(current?.price || 0);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Price service returned invalid price for ${symbol}`);
  }

  return prisma.marketSnap.create({
    data: {
      symbol,
      price,
      volume24h: null,
      change24h: null,
      source: "price-service",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const supported = await getAvailableSymbols({ limit: 200 });
    const requested = Array.isArray(body?.symbols)
      ? body.symbols.map((s: string) => String(s).toUpperCase())
      : supported.length > 0
        ? supported
        : DEFAULT_SYMBOLS;

    const symbols = requested.filter((symbol: string) =>
      supported.length > 0
        ? supported.includes(symbol)
        : DEFAULT_SYMBOLS.includes(symbol),
    );

    const safeSymbols =
      symbols.length > 0
        ? symbols
        : supported.length > 0
          ? supported
          : DEFAULT_SYMBOLS;

    // Process symbols sequentially with 5-second delay between each
    const inserted: Array<{ symbol: string; price: number; timestamp: number }> = [];
    const failed: Array<{ symbol: string; error: string }> = [];

    for (let i = 0; i < safeSymbols.length; i++) {
      const symbol = safeSymbols[i];
      
      // Add delay before each fetch (except the first one)
      if (i > 0) {
        await delay(FETCH_DELAY_MS);
      }

      try {
        const snap = await fetchAndPersistSymbol(symbol);
        inserted.push({
          symbol: snap.symbol,
          price: snap.price,
          timestamp: snap.timestamp.getTime(),
        });
      } catch (error) {
        failed.push({
          symbol,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      inserted,
      failed,
      meta: {
        requested: safeSymbols.length,
        inserted: inserted.length,
        failed: failed.length,
      },
    });
  } catch (error) {
    console.error("[MARKET_HISTORY_POST]", error);
    return NextResponse.json(
      { error: "Failed to persist market snapshots." },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const supported = await getAvailableSymbols({ limit: 200 });
    const requestedSymbol = String(
      searchParams.get("symbol") || supported[0] || DEFAULT_SYMBOLS[0],
    ).toUpperCase();
    const timeframe = normalizeTimeframe(searchParams.get("timeframe"));
    const rawQuote = String(searchParams.get("quote") || "USD").toUpperCase();
    const quote: QuoteCurrency = rawQuote === "EUR" ? "EUR" : "USD";

    const allowed = supported.length > 0 ? supported : DEFAULT_SYMBOLS;
    const symbol = allowed.includes(requestedSymbol)
      ? requestedSymbol
      : allowed[0] || DEFAULT_SYMBOLS[0];

    let inserted;
    try {
      inserted = await fetchAndPersistSymbol(symbol);
    } catch {
      return NextResponse.json(
        { error: "Price service returned an invalid ticker response." },
        { status: 503 },
      );
    }

    const since = new Date(Date.now() - TIMEFRAME_TO_WINDOW_MS[timeframe]);

    const snaps = await prisma.marketSnap.findMany({
      where: {
        symbol,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: "asc" },
      select: {
        timestamp: true,
        price: true,
      },
    });

    const conversionRate = await resolveConversionRate(quote);

    return NextResponse.json({
      symbol,
      timeframe,
      quote,
      points: snaps.map((snap) => ({
        timestamp: snap.timestamp.getTime(),
        price: snap.price * conversionRate,
      })),
      latest: {
        timestamp: inserted.timestamp.getTime(),
        price: inserted.price * conversionRate,
      },
    });
  } catch (error) {
    console.error("[MARKET_HISTORY]", error);
    return NextResponse.json(
      { error: "Failed to fetch market history." },
      { status: 500 },
    );
  }
}
