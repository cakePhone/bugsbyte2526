import { NextResponse } from "next/server";
import { getLatestQuotePrices } from "@/lib/marketSnapshots";

export const dynamic = "force-dynamic";

type Quote = "USD" | "EUR";

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

    const snapshotPrices = await getLatestQuotePrices(
      quote === "EUR" ? "EUR" : "USDT",
    );

    const bySymbol = Object.fromEntries(
      symbols.map((symbol) => {
        const upper = symbol.toUpperCase();
        const price = Number(snapshotPrices[upper] || 0);

        return [
          upper,
          {
            symbol: upper,
            price,
            change24h: 0,
            volume24h: 0,
            timestamp: Date.now(),
          },
        ];
      }),
    );

    return NextResponse.json({
      quote,
      symbols,
      prices: bySymbol,
      timestamp: Date.now(),
      source: "market-snapshots",
    });
  } catch (error) {
    console.error("[MARKET_TICKER]", error);
    return NextResponse.json(
      { error: "Failed to fetch market ticker." },
      { status: 500 },
    );
  }
}
