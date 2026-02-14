/**
 * Shared wallet utilities for API routes
 * Geisha Gains • Coffee Driven Development
 *
 * Extracted from wallets/route.ts and wallets/sell/route.ts
 * to eliminate duplication.
 */

export type WalletCoin = string;

/** Tolerance for floating-point balance comparisons */
export const EPSILON = 1e-10;

/** Canonical symbol aliases (exchange-specific → standard) */
export const SYMBOL_ALIASES: Record<string, string> = {
  XBT: "BTC",
};

/**
 * Normalize a raw symbol string into uppercase canonical form.
 * Handles aliases, slash/dash separators, and whitespace.
 */
export function normalizeWalletSymbol(input: unknown): WalletCoin {
  const raw = String(input || "")
    .trim()
    .toUpperCase();
  if (!raw) return "";

  const base = raw.replace("/", "-").split("-")[0].trim();

  return SYMBOL_ALIASES[base] || base;
}

/**
 * Normalize a Prisma wallet.assets JSON blob into a clean
 * Record<symbol, positiveAmount> map.
 */
export function normalizeAssetBalances(
  input: unknown,
): Record<string, number> {
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
