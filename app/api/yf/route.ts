/**
 * Yahoo Finance API Proxy
 * 
 * Fast market data - no API key required.
 * Supports: chart history, real-time quotes, batch quotes.
 */

import { NextResponse } from "next/server";
import {
  getChartData,
  getQuote,
  getBatchQuotes,
  getYFParams,
  toYahooSymbol,
  isCrypto,
} from "@/lib/yahoofinance";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const start = Date.now();
  
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "chart";
    const symbol = searchParams.get("symbol")?.toUpperCase();
    const timeframe = searchParams.get("timeframe") || "24H";

    // Quote action (real-time price)
    if (action === "quote" && symbol) {
      const quote = await getQuote(symbol);
      if (!quote) {
        return NextResponse.json(
          { error: `No quote data for ${symbol}` },
          { status: 404 }
        );
      }
      return NextResponse.json({
        ...quote,
        responseTime: Date.now() - start,
        source: "yahoo",
      });
    }

    // Chart action (price history)
    if ((action === "chart" || action === "history") && symbol) {
      const params = getYFParams(timeframe);
      const points = await getChartData(symbol, params.interval, params.range);
      
      if (points.length === 0) {
        return NextResponse.json(
          { error: `No chart data for ${symbol}` },
          { status: 404 }
        );
      }

      // Format for graph component
      const formatted = points.map(p => ({
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
        isCrypto: isCrypto(symbol),
        responseTime: Date.now() - start,
        source: "yahoo",
      });
    }

    return NextResponse.json(
      { error: "Missing required parameter: symbol" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[YF_API]", error);
    return NextResponse.json(
      { error: "Yahoo Finance request failed", responseTime: Date.now() - start },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const start = Date.now();
  
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action || "batch";
    const symbols = Array.isArray(body?.symbols)
      ? body.symbols.map((s: string) => s.toUpperCase())
      : [];
    const timeframe = body?.timeframe || "24H";

    // Batch quotes
    if (action === "batch" && symbols.length > 0) {
      const quotes = await getBatchQuotes(symbols);
      return NextResponse.json({
        quotes,
        count: Object.keys(quotes).length,
        responseTime: Date.now() - start,
        source: "yahoo",
      });
    }

    // Batch chart data
    if (action === "charts" && symbols.length > 0) {
      const params = getYFParams(timeframe);
      const results: Record<string, unknown> = {};
      
      await Promise.all(
        symbols.slice(0, 10).map(async (symbol: string) => {
          const points = await getChartData(symbol, params.interval, params.range);
          results[symbol] = {
            points: points.map(p => ({ timestamp: p.timestamp, price: p.close })),
            count: points.length,
            success: points.length > 0,
          };
        })
      );

      return NextResponse.json({
        results,
        timeframe,
        responseTime: Date.now() - start,
        source: "yahoo",
      });
    }

    return NextResponse.json(
      { error: "No symbols provided" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[YF_POST]", error);
    return NextResponse.json(
      { error: "Yahoo Finance batch request failed", responseTime: Date.now() - start },
      { status: 500 }
    );
  }
}
