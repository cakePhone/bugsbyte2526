"use client";

import { useEffect, useState } from "react";
import type { DisplayCurrency, HoldingsTradeRequest } from "./types";

export default function HoldingsTradeModal({
  request,
  holdings,
  prices,
  currency,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  request: HoldingsTradeRequest | null;
  holdings: Record<string, number>;
  prices: Record<string, number>;
  currency: DisplayCurrency;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: {
    action: "BUY" | "SELL";
    symbol: string;
    amount: number;
    fromSymbol: string;
  }) => void;
}) {
  const [action, setAction] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState<string>("");
  const [fromSymbol, setFromSymbol] = useState<string>("USDT");

  useEffect(() => {
    if (!request) return;

    setAction(request.recommendedAction === "SELL" ? "SELL" : "BUY");
    setAmount(String(request.recommendedAmount || ""));
    setFromSymbol(request.recommendedFromSymbol || "USDT");
  }, [request]);

  if (!request) return null;

  const targetSymbol = request.symbol;
  const parsedAmount = Number(amount);
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const fundingOptions = [
    "USDT",
    ...Object.keys(holdings).filter((symbol) => symbol !== targetSymbol),
  ];
  const bestValueSymbol =
    request.recommendedFromSymbol ||
    fundingOptions
      .map((symbol) => ({
        symbol,
        value:
          symbol === "USDT"
            ? Number.POSITIVE_INFINITY
            : (holdings[symbol] || 0) * Number(prices[symbol] || 0),
      }))
      .sort((a, b) => b.value - a.value)[0]?.symbol ||
    "USDT";

  const unit = action === "SELL" ? targetSymbol : "USDT";
  const disableSubmit =
    !validAmount ||
    isSubmitting ||
    (action === "BUY" && fromSymbol === targetSymbol);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg border-4 border-white bg-black p-4 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-widest">
            HOLDINGS TRADE DIALOG
          </h3>
          <p className="text-xs text-gray-400 mt-1">{request.reason}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-300 space-y-1">
            <div className="text-[10px] font-bold text-gray-500">ACTION</div>
            <select
              value={action}
              onChange={(event) =>
                setAction(event.target.value as "BUY" | "SELL")
              }
              className="w-full border-2 border-gray-700 bg-black px-2 py-1 text-white"
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </label>

          <label className="text-xs text-gray-300 space-y-1">
            <div className="text-[10px] font-bold text-gray-500">
              TARGET COIN
            </div>
            <input
              value={targetSymbol}
              readOnly
              className="w-full border-2 border-gray-700 bg-gray-950 px-2 py-1 text-white"
            />
          </label>

          <label className="text-xs text-gray-300 space-y-1">
            <div className="text-[10px] font-bold text-gray-500">
              AMOUNT ({unit})
            </div>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full border-2 border-gray-700 bg-black px-2 py-1 text-white"
            />
          </label>

          <label className="text-xs text-gray-300 space-y-1">
            <div className="text-[10px] font-bold text-gray-500">FROM COIN</div>
            <select
              value={action === "SELL" ? targetSymbol : fromSymbol}
              onChange={(event) => setFromSymbol(event.target.value)}
              disabled={action === "SELL"}
              className="w-full border-2 border-gray-700 bg-black px-2 py-1 text-white disabled:opacity-60"
            >
              {(action === "SELL" ? [targetSymbol] : fundingOptions).map(
                (symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        <div className="border-2 border-gray-700 p-3 text-xs text-gray-300">
          <div className="text-[10px] font-bold text-gray-500 mb-1">
            BEST VALUE RECOMMENDATION
          </div>
          <div>
            {action === "BUY"
              ? `BEST FUNDING SOURCE: ${bestValueSymbol}.`
              : `SELL SOURCE: ${targetSymbol}.`}
          </div>
          <div className="mt-1 text-gray-500">
            {action === "BUY"
              ? `BUY FLOW: ${fromSymbol} → USDT → ${targetSymbol}`
              : `SELL FLOW: ${targetSymbol} → USDT`}
          </div>
          <div className="mt-1 text-gray-500">DISPLAY CURRENCY: {currency}</div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="border-2 border-gray-600 px-3 py-1 text-xs font-bold text-gray-300 disabled:opacity-50"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() =>
              onSubmit({
                action,
                symbol: targetSymbol,
                amount: parsedAmount,
                fromSymbol: action === "SELL" ? targetSymbol : fromSymbol,
              })
            }
            disabled={disableSubmit}
            className="border-2 border-white px-3 py-1 text-xs font-bold text-white hover:bg-white hover:text-black disabled:opacity-50"
          >
            {isSubmitting ? "EXECUTING..." : "CONFIRM TRADE"}
          </button>
        </div>
      </div>
    </div>
  );
}
