import { NextResponse } from "next/server";
import { fetchAllPrices } from "@/lib/uphold-api";

export const dynamic = "force-dynamic";

type Quote = "USD" | "EUR";

async function fetchUsdtEurRate(): Promise<number> {
  try {
    const res = await fetch("https://api.uphold.com/v0/ticker/USDT-EUR", {
      cache: "no-store",
    });
    if (!res.ok) return 0.92;
    const data = (await res.json()) as { ask?: string; bid?: string };
    const ask = Number(data.ask || 0);
    const bid = Number(data.bid || 0);
    const mid = ask > 0 && bid > 0 ? (ask + bid) / 2 : ask || bid || 0;
    return Number.isFinite(mid) && mid > 0 ? mid : 0.92;
  } catch {
    return 0.92;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbolsRaw = String(searchParams.get("symbols") || "");
    const quoteRaw = String(searchParams.get("quote") || "USD").toUpperCase();
    const quote: Quote = quoteRaw === "EUR" ? "EUR" : "USD";

    const symbols = symbolsRaw
      .split(",")
      .map((symbol) =>
        String(symbol || "")
          .trim()
          .toUpperCase(),
      )
      .filter(Boolean);

    if (symbols.length === 0) {
      return NextResponse.json(
        { error: "symbols query parameter is required." },
        { status: 400 },
      );
    }

    const prices = await fetchAllPrices(symbols);
    const conversion = quote === "EUR" ? await fetchUsdtEurRate() : 1;

    const bySymbol = Object.fromEntries(
      prices.map((price) => [
        price.symbol,
        {
          symbol: price.symbol,
          price: price.price * conversion,
          change24h: price.change24h,
          volume24h: price.volume24h,
          timestamp: price.timestamp,
        },
      ]),
    );

    return NextResponse.json({
      quote,
      symbols,
      prices: bySymbol,
      timestamp: Date.now(),
      source: "uphold-via-server",
    });
  } catch (error) {
    console.error("[MARKET_TICKER]", error);
    return NextResponse.json(
      { error: "Failed to fetch market ticker." },
      { status: 500 },
    );
  }
}
