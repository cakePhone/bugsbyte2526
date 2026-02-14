import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fetchAllPrices } from "@/lib/uphold-api";
import { collectMarketSnapshots } from "@/lib/marketSnapshots";
import { computeAndPersistWalletValuations } from "@/lib/walletValuation";

interface StrategyReview {
  stance: "STRONG" | "GOOD" | "CAUTION" | "RISK";
  score: number;
  summary: string;
  actions: string[];
  confidence: number;
  updatedAt: number;
  basedOnTxId: string | null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const [user, wallet, transactions, market] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.sub },
        select: { preferences: true },
      }),
      prisma.wallet.findUnique({ where: { userId: session.sub } }),
      prisma.transaction.findMany({
        where: { userId: session.sub },
        orderBy: { timestamp: "desc" },
        take: 200,
      }),
      fetchAllPrices(),
    ]);

    try {
      await collectMarketSnapshots();
    } catch {
      // non-fatal; keep using live market payload for strategy analysis
    }

    const assets =
      wallet && typeof wallet.assets === "object" && wallet.assets !== null
        ? (wallet.assets as Record<string, number>)
        : {};

    const valuation = await computeAndPersistWalletValuations({
      userId: session.sub,
      preferences: user?.preferences,
      balanceUsdt: wallet?.balanceUsdt ?? 0,
      assets,
    });

    const review = await generateStrategyReview({
      transactions,
      market,
      walletBalance: wallet?.balanceUsdt ?? 0,
    });

    return NextResponse.json({
      wallet: wallet
        ? {
            balanceUsdt: wallet.balanceUsdt,
            assets: wallet.assets,
            totalPnL: wallet.totalPnL,
          }
        : { balanceUsdt: 0, assets: {}, totalPnL: 0 },
      transactions: transactions.map((tx) => ({
        id: tx.id,
        symbol: tx.symbol,
        type: tx.type,
        amount: tx.amount,
        price: tx.price,
        totalValue: tx.totalValue,
        pnl: tx.pnl,
        exchange: tx.exchange,
        isOverdrive: tx.isOverdrive,
        confidence: tx.confidence,
        reasoning: tx.reasoning,
        linkedTxId: tx.linkedTxId,
        ts: tx.timestamp.getTime(),
      })),
      market,
      valuationCurrency: valuation.quoteCurrency,
      walletValuations: valuation.entries,
      latestReview: review,
    });
  } catch (error) {
    console.error("[STRATEGY_ANALYSIS]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

async function generateStrategyReview({
  transactions,
  market,
  walletBalance,
}: {
  transactions: Array<{
    id: string;
    symbol: string;
    type: string;
    amount: number;
    price: number;
    totalValue: number;
    pnl: number | null;
    confidence: number | null;
    reasoning: string | null;
    timestamp: Date;
  }>;
  market: Array<{
    symbol: string;
    price: number;
    change24h: number;
    volume24h: number;
  }>;
  walletBalance: number;
}): Promise<StrategyReview> {
  const NIM_ENDPOINT = process.env.NVIDIA_NIM_ENDPOINT || "";
  const NIM_KEY = process.env.NVIDIA_API_KEY || "";

  if (!transactions.length) {
    return {
      stance: "CAUTION",
      score: 55,
      summary:
        "NO EXECUTION HISTORY YET. BUILD A SAMPLE OF TRADES TO CALIBRATE STRATEGY QUALITY.",
      actions: [
        "EXECUTE A SMALL TEST TRADE TO GATHER SIGNAL",
        "KEEP POSITION SIZE TIGHT UNTIL EDGE IS VERIFIED",
      ],
      confidence: 60,
      updatedAt: Date.now(),
      basedOnTxId: null,
    };
  }

  if (!NIM_ENDPOINT || !NIM_KEY) {
    return fallbackReview(transactions, market);
  }

  try {
    const recentTx = transactions.slice(0, 30).map((tx) => ({
      symbol: tx.symbol,
      type: tx.type,
      amount: Number(tx.amount.toFixed(8)),
      totalValue: Number(tx.totalValue.toFixed(2)),
      pnl: tx.pnl,
      confidence: tx.confidence,
      reasoning: tx.reasoning,
      ts: tx.timestamp.toISOString(),
    }));

    const marketSnap = market.map((m) => ({
      symbol: m.symbol,
      price: m.price,
      change24h: m.change24h,
      volume24h: m.volume24h,
    }));

    const system =
      "You are a strict trading performance reviewer. Return ONLY compact valid JSON.";
    const userPrompt = `Review this strategy execution history and produce a current strategic assessment.\n\nWallet USDT: ${walletBalance.toFixed(2)}\nRecent Transactions: ${JSON.stringify(recentTx)}\nCurrent Market: ${JSON.stringify(marketSnap)}\n\nReturn ONLY JSON with this exact structure:\n{\"stance\":\"STRONG|GOOD|CAUTION|RISK\",\"score\":0-100,\"summary\":\"UPPERCASE SHORT SUMMARY\",\"actions\":[\"ACTION 1\",\"ACTION 2\"],\"confidence\":0-100}`;

    const res = await fetch(NIM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NIM_KEY}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3-70b-instruct",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 300,
        stream: false,
      }),
    });

    if (!res.ok) {
      return fallbackReview(transactions, market);
    }

    const raw = await res.json();
    const content = raw.choices?.[0]?.message?.content || "";
    const cleaned = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    const stance = ["STRONG", "GOOD", "CAUTION", "RISK"].includes(parsed.stance)
      ? parsed.stance
      : "CAUTION";

    return {
      stance,
      score: clamp(Number(parsed.score) || 50, 0, 100),
      summary: (
        parsed.summary || "STRATEGY STATUS UNCLEAR. MAINTAIN DISCIPLINE."
      )
        .toString()
        .toUpperCase(),
      actions: Array.isArray(parsed.actions)
        ? parsed.actions
            .slice(0, 3)
            .map((a: unknown) => String(a).toUpperCase())
        : ["REDUCE NOISE", "WAIT FOR HIGH-CONVICTION SETUPS"],
      confidence: clamp(Number(parsed.confidence) || 65, 0, 100),
      updatedAt: Date.now(),
      basedOnTxId: transactions[0]?.id ?? null,
    };
  } catch {
    return fallbackReview(transactions, market);
  }
}

