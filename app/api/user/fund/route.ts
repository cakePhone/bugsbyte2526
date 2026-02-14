/**
 * POST /api/user/fund — Add funds to user's wallet
 * Geisha Gains • Coffee Driven Development
 *
 * Expects: { amount: number }
 * Adds the amount to the user's USDT balance.
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

    const wallet = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.upsert({
        where: { userId: session.sub },
        update: {
          balanceUsdt: { increment: amount },
        },
        create: {
          userId: session.sub,
          balanceUsdt: amount,
          assets: {},
        },
      });

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

      return updatedWallet;
    });

    return NextResponse.json({
      balanceUsdt: wallet.balanceUsdt,
    });
  } catch (err: unknown) {
    console.error("[FUND]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
