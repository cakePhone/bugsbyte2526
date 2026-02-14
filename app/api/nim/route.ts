/**
 * NVIDIA NIM API Route — V5 Tactical Intelligence
 * 
 * POST /api/nim
 * Actions: analyze-news, evaluate-asset
 */

import { NextResponse } from "next/server";
import {
  analyzeNewsImpact,
  evaluateAsset,
  type NewsAnalysisRequest,
  type AssetEvaluationRequest,
} from "@/lib/nvidia-nim";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "analyze-news": {
        const request: NewsAnalysisRequest = {
          articleTitle: body.articleTitle || "",
          articleContent: body.articleContent || "",
          relatedSymbol: body.relatedSymbol || "",
          userHoldings: body.userHoldings || [],
          riskProfile: body.riskProfile || "MODERATE",
        };

        const analysis = await analyzeNewsImpact(request);
        return NextResponse.json(analysis);
      }

      case "evaluate-asset": {
        const request: AssetEvaluationRequest = {
          symbol: body.symbol || "",
          currentPrice: Number(body.currentPrice) || 0,
          entryPrice: body.entryPrice ? Number(body.entryPrice) : undefined,
          percentChange24h: body.percentChange24h ? Number(body.percentChange24h) : undefined,
          percentChange7d: body.percentChange7d ? Number(body.percentChange7d) : undefined,
          userRiskProfile: body.riskProfile || "MODERATE",
          marketContext: body.marketContext,
        };

        const evaluation = await evaluateAsset(request);
        return NextResponse.json(evaluation);
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: analyze-news, evaluate-asset" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("NIM API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: "NVIDIA NIM",
    version: "v5",
    status: "operational",
    endpoints: {
      "POST /api/nim": {
        actions: ["analyze-news", "evaluate-asset"],
      },
    },
  });
}
