/**
 * Alpha Vantage API Proxy
 * 
 * Provides fast market data for stocks and cryptocurrencies.
 * Supports: history, quote, search endpoints.
 */

import { NextResponse } from "next/server";
import {
  getPriceHistory,
  getCurrentPrice,
  searchSymbol,
  getStockIntraday,
  getStockDaily,
  getCryptoDaily,
  isStockSymbol,
  type AVPricePoint,
} from "@/lib/alphavantage";

export const dynamic = "force-dynamic";

type TimeframeMapping = {
  avTimeframe: "intraday" | "daily";
  avInterval?: "1min" | "5min" | "15min" | "30min" | "60min";
  limit: number;
};

const TIMEFRAME_MAP: Record<string, TimeframeMapping> = {
  "1H": { avTimeframe: "intraday", avInterval: "5min", limit: 12 },
  "1M": { avTimeframe: "intraday", avInterval: "1min", limit: 60 },
  "5M": { avTimeframe: "intraday", avInterval: "5min", limit: 60 },
  "30MIN": { avTimeframe: "intraday", avInterval: "30min", limit: 48 },
  "24H": { avTimeframe: "intraday", avInterval: "15min", limit: 96 },
  "7D": { avTimeframe: "daily", limit: 7 },
  "30D": { avTimeframe: "daily", limit: 30 },
  "1Y": { avTimeframe: "daily", limit: 365 },
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "history";
    const symbol = searchParams.get("symbol")?.toUpperCase();
    const timeframe = searchParams.get("timeframe") || "24H";
    const keywords = searchParams.get("keywords");

    // Search action
    if (action === "search" && keywords) {
      const results = await searchSymbol(keywords);
      return NextResponse.json({
        results,
        count: results.length,
        source: "alphavantage",
      });
    }

    // Quote action (current price)
    if (action === "quote" && symbol) {
      const price = await getCurrentPrice(symbol);
      if (price === null) {
        return NextResponse.json(
          { error: `No quote data for ${symbol}` },
          { status: 404 }
        );
      }
      return NextResponse.json({
        symbol,
        price,
        timestamp: Date.now(),
        source: "alphavantage",
      });
    }

    // History action (default)
    if (action === "history" && symbol) {
      const tfConfig = TIMEFRAME_MAP[timeframe.toUpperCase()] || TIMEFRAME_MAP["24H"];
      const isStock = isStockSymbol(symbol);

      let points: AVPricePoint[] = [];

      if (isStock) {
        if (tfConfig.avTimeframe === "intraday" && tfConfig.avInterval) {
          points = await getStockIntraday(symbol, tfConfig.avInterval, "compact");
        } else {
          points = await getStockDaily(symbol, "compact");
        }
      } else {
        // Crypto - Alpha Vantage only has daily for crypto on free tier
        points = await getCryptoDaily(symbol, "USD");
      }

      // Limit points to requested timeframe
      const limitedPoints = points.slice(-tfConfig.limit);

      // Convert to simple format for graph
      const formatted = limitedPoints.map(p => ({
        timestamp: p.timestamp,
        price: p.close,
        open: p.open,
        high: p.high,
        low: p.low,
        volume: p.volume,
      }));

      return NextResponse.json({
        symbol,
        timeframe,
        points: formatted,
        count: formatted.length,
        isStock,
        source: "alphavantage",
        updatedAt: Date.now(),
      });
    }

    return NextResponse.json(
      { error: "Missing required parameters (symbol or keywords)" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[ALPHAVANTAGE_API]", error);
    return NextResponse.json(
      { error: "Alpha Vantage API request failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const symbols = Array.isArray(body?.symbols)
      ? body.symbols.map((s: string) => s.toUpperCase())
      : [];
    const timeframe = body?.timeframe || "24H";

    if (symbols.length === 0) {
      return NextResponse.json(
        { error: "No symbols provided" },
        { status: 400 }
      );
    }

    const tfConfig = TIMEFRAME_MAP[timeframe.toUpperCase()] || TIMEFRAME_MAP["24H"];
    const results: Record<string, unknown> = {};

    // Fetch data for each symbol (sequentially to respect rate limits)
    for (const symbol of symbols.slice(0, 5)) { // Limit to 5 symbols per request
      const isStock = isStockSymbol(symbol);
      let points: AVPricePoint[] = [];

      try {
        if (isStock) {
          if (tfConfig.avTimeframe === "intraday" && tfConfig.avInterval) {
            points = await getStockIntraday(symbol, tfConfig.avInterval, "compact");
          } else {
            points = await getStockDaily(symbol, "compact");
          }
        } else {
          points = await getCryptoDaily(symbol, "USD");
        }

        const limitedPoints = points.slice(-tfConfig.limit);
        results[symbol] = {
          points: limitedPoints.map(p => ({
            timestamp: p.timestamp,
            price: p.close,
          })),
          isStock,
          success: true,
        };
      } catch (err) {
        console.error(`[AV] Error fetching ${symbol}:`, err);
        results[symbol] = { error: true, points: [] };
      }
    }

    return NextResponse.json({
      results,
      timeframe,
      source: "alphavantage",
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("[ALPHAVANTAGE_POST]", error);
    return NextResponse.json(
      { error: "Alpha Vantage batch request failed" },
      { status: 500 }
    );
  }
}
