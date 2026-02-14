/**
 * POST /api/user/fund — Add funds to user's wallet
 * Geisha Gains • Coffee Driven Development
 *
 * Expects: { amount: number }
 * Adds the amount to user's USDT coin wallet balance.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { amount } = await req.json();

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number." },
        { status: 400 },
      );
    }

    const funded = await prisma.$transaction(async (tx) => {
      await tx.wallet.upsert({
        where: { userId: session.sub },
        update: {},
        create: {
          userId: session.sub,
          balanceUsdt: 0,
          assets: {},
        },
      });

      const db = tx as any;
      const usdtWallet = await db.coinWallet.findFirst({
        where: { userId: session.sub, symbol: "USDT" },
        orderBy: { createdAt: "asc" },
      });

      const nextUsdtBalance = usdtWallet
        ? Number(usdtWallet.balanceCoin || 0) + amount
        : amount;

      if (usdtWallet) {
        await db.coinWallet.update({
          where: { id: usdtWallet.id },
          data: { balanceCoin: nextUsdtBalance },
        });
      } else {
        await db.coinWallet.create({
          data: {
            userId: session.sub,
            symbol: "USDT",
            label: "Primary USDT",
            balanceCoin: amount,
          },
        });
      }

      await tx.transaction.create({
        data: {
          userId: session.sub,
          symbol: "USDT",
          type: "TOPUP" as never,
          amount,
          price: 1,
          totalValue: amount,
          exchange: "WALLET",
          reasoning: "USER FUNDED WALLET",
          confidence: null,
          pnl: null,
        },
      });

      return { usdtBalance: nextUsdtBalance };
    });

    return NextResponse.json({
      usdtBalance: funded.usdtBalance,
    });
  } catch (err: unknown) {
    console.error("[FUND]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
