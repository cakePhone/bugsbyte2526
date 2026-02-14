/**
 * POST /api/user/wallets — Allocate USDT into a coin wallet
 *
 * Expects: { symbol: string, amountUsdt: number }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fetchAllPrices } from "@/lib/uphold-api";
import { getAvailableSymbols } from "@/lib/coinCatalog";

type WalletCoin = string;

const EPSILON = 1e-10;

const SYMBOL_ALIASES: Record<string, string> = {
  XBT: "BTC",
};

function normalizeWalletSymbol(input: unknown): WalletCoin {
  const raw = String(input || "")
    .trim()
    .toUpperCase();
  if (!raw) return "";

  const base = raw.replace("/", "-").split("-")[0].trim();

  return SYMBOL_ALIASES[base] || base;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const symbol = normalizeWalletSymbol(body?.symbol);
    const amountUsdt = Number(body?.amountUsdt);

    if (!symbol) {
      return NextResponse.json(
        { error: "symbol is required." },
        { status: 400 },
      );
    }

    const supportedCoins = await getAvailableSymbols({ limit: 200 });

    if (!supportedCoins.includes(symbol)) {
      return NextResponse.json(
        { error: "Unsupported coin. Select a supported asset." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) {
      return NextResponse.json(
        { error: "amountUsdt must be a positive number." },
        { status: 400 },
      );
    }

    const market = await fetchAllPrices([symbol]);
    const current = market.find((p) => p.symbol === symbol);
    if (!current || current.price <= 0) {
      return NextResponse.json(
        { error: "Unable to fetch live price for selected coin." },
        { status: 503 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: session.sub },
        update: {},
        create: {
          userId: session.sub,
          balanceUsdt: 0,
          assets: {},
        },
      });

      const assets =
        typeof wallet.assets === "object" && wallet.assets !== null
          ? (wallet.assets as Record<string, number>)
          : {};

      const db = tx as any;
      const usdtWallets = await db.coinWallet.findMany({
        where: { userId: session.sub, symbol: "USDT" },
        orderBy: { createdAt: "asc" },
      });

      const availableUsdtWallet = usdtWallets.reduce(
        (sum: number, item: { balanceCoin: number }) =>
          sum + Number(item.balanceCoin || 0),
        0,
      );

      const availableLegacy = Number(wallet.balanceUsdt || 0);
      const availableUsdt = availableUsdtWallet + availableLegacy;

      if (availableUsdt + EPSILON < amountUsdt) {
        throw new Error("INSUFFICIENT_USDT");
      }

      let remainingToSpend = amountUsdt;

      for (const usdtWallet of usdtWallets) {
        if (remainingToSpend <= EPSILON) break;
        const balanceCoin = Number(usdtWallet.balanceCoin || 0);
        if (balanceCoin <= EPSILON) continue;

        const deduction = Math.min(balanceCoin, remainingToSpend);
        const nextBalance = Math.max(0, balanceCoin - deduction);

        await db.coinWallet.update({
          where: { id: usdtWallet.id },
          data: { balanceCoin: nextBalance },
        });

        remainingToSpend -= deduction;
      }

      const legacySpent = Math.min(
        availableLegacy,
        Math.max(0, remainingToSpend),
      );
      const nextLegacyBalance = Math.max(0, availableLegacy - legacySpent);

      const coinAmount = amountUsdt / current.price;
      const nextAssets = {
        ...assets,
        [symbol]: (assets[symbol] || 0) + coinAmount,
      };

      const nextWallet = await tx.wallet.update({
        where: { userId: session.sub },
        data: {
          balanceUsdt: nextLegacyBalance,
          assets: nextAssets,
        },
      });

      await tx.transaction.create({
        data: {
          userId: session.sub,
          symbol,
          type: "BUY",
          amount: coinAmount,
          price: current.price,
          totalValue: amountUsdt,
          exchange: "WALLET_ALLOCATION",
          reasoning: `WALLET ALLOCATION INTO ${symbol}`,
        },
      });

      return {
        wallet: nextWallet,
        symbol,
        coinAmount,
        spentUsdt: amountUsdt,
        unitPrice: current.price,
      };
    });

    return NextResponse.json({
      wallet: {
        balanceUsdt: result.wallet.balanceUsdt,
        assets: result.wallet.assets,
      },
      allocation: {
        symbol: result.symbol,
        coinAmount: result.coinAmount,
        spentUsdt: result.spentUsdt,
        unitPrice: result.unitPrice,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "INSUFFICIENT_USDT") {
      return NextResponse.json(
        { error: "Not enough USDT balance for this allocation." },
        { status: 400 },
      );
    }

    console.error("[USER_WALLETS]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
