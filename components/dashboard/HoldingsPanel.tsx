"use client";

import { motion } from "framer-motion";
import type { NewsAnalysis } from "@/app/api/news/analyze/route";
import { formatMoney } from "./formatting";
import type { DisplayCurrency, HoldingsTradeRequest } from "./types";

export default function HoldingsPanel({
  holdings,
  prices,
  holdingValuesUsdt,
  holdingValuesDisplay,
  currency,
  analyses,
  onOpenTradeDialog,
  tradeFeedback,
}: {
  holdings: Record<string, number>;
  prices: Record<string, number>;
  holdingValuesUsdt: Record<string, number>;
  holdingValuesDisplay: Record<string, number>;
  currency: DisplayCurrency;
  analyses: NewsAnalysis[];
  onOpenTradeDialog: (request: HoldingsTradeRequest) => void;
  tradeFeedback: string | null;
}) {
  const threatenedSymbols = new Set<string>();
  analyses.forEach((a) => {
    if (a.threat_level >= 9 && a.sentiment === "LETHAL") {
      a.affected_assets.forEach((sym) => {
        if (holdings[sym] && holdings[sym] > 0) threatenedSymbols.add(sym);
      });
    }
  });

  const entries = Object.entries(holdings).filter(([, amt]) => amt > 0);
  const holdingsTotalValue = entries.reduce((acc, [sym, amt]) => {
    const serverValue =
      currency === "USD" ? holdingValuesUsdt[sym] : holdingValuesDisplay[sym];
    if (typeof serverValue === "number" && Number.isFinite(serverValue)) {
      return acc + serverValue;
    }
    const livePrice = Number(prices[sym] || 0);
    if (!Number.isFinite(livePrice) || livePrice <= 0) return acc;
    return acc + amt * livePrice;
  }, 0);
  const walletTotalValue = holdingsTotalValue;

  function getBestAnalysisForSymbol(symbol: string): NewsAnalysis | null {
    const related = analyses.filter((analysis) =>
      analysis.affected_assets.includes(symbol),
    );
    if (related.length === 0) return null;

    related.sort((a, b) => {
      if (a.threat_level !== b.threat_level) {
        return b.threat_level - a.threat_level;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return related[0] || null;
  }

  function getBestFundingSymbol(targetSymbol: string): string {
    const usdtAmount = Number(holdings.USDT || 0);
    const usdtUnitPrice = Number(
      prices.USDT || (currency === "EUR" ? 0.92 : 1),
    );
    const usdtValue = usdtAmount * usdtUnitPrice;
    if (Number.isFinite(usdtValue) && usdtValue > 25) return "USDT";

    const best = entries
      .filter(([sym]) => sym !== targetSymbol)
      .map(([sym, amt]) => ({
        symbol: sym,
        value: amt * Number(prices[sym] || 0),
      }))
      .sort((a, b) => b.value - a.value)[0];

    return best?.symbol || "USDT";
  }

  return (
    <div className="border-4 border-white bg-black h-full flex flex-col">
      <div className="border-b-4 border-white px-4 py-2">
        <h2 className="text-sm font-bold tracking-widest text-white">
          HOLDINGS
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b-2 border-gray-800 px-4 py-3">
          <div className="text-[10px] text-gray-500 font-bold">
            TOTAL WALLET VALUE
          </div>
          <div className="text-lg font-bold text-[#D4AF37]">
            {formatMoney(walletTotalValue, currency)}
          </div>
        </div>

        {tradeFeedback && (
          <div className="border-b-2 border-gray-800 px-4 py-2 text-[10px] font-bold text-gray-300">
            {tradeFeedback}
          </div>
        )}

        {entries.map(([sym, amt]) => {
          const price = prices[sym] || 0;
          const value =
            typeof (currency === "USD"
              ? holdingValuesUsdt[sym]
              : holdingValuesDisplay[sym]) === "number"
              ? currency === "USD"
                ? holdingValuesUsdt[sym]
                : holdingValuesDisplay[sym]
              : amt * price;
          const isThreatened = threatenedSymbols.has(sym);
          const bestAnalysis = getBestAnalysisForSymbol(sym);
          const recommendedAction: HoldingsTradeRequest["recommendedAction"] =
            bestAnalysis &&
            (bestAnalysis.sentiment === "BEARISH" ||
              bestAnalysis.portfolio_threat >= 8)
              ? "REBALANCE"
              : bestAnalysis?.action === "BUY" && bestAnalysis.global_score >= 7
                ? "BUY"
                : "HOLD";
          const fundingSymbol = getBestFundingSymbol(sym);
          const recommendedAmount =
            recommendedAction === "REBALANCE"
              ? Number((amt * 0.25).toFixed(8))
              : Number(
                  Math.max(
                    15,
                    Number(holdings.USDT || 0) *
                      Number(prices.USDT || (currency === "EUR" ? 0.92 : 1)) *
                      0.08,
                  ).toFixed(2),
                );
          const actionTone =
            recommendedAction === "REBALANCE"
              ? "text-[#FF0000] border-[#FF0000]"
              : recommendedAction === "BUY"
                ? "text-white border-white"
                : "text-gray-400 border-gray-600";

          return (
            <motion.div
              key={sym}
              className={`border-b-2 px-4 py-3 ${
                isThreatened
                  ? "border-[#FF0000] bg-[#1a0000]"
                  : "border-gray-800"
              }`}
              animate={
                isThreatened
                  ? { borderColor: ["#FF0000", "#660000", "#FF0000"] }
                  : {}
              }
              transition={
                isThreatened ? { repeat: Infinity, duration: 0.8 } : {}
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{sym}</span>
                  {isThreatened && (
                    <motion.span
                      className="text-[9px] bg-[#FF0000] text-white px-1 py-0.5 font-bold"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                    >
                      AT RISK
                    </motion.span>
                  )}
                </div>
                <span className="text-sm font-bold">
                  {formatMoney(value, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-500">
                  {amt.toFixed(6)} {sym}
                </span>
                <span className="text-[10px] text-gray-500">
                  @ {currency === "EUR" ? "€" : "$"}
                  {price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div className="mt-2 border border-gray-800 p-2 bg-black/40 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] text-gray-500 font-bold">
                    AI RECOMMENDATION
                  </span>
                  <span
                    className={`text-[10px] font-bold border px-1.5 py-0.5 ${actionTone}`}
                  >
                    {recommendedAction}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 leading-snug">
                  {bestAnalysis?.summary ||
                    "NO ACTIVE SIGNAL FOR THIS COIN. MAINTAIN DISCIPLINE."}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onOpenTradeDialog({
                      symbol: sym,
                      recommendedAction:
                        recommendedAction === "REBALANCE"
                          ? "SELL"
                          : recommendedAction,
                      recommendedAmount,
                      recommendedFromSymbol: fundingSymbol,
                      reason:
                        bestAnalysis?.reasoning ||
                        "ROTATE BETWEEN COINS BASED ON STRONGER RELATIVE OPPORTUNITY.",
                    })
                  }
                  className="w-full border-2 border-white px-2 py-1 text-[10px] font-bold tracking-widest text-white hover:bg-white hover:text-black transition-colors"
                >
                  OPEN SWAP DIALOG
                </button>
              </div>
            </motion.div>
          );
        })}

        {entries.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-600 text-sm">
            NO HOLDINGS
          </div>
        )}
      </div>
    </div>
  );
}
