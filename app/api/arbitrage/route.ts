/**
 * Geisha Gains - Arbitrage Scanner API
 * GET /api/arbitrage
 *
 * Challenge-compliant payload:
 * - Multi-exchange opportunity monitoring
 * - Net spread engine (fees + slippage + transfer cost)
 * - Simulated synchronized execution + P&L feed
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  runArbitrageAnalysis,
  type ArbitrageOpportunity,
  type ExchangeQuote,
} from "@/lib/aiAnalyzer";
import { calculateNetProfit } from "@/lib/market-aggregator/netProfit";

export const dynamic = "force-dynamic";

const FEE_PER_LEG = 0.001; // 0.1%
const SLIPPAGE = 0.0005; // 0.05%
const TRANSFER_COST_PCT = 0.0003; // 0.03%
const TRADE_ALLOCATION = 0.1; // 10% of USDT balance
const MAX_TRADES_PER_SCAN = 2;

interface NetOpportunity extends ArbitrageOpportunity {
  execution: {
    buyExchange: string;
    sellExchange: string;
    grossSpreadPct: number;
    totalCostPct: number;
    transferCostPct: number;
    netSpreadPct: number;
    estimatedNetUsdPerUnit: number;
    shouldTrade: boolean;
  };
}

function getCheapestAndHighest(quotes: ExchangeQuote[]) {
  const sorted = [...quotes].sort((a, b) => a.ask - b.ask);
  return {
    cheapest: sorted[0],
    highest: sorted[sorted.length - 1],
  };
}

function toNetOpportunity(opportunity: ArbitrageOpportunity): NetOpportunity {
  const { cheapest, highest } = getCheapestAndHighest(opportunity.allQuotes);

  const net = calculateNetProfit({
    priceA: cheapest.ask,
    priceB: highest.ask,
    feePerLeg: FEE_PER_LEG,
    slippage: SLIPPAGE,
  });

  const transferCost = cheapest.ask * TRANSFER_COST_PCT;
  const estimatedNetUsdPerUnit = net.netProfit - transferCost;
  const netSpreadPct = cheapest.ask
    ? (estimatedNetUsdPerUnit / cheapest.ask) * 100
    : 0;

  const shouldTrade =
    estimatedNetUsdPerUnit > 0 && opportunity.aiVerdict.action === "BUY";

  return {
    ...opportunity,
    execution: {
      buyExchange: cheapest.exchange,
      sellExchange: highest.exchange,
      grossSpreadPct: net.rawSpreadPct,
      totalCostPct: net.totalCostPct,
      transferCostPct: +(TRANSFER_COST_PCT * 100).toFixed(4),
      netSpreadPct: +netSpreadPct.toFixed(4),
      estimatedNetUsdPerUnit: +estimatedNetUsdPerUnit.toFixed(4),
      shouldTrade,
    },
  };
}

async function ensureWallet(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (wallet) return wallet;

  return prisma.wallet.create({
    data: {
      userId,
      balanceUsdt: 10000,
      assets: {},
    },
  });
}

async function executeSimultaneousTrade(options: {
  userId: string;
  symbol: string;
  buyPrice: number;
  sellPrice: number;
  buyExchange: string;
  sellExchange: string;
  confidence: number;
  netSpreadPct: number;
}) {
  const {
    userId,
    symbol,
    buyPrice,
    sellPrice,
    buyExchange,
    sellExchange,
    confidence,
    netSpreadPct,
  } = options;

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error("Wallet not found");

    const spendAmount = wallet.balanceUsdt * TRADE_ALLOCATION;
    if (!Number.isFinite(spendAmount) || spendAmount <= 5) return null;

    const amount = spendAmount / buyPrice;
    const grossSellValue = amount * sellPrice;
    const feeCost = spendAmount * FEE_PER_LEG + grossSellValue * FEE_PER_LEG;
    const slippageCost = spendAmount * SLIPPAGE;
    const transferCost = spendAmount * TRANSFER_COST_PCT;
    const totalCosts = feeCost + slippageCost + transferCost;
    const netSellValue = grossSellValue - totalCosts;
    const pnl = netSellValue - spendAmount;

    if (pnl <= 0) return null;

    await tx.wallet.update({
      where: { userId },
      data: {
        balanceUsdt: wallet.balanceUsdt + pnl,
        totalPnL: wallet.totalPnL + pnl,
      },
    });

    const reason = `Simultaneous arbitrage ${buyExchange}->${sellExchange} net ${netSpreadPct.toFixed(4)}% after fees/slippage/transfer`;

    const buyTx = await tx.transaction.create({
      data: {
        userId,
        symbol,
        type: "BUY",
        amount,
        price: buyPrice,
        totalValue: spendAmount,
        pnl: null,
        exchange: buyExchange,
        isOverdrive: false,
        confidence,
        reasoning: `[SIMULTANEOUS BUY] ${reason}`,
      },
    });

    const sellTx = await tx.transaction.create({
      data: {
        userId,
        symbol,
        type: "SELL",
        amount,
        price: sellPrice,
        totalValue: netSellValue,
        pnl,
        exchange: sellExchange,
        linkedTxId: buyTx.id,
        isOverdrive: false,
        confidence,
        reasoning: `[SIMULTANEOUS SELL] ${reason}`,
      },
    });

    await tx.transaction.update({
      where: { id: buyTx.id },
      data: { linkedTxId: sellTx.id },
    });

    return { buyTx, sellTx, pnl };
  });
}

export async function GET() {
  try {
    const session = await getSession();
    const snapshot = await runArbitrageAnalysis();
    const opportunities = snapshot.opportunities.map(toNetOpportunity);

    // AUTO-EXECUTION DISABLED: Only return monitoring data, no auto-trades
    const executedThisScan: Array<{
      buyTxId: string;
      sellTxId: string;
      symbol: string;
      pnl: number;
    }> = [];

    if (session?.sub) {
      await ensureWallet(session.sub);
      // Auto-execution removed - user must manually execute trades
    }

    const recentOrders = session?.sub
      ? await prisma.transaction.findMany({
          where: {
            userId: session.sub,
            OR: [
              { reasoning: { startsWith: "[SIMULTANEOUS BUY]" } },
              { reasoning: { startsWith: "[SIMULTANEOUS SELL]" } },
            ],
          },
          orderBy: { timestamp: "desc" },
          take: 30,
        })
      : [];

    const wallet = session?.sub
      ? await prisma.wallet.findUnique({ where: { userId: session.sub } })
      : null;

    return NextResponse.json({
      timestamp: snapshot.timestamp,
      sentiment: snapshot.sentiment,
      settings: {
        feePerLegPct: +(FEE_PER_LEG * 100).toFixed(4),
        slippagePct: +(SLIPPAGE * 100).toFixed(4),
        transferCostPct: +(TRANSFER_COST_PCT * 100).toFixed(4),
      },
      opportunities,
      executedThisScan,
      performance: {
        cumulativePnL: +(wallet?.totalPnL || 0).toFixed(4),
        orderCount: recentOrders.length,
      },
      orders: recentOrders.map((order) => ({
        id: order.id,
        symbol: order.symbol,
        type: order.type,
        amount: order.amount,
        price: order.price,
        totalValue: order.totalValue,
        pnl: order.pnl,
        exchange: order.exchange,
        confidence: order.confidence,
        isOverdrive: order.isOverdrive,
        timestamp: order.timestamp,
      })),
    });
  } catch (error) {
    console.error("Arbitrage scan error:", error);
    return NextResponse.json(
      {
        error: "Scan failed",
        details: error instanceof Error ? error.message : "",
      },
      { status: 500 },
    );
  }
}
