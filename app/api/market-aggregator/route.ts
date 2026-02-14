/**
 * Geisha Gains - Market Aggregator API
 * GET /api/market-aggregator
 *
 * Returns BTC/USDT prices from Uphold + mock Binance with the spread.
 */

import { NextResponse } from "next/server";
import { getPrices } from "@/lib/market-aggregator";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prices = await getPrices();
    return NextResponse.json(prices);
  } catch (error) {
    console.error("Market aggregator error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch prices",
        details: error instanceof Error ? error.message : "",
      },
      { status: 500 },
    );
  }
}
