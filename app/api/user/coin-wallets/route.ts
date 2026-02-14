import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLatestQuotePrices } from "@/lib/marketSnapshots";
import { resolveQuoteCurrency } from "@/lib/walletValuation";
import { getAvailableSymbols } from "@/lib/coinCatalog";

type CoinSymbol = string;

async function isTickerTradable(symbol: string): Promise<boolean> {
  if (!/^[A-Z0-9]{2,12}$/.test(symbol)) return false;

  try {
    const res = await fetch(`https://api.uphold.com/v0/ticker/${symbol}-USD`, {
      cache: "no-store",
    });
    if (!res.ok) return false;

    const data = (await res.json()) as { ask?: string; bid?: string };
    const ask = Number(data.ask || 0);
    const bid = Number(data.bid || 0);
    const price = ask > 0 && bid > 0 ? (ask + bid) / 2 : ask || bid || 0;
    return Number.isFinite(price) && price > 0;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const db = prisma as any;

    const [user, wallets] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.sub },
        select: { preferences: true },
      }),
      db.coinWallet.findMany({
        where: { userId: session.sub },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const quoteCurrency = resolveQuoteCurrency(user?.preferences);
    const prices = await getLatestQuotePrices(quoteCurrency);

    return NextResponse.json({
      quoteCurrency,
      wallets: wallets.map((wallet) => {
        const unitPrice = prices[wallet.symbol] || 0;
        return {
          id: wallet.id,
          symbol: wallet.symbol,
          label: wallet.label,
          balanceCoin: wallet.balanceCoin,
          unitPrice,
          currentValue: wallet.balanceCoin * unitPrice,
          createdAt: wallet.createdAt.getTime(),
        };
      }),
    });
  } catch (error) {
    console.error("[COIN_WALLETS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const symbol = String(body?.symbol || "").toUpperCase() as CoinSymbol;
    const label =
      typeof body?.label === "string" && body.label.trim().length > 0
        ? body.label.trim().slice(0, 40)
        : null;

    const supportedCoins = await getAvailableSymbols({ limit: 200 });
    const isSupportedByCatalog = supportedCoins.includes(symbol);
    const isSupportedByTicker =
      isSupportedByCatalog || (await isTickerTradable(symbol));

    if (!isSupportedByTicker) {
      return NextResponse.json(
        { error: "Unsupported symbol. Select a supported asset." },
        { status: 400 },
      );
    }

    const db = prisma as any;

    const wallet = await db.coinWallet.create({
      data: {
        userId: session.sub,
        symbol,
        label,
      },
    });

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        symbol: wallet.symbol,
        label: wallet.label,
        balanceCoin: wallet.balanceCoin,
        createdAt: wallet.createdAt.getTime(),
      },
    });
  } catch (error) {
    console.error("[COIN_WALLETS_POST]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