function fallbackReview(
  transactions: Array<{
    id: string;
    type: string;
    pnl: number | null;
    confidence: number | null;
  }>,
  market: Array<{ change24h: number }>,
): StrategyReview {
  const recent = transactions.slice(0, 20);
  const realizedPnl = recent.reduce((sum, tx) => sum + (tx.pnl || 0), 0);
  const avgConfidence =
    recent
      .filter((tx) => typeof tx.confidence === "number")
      .reduce((sum, tx) => sum + (tx.confidence || 0), 0) /
    Math.max(
      1,
      recent.filter((tx) => typeof tx.confidence === "number").length,
    );
  const marketBias =
    market.reduce((sum, asset) => sum + (asset.change24h || 0), 0) /
    Math.max(1, market.length);

  let score = 50;
  score += realizedPnl > 0 ? 20 : -15;
  score += avgConfidence > 70 ? 10 : -5;
  score += marketBias > 0 ? 5 : -5;
  score = clamp(score, 0, 100);

  const stance: StrategyReview["stance"] =
    score >= 75
      ? "STRONG"
      : score >= 60
        ? "GOOD"
        : score >= 40
          ? "CAUTION"
          : "RISK";

  const summary =
    stance === "STRONG"
      ? "EXECUTION QUALITY IS STRONG. MAINTAIN DISCIPLINED POSITION SIZING."
      : stance === "GOOD"
        ? "STRATEGY IS STABLE. KEEP RISK CONTROLS AND WAIT FOR A+ SETUPS."
        : stance === "CAUTION"
          ? "EDGE IS MIXED. TIGHTEN RULES AND REDUCE IMPULSIVE EXECUTION."
          : "PERFORMANCE IS DETERIORATING. CUT EXPOSURE AND REASSESS PLAYBOOK.";

  return {
    stance,
    score,
    summary,
    actions:
      stance === "STRONG"
        ? [
            "KEEP POSITION SIZE CONSISTENT",
            "AVOID OVERTRADING DURING NOISE",
            "LOCK IN WINS WHEN VOLATILITY SPIKES",
          ]
        : [
            "REDUCE POSITION SIZE FOR NEXT TRADES",
            "PRIORITIZE HIGH-CONFIDENCE SIGNALS ONLY",
            "REVIEW LOSING PATTERNS BEFORE NEXT CYCLE",
          ],
    confidence: clamp(Math.round(avgConfidence || 60), 0, 100),
    updatedAt: Date.now(),
    basedOnTxId: transactions[0]?.id ?? null,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
