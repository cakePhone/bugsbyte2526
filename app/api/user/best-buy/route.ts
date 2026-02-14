/**
 * GET /api/user/best-buy — Recommend best asset to buy now
 * Geisha Gains • Coffee Driven Development
 *
 * Uses existing market pricing + NVIDIA NIM analysis algorithm.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchAllPrices } from "@/lib/uphold-api";
import { analyzeMarketWithNIM } from "@/lib/nvidia-nim";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const marketPrices = await fetchAllPrices();
    const analyses = await analyzeMarketWithNIM(marketPrices);

    const buys = analyses
      .filter((a) => a.action === "BUY")
      .sort((a, b) => b.confidence - a.confidence);

    const topPick =
      buys[0] ?? analyses.sort((a, b) => b.confidence - a.confidence)[0];

    if (!topPick) {
      return NextResponse.json({
        recommendation: null,
        market: marketPrices,
      });
    }

    const market = marketPrices.find((p) => p.symbol === topPick.symbol);

    return NextResponse.json({
      recommendation: {
        symbol: topPick.symbol,
        action: topPick.action,
        confidence: topPick.confidence,
        reasoning: topPick.reasoning,
        price: market?.price ?? null,
        change24h: market?.change24h ?? null,
      },
      market: marketPrices,
      generatedAt: Date.now(),
    });
  } catch (err: unknown) {
    console.error("[BEST_BUY]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
