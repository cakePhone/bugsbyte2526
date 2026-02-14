/**
 * GET /api/user/data — Fetch authenticated user's wallet + trades
 * Geisha Gains • Coffee Driven Development
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [wallet, transactions] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId: session.sub },
    }),
    prisma.transaction.findMany({
      where: { userId: session.sub },
      orderBy: { timestamp: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    wallet: wallet
      ? {
          balanceUsdt: wallet.balanceUsdt,
          assets: wallet.assets,
          totalPnL: wallet.totalPnL,
        }
      : { balanceUsdt: 0, assets: {}, totalPnL: 0 },
    transactions: transactions.map((t) => ({
      symbol: t.symbol,
      side: t.type,
      amount: t.amount,
      price: t.price,
      ts: t.timestamp.getTime(),
      exchange: t.exchange,
      pnl: t.pnl,
    })),
  });
}
