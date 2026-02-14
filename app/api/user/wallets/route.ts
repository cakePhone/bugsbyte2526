/**
 * POST /api/user/wallets — Allocate USDT into a coin wallet
 *
 * Expects: { symbol: "BTC" | "ETH" | "XRP", amountUsdt: number }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fetchAllPrices } from "@/lib/uphold-api";

const SUPPORTED_WALLET_COINS = ["BTC", "ETH", "XRP"] as const;

type WalletCoin = (typeof SUPPORTED_WALLET_COINS)[number];

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const symbol = String(body?.symbol || "").toUpperCase() as WalletCoin;
    const amountUsdt = Number(body?.amountUsdt);

    if (!SUPPORTED_WALLET_COINS.includes(symbol)) {
      return NextResponse.json(
        { error: "Unsupported coin. Use BTC, ETH, or XRP." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) {
      return NextResponse.json(
        { error: "amountUsdt must be a positive number." },
        { status: 400 },
      );
    }

    const market = await fetchAllPrices();
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

      if (wallet.balanceUsdt < amountUsdt) {
        throw new Error("INSUFFICIENT_USDT");
      }

      const assets =
        typeof wallet.assets === "object" && wallet.assets !== null
          ? (wallet.assets as Record<string, number>)
          : {};

      const coinAmount = amountUsdt / current.price;
      const nextAssets = {
        ...assets,
        [symbol]: (assets[symbol] || 0) + coinAmount,
      };

      const nextWallet = await tx.wallet.update({
        where: { userId: session.sub },
        data: {
          balanceUsdt: wallet.balanceUsdt - amountUsdt,
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
