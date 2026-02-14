/**
 * GET /api/user/data — Fetch authenticated user's wallet + trades
 * Geisha Gains • Coffee Driven Development
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { computeAndPersistWalletValuations } from "@/lib/walletValuation";

function normalizeAssets(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object") return {};

  return Object.entries(input as Record<string, unknown>).reduce(
    (acc, [symbol, amount]) => {
      const key = String(symbol || "").toUpperCase();
      const value = Number(amount);
      if (!key || !Number.isFinite(value) || value <= 0) return acc;
      acc[key] = value;
      return acc;
    },
    {} as Record<string, number>,
  );
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [user, wallet, coinWallets, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.sub },
      select: { preferences: true },
    }),
    prisma.wallet.findUnique({
      where: { userId: session.sub },
    }),
    prisma.coinWallet.findMany({
      where: { userId: session.sub },
      select: {
        symbol: true,
        balanceCoin: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId: session.sub },
      orderBy: { timestamp: "desc" },
      take: 50,
    }),
  ]);

  const walletAssets = normalizeAssets(wallet?.assets);

  const coinWalletAssets = coinWallets.reduce(
    (acc, walletEntry) => {
      const symbol = String(walletEntry.symbol || "").toUpperCase();
      const amount = Number(walletEntry.balanceCoin || 0);
      if (!symbol || !Number.isFinite(amount) || amount <= 0) return acc;
      acc[symbol] = (acc[symbol] || 0) + amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const holdings = Object.entries(walletAssets).reduce(
    (acc, [symbol, amount]) => {
      const key = String(symbol || "").toUpperCase();
      const value = Number(amount || 0);
      if (!key || !Number.isFinite(value) || value <= 0) return acc;
      acc[key] = (acc[key] || 0) + value;
      return acc;
    },
    { ...coinWalletAssets } as Record<string, number>,
  );

  const valuation = await computeAndPersistWalletValuations({
    userId: session.sub,
    preferences: user?.preferences,
    assets: holdings,
  });

  return NextResponse.json({
    wallet: wallet
      ? {
          balanceUsdt: wallet.balanceUsdt,
          assets: wallet.assets,
          holdings,
          totalPnL: wallet.totalPnL,
        }
      : { balanceUsdt: 0, assets: {}, holdings: {}, totalPnL: 0 },
    valuationCurrency: valuation.quoteCurrency,
    walletValuations: valuation.entries,
    transactions: transactions
      .filter((t) => t.type === "BUY" || t.type === "SELL")
      .map((t) => ({
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
