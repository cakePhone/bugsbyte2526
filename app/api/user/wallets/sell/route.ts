/**
 * POST /api/user/wallets/sell — Sell coin from user's wallet holdings
 *
 * Expects: { symbol: string, amountCoin: number }
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

function normalizeAssetBalances(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object") return {};

  return Object.entries(input as Record<string, unknown>).reduce(
    (acc, [key, value]) => {
      const symbol = normalizeWalletSymbol(key);
      const amount = Number(value);
      if (!symbol || !Number.isFinite(amount) || amount <= 0) return acc;
      acc[symbol] = (acc[symbol] || 0) + amount;
      return acc;
    },
    {} as Record<string, number>,
  );
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const symbol = normalizeWalletSymbol(body?.symbol);
    const amountCoin = Number(body?.amountCoin);

    if (!symbol) {
      return NextResponse.json(
        { error: "symbol is required." },
        { status: 400 },
      );
    }

    const supportedCoins = await getAvailableSymbols({ limit: 200 });
    const userWallet = await prisma.wallet.findUnique({
      where: { userId: session.sub },
      select: { assets: true },
    });
    const userAssets = normalizeAssetBalances(userWallet?.assets);
    const userCoinWallet = await (prisma as any).coinWallet.findFirst({
      where: { userId: session.sub, symbol },
      select: { id: true },
    });

    const isSupported = supportedCoins.includes(symbol);
    const userAlreadyOwns =
      Number(userAssets[symbol] || 0) > EPSILON || Boolean(userCoinWallet);

    if (!isSupported && !userAlreadyOwns) {
      return NextResponse.json(
        { error: "Unsupported coin. Select a supported asset." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amountCoin) || amountCoin <= 0) {
      return NextResponse.json(
        { error: "amountCoin must be a positive number." },
        { status: 400 },
      );
    }

    const market = await fetchAllPrices([symbol]);
    const current = market.find((price) => price.symbol === symbol);
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

      const assets = normalizeAssetBalances(wallet.assets);

      const db = tx as any;
      const coinWallets = await db.coinWallet.findMany({
        where: { userId: session.sub, symbol },
        orderBy: { createdAt: "asc" },
      });

      const totalCoinWalletBalance = coinWallets.reduce(
        (sum: number, item: { balanceCoin: number }) =>
          sum + Number(item.balanceCoin || 0),
        0,
      );
      const holdingsFromAssets = Number(assets[symbol] || 0);
      const useCoinWallets = totalCoinWalletBalance > EPSILON;
      const available = useCoinWallets
        ? totalCoinWalletBalance
        : holdingsFromAssets;

      if (available + EPSILON < amountCoin) {
        throw new Error("INSUFFICIENT_COIN");
      }

      let remainingToSell = amountCoin;
      if (useCoinWallets) {
        for (const coinWallet of coinWallets) {
          if (remainingToSell <= EPSILON) break;

          const balanceCoin = Number(coinWallet.balanceCoin || 0);
          if (balanceCoin <= EPSILON) continue;

          const deduction = Math.min(balanceCoin, remainingToSell);
          const nextBalance = Math.max(0, balanceCoin - deduction);

          await db.coinWallet.update({
            where: { id: coinWallet.id },
            data: { balanceCoin: nextBalance },
          });

          remainingToSell -= deduction;
        }
      }

      const nextAssets = { ...assets };
      const nextAssetAmount = Math.max(0, holdingsFromAssets - amountCoin);
      if (nextAssetAmount <= EPSILON) {
        delete nextAssets[symbol];
      } else {
        nextAssets[symbol] = nextAssetAmount;
      }

      const grossValue = amountCoin * current.price;
      const nextWallet = await tx.wallet.update({
        where: { userId: session.sub },
        data: {
          assets: nextAssets,
        },
      });

      const existingUsdtWallet = await db.coinWallet.findFirst({
        where: { userId: session.sub, symbol: "USDT" },
        orderBy: { createdAt: "asc" },
      });

      if (existingUsdtWallet) {
        await db.coinWallet.update({
          where: { id: existingUsdtWallet.id },
          data: {
            balanceCoin:
              Number(existingUsdtWallet.balanceCoin || 0) + grossValue,
          },
        });
      } else {
        await db.coinWallet.create({
          data: {
            userId: session.sub,
            symbol: "USDT",
            label: "Trade Proceeds",
            balanceCoin: grossValue,
          },
        });
      }

      await tx.transaction.create({
        data: {
          userId: session.sub,
          symbol,
          type: "SELL",
          amount: amountCoin,
          price: current.price,
          totalValue: grossValue,
          pnl: null,
          exchange: useCoinWallets ? "COIN_WALLET" : "WALLET_ALLOCATION",
          reasoning: `WALLET SELL FOR ${symbol}`,
        },
      });

      return {
        wallet: nextWallet,
        symbol,
        amountCoin,
        unitPrice: current.price,
        receivedUsdt: grossValue,
      };
    });

    return NextResponse.json({
      wallet: {
        assets: result.wallet.assets,
      },
      sale: {
        symbol: result.symbol,
        amountCoin: result.amountCoin,
        unitPrice: result.unitPrice,
        receivedUsdt: result.receivedUsdt,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "INSUFFICIENT_COIN") {
      return NextResponse.json(
        { error: "Not enough coin balance for this sale." },
        { status: 400 },
      );
    }

    console.error("[USER_WALLETS_SELL]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
