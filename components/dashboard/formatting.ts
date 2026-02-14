import type { DisplayCurrency } from "./types";

export function formatMoney(value: number, currency: DisplayCurrency): string {
  const symbol = currency === "EUR" ? "€" : "$";
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
