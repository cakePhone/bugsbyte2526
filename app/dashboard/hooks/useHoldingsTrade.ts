"use client";

import { useCallback, useState } from "react";
import {
  formatCoinAmount,
  formatMoney,
} from "@/components/dashboard/formatting";
import type {
  DisplayCurrency,
  HoldingsTradeRequest,
} from "@/components/dashboard/types";

export default function useHoldingsTrade({
  displayCurrency,
  prices,
  loadUserData,
}: {
  displayCurrency: DisplayCurrency;
  prices: Record<string, number>;
  loadUserData: () => Promise<void>;
}) {
  const [pendingHoldingsTrade, setPendingHoldingsTrade] =
    useState<HoldingsTradeRequest | null>(null);
  const [holdingsTradeSubmitting, setHoldingsTradeSubmitting] = useState(false);
  const [holdingsTradeFeedback, setHoldingsTradeFeedback] = useState<
    string | null
  >(null);

  const handleOpenHoldingsTrade = useCallback(
    (request: HoldingsTradeRequest) => {
      setHoldingsTradeFeedback(null);
      setPendingHoldingsTrade(request);
    },
    [],
  );

  const handleSubmitHoldingsTrade = useCallback(
    async ({
      action,
      symbol,
      amount,
      fromSymbol,
    }: {
      action: "BUY" | "SELL";
      symbol: string;
      amount: number;
      fromSymbol: string;
    }) => {
      if (holdingsTradeSubmitting) return;

      try {
        setHoldingsTradeSubmitting(true);

        if (action === "SELL") {
          const sellRes = await fetch("/api/user/wallets/sell", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol, amountCoin: amount }),
          });

          const sellPayload = await sellRes.json().catch(() => ({}));
          if (!sellRes.ok) {
            throw new Error(String(sellPayload?.error || "Sell failed."));
          }

          await loadUserData();
          setPendingHoldingsTrade(null);
          setHoldingsTradeFeedback(
            `SOLD ${formatCoinAmount(amount)} ${symbol} FOR ${formatMoney(Number(sellPayload?.sale?.receivedUsdt || 0), displayCurrency)}.`,
          );
          return;
        }

        let spendUsdt = amount;

        if (fromSymbol !== "USDT") {
          const fromPrice = Number(prices[fromSymbol] || 0);
          if (!Number.isFinite(fromPrice) || fromPrice <= 0) {
            throw new Error(`Missing live price for ${fromSymbol}.`);
          }

          const sourceCoinAmount = Number((spendUsdt / fromPrice).toFixed(8));
          const sellRes = await fetch("/api/user/wallets/sell", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              symbol: fromSymbol,
              amountCoin: sourceCoinAmount,
            }),
          });
          const sellPayload = await sellRes.json().catch(() => ({}));
          if (!sellRes.ok) {
            throw new Error(
              String(sellPayload?.error || "Source sale failed."),
            );
          }

          spendUsdt = Number(sellPayload?.sale?.receivedUsdt || spendUsdt);
        }

        const buyRes = await fetch("/api/user/wallets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, amountUsdt: spendUsdt }),
        });

        const buyPayload = await buyRes.json().catch(() => ({}));
        if (!buyRes.ok) {
          throw new Error(String(buyPayload?.error || "Buy failed."));
        }

        await loadUserData();
        setPendingHoldingsTrade(null);
        setHoldingsTradeFeedback(
          `BOUGHT ${formatCoinAmount(Number(buyPayload?.allocation?.coinAmount || 0))} ${symbol} USING ${formatMoney(spendUsdt, displayCurrency)} FROM ${fromSymbol}.`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Trade execution failed.";
        setHoldingsTradeFeedback(message.toUpperCase());
      } finally {
        setHoldingsTradeSubmitting(false);
      }
    },
    [displayCurrency, holdingsTradeSubmitting, loadUserData, prices],
  );

  return {
    pendingHoldingsTrade,
    holdingsTradeSubmitting,
    holdingsTradeFeedback,
    setPendingHoldingsTrade,
    handleOpenHoldingsTrade,
    handleSubmitHoldingsTrade,
  };
}
