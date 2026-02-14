import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLatestQuotePrices } from "@/lib/marketSnapshots";

const COINLORE_IDS: Record<string, string> = {
  BTC: "90",
  ETH: "80",
  XRP: "58",
};

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

const AVAILABLE_SYMBOLS = Object.keys(COINLORE_IDS);

type QuoteCurrency = "USD" | "EUR";

async function resolveConversionRate(quote: QuoteCurrency): Promise<number> {
  if (quote === "USD") return 1;

  const prices = await getLatestQuotePrices("EUR");
  const tetherInEur = Number(prices.USDT || 0);
  if (!Number.isFinite(tetherInEur) || tetherInEur <= 0) return 1;
  return tetherInEur;
}

async function fetchAndPersistSymbol(symbol: string) {
  const coinLoreId = COINLORE_IDS[symbol];
  const tickerRes = await fetch(
    `https://api.coinlore.net/api/ticker/?id=${coinLoreId}`,
    { cache: "no-store" },
  );

  if (!tickerRes.ok) {
    throw new Error(`CoinLore request failed for ${symbol}`);
  }

  const tickerData = (await tickerRes.json()) as Array<{
    price_usd?: string;
    volume24?: string;
    percent_change_24h?: string;
  }>;

  const ticker = tickerData?.[0];
  const price = Number(ticker?.price_usd || 0);
  const volume24h = Number(ticker?.volume24 || 0);
  const change24h = Number(ticker?.percent_change_24h || 0);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`CoinLore returned invalid price for ${symbol}`);
  }

  return prisma.marketSnap.create({
    data: {
      symbol,
      price,
      volume24h: Number.isFinite(volume24h) ? volume24h : null,
      change24h: Number.isFinite(change24h) ? change24h : null,
      source: "coinlore",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const requested = Array.isArray(body?.symbols)
      ? body.symbols.map((s: string) => String(s).toUpperCase())
      : AVAILABLE_SYMBOLS;

    const symbols = requested.filter((symbol: string) => COINLORE_IDS[symbol]);

    if (!symbols.length) {
      return NextResponse.json(
        { error: "No supported symbols provided." },
        { status: 400 },
      );
    }

    const settled = await Promise.allSettled(
      symbols.map((symbol) => fetchAndPersistSymbol(symbol)),
    );

    const inserted = settled
      .map((result, index) => ({ result, symbol: symbols[index] }))
      .filter((item) => item.result.status === "fulfilled")
      .map((item) => {
        const snap = (
          item.result as PromiseFulfilledResult<{
            symbol: string;
            price: number;
            timestamp: Date;
          }>
        ).value;
        return {
          symbol: snap.symbol,
          price: snap.price,
          timestamp: snap.timestamp.getTime(),
        };
      });

    const failed = settled
      .map((result, index) => ({ result, symbol: symbols[index] }))
      .filter((item) => item.result.status === "rejected")
      .map((item) => ({
        symbol: item.symbol,
        error:
          item.result.status === "rejected"
            ? String(item.result.reason)
            : "Unknown error",
      }));

    return NextResponse.json({
      inserted,
      failed,
      meta: {
        requested: symbols.length,
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
    const symbol = String(searchParams.get("symbol") || "BTC").toUpperCase();
    const timeframe = String(
      searchParams.get("timeframe") || "24H",
    ).toUpperCase();
    const rawQuote = String(searchParams.get("quote") || "USD").toUpperCase();
    const quote: QuoteCurrency = rawQuote === "EUR" ? "EUR" : "USD";

    if (!COINLORE_IDS[symbol]) {
      return NextResponse.json(
        { error: "Unsupported symbol. Use BTC, ETH, or XRP." },
        { status: 400 },
      );
    }

    if (!TIMEFRAME_TO_WINDOW_MS[timeframe]) {
      return NextResponse.json(
        {
          error:
            "Unsupported timeframe. Use 1M, 5M, 30MIN, 1H, 24H, 7D, 30D, or 1Y.",
        },
        { status: 400 },
      );
    }

    let inserted;
    try {
      inserted = await fetchAndPersistSymbol(symbol);
    } catch {
      return NextResponse.json(
        { error: "CoinLore returned an invalid ticker response." },
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
