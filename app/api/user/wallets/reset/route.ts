/**
 * POST /api/user/wallets/reset — Reset user wallet to initial state
 * 
 * Clears all holdings and resets balance to 10000 USDT
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const INITIAL_BALANCE = 10000;

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Reset wallet
    const wallet = await prisma.wallet.upsert({
      where: { userId: session.sub },
      update: {
        balanceUsdt: INITIAL_BALANCE,
        assets: {},
        totalPnL: 0,
      },
      create: {
        userId: session.sub,
        balanceUsdt: INITIAL_BALANCE,
        assets: {},
        totalPnL: 0,
      },
    });

    // Delete all coinWallets for this user
    await prisma.coinWallet.deleteMany({
      where: { userId: session.sub },
    });

    // Clear transactions
    await prisma.transaction.deleteMany({
      where: { userId: session.sub },
    });

    return NextResponse.json({
      success: true,
      wallet: {
        balanceUsdt: wallet.balanceUsdt,
        assets: wallet.assets,
      },
      message: `Wallet reset to $${INITIAL_BALANCE} USDT`,
    });
  } catch (err) {
    console.error("[WALLET_RESET]", err);
    return NextResponse.json(
      { error: "Failed to reset wallet." },
      { status: 500 }
    );
  }
}
