import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLatestQuotePrices } from "@/lib/marketSnapshots";
import { resolveQuoteCurrency } from "@/lib/walletValuation";

export async function POST(
  req: Request,
  { params }: { params: { walletId: string } },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const walletId = params.walletId;
    const body = await req.json();
    const amountCoin = Number(body?.amountCoin);

    if (!Number.isFinite(amountCoin) || amountCoin <= 0) {
      return NextResponse.json(
        { error: "amountCoin must be a positive number." },
        { status: 400 },
      );
    }

    const db = prisma as any;

    const [user, wallet] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.sub },
        select: { preferences: true },
      }),
      db.coinWallet.findUnique({ where: { id: walletId } }),
    ]);

    if (!wallet || wallet.userId !== session.sub) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }

    const quoteCurrency = resolveQuoteCurrency(user?.preferences);
    const prices = await getLatestQuotePrices(quoteCurrency);
    const unitPrice = prices[wallet.symbol] || 0;

    const updatedWallet = await prisma.$transaction(async (tx) => {
      const nextWallet = await (tx as any).coinWallet.update({
        where: { id: wallet.id },
        data: {
          balanceCoin: { increment: amountCoin },
        },
      });

      await tx.transaction.create({
        data: {
          userId: session.sub,
          symbol: wallet.symbol,
          type: "TOPUP" as never,
          amount: amountCoin,
          price: unitPrice,
          totalValue: amountCoin * unitPrice,
          exchange: "COIN_WALLET",
          reasoning: `WALLET TOPUP FOR ${wallet.symbol}`,
        },
      });

      return nextWallet;
    });

    return NextResponse.json({
      wallet: {
        id: updatedWallet.id,
        symbol: updatedWallet.symbol,
        label: updatedWallet.label,
        balanceCoin: updatedWallet.balanceCoin,
      },
      valuation: {
        unitPrice,
        currentValue: updatedWallet.balanceCoin * unitPrice,
        currency: quoteCurrency,
      },
    });
  } catch (error) {
    console.error("[COIN_WALLET_FUND]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
