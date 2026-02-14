import { prisma } from "@/lib/prisma";
import {
  getLatestQuotePrices,
  type QuoteCurrency,
} from "@/lib/marketSnapshots";
import type { Prisma } from "@prisma/client";

export interface WalletValuationEntry {
  symbol: string;
  amount: number;
  unitPrice: number;
  currentValue: number;
  currency: QuoteCurrency;
}

export function resolveQuoteCurrency(preferences: unknown): QuoteCurrency {
  const raw =
    preferences && typeof preferences === "object"
      ? (preferences as Record<string, unknown>).valuation_currency
      : null;

  return raw === "EUR" ? "EUR" : "USDT";
}

export async function computeAndPersistWalletValuations(params: {
  userId: string;
  preferences: unknown;
  assets: Record<string, number>;
}) {
  const quoteCurrency = resolveQuoteCurrency(params.preferences);
  const prices = await getLatestQuotePrices(quoteCurrency);

  const entries: WalletValuationEntry[] = Object.entries(params.assets)
    .filter(([, amount]) => amount > 0)
    .map(([symbol, amount]) => {
      const unitPrice = prices[symbol] || 0;
      return {
        symbol,
        amount,
        unitPrice,
        currentValue: unitPrice * amount,
        currency: quoteCurrency,
      };
    });

  const prevPreferences =
    params.preferences && typeof params.preferences === "object"
      ? (params.preferences as Record<string, unknown>)
      : {};

  const nextPreferences = {
    ...prevPreferences,
    valuation_currency: quoteCurrency,
    wallet_valuations: entries,
    wallet_valuations_updated_at: new Date().toISOString(),
  };

  const serializedPreferences = JSON.parse(
    JSON.stringify(nextPreferences),
  ) as Prisma.InputJsonValue;

  await prisma.user.update({
    where: { id: params.userId },
    data: {
      preferences: serializedPreferences,
    },
  });

  return {
    quoteCurrency,
    entries,
    updatedPreferences: nextPreferences,
  };
}
