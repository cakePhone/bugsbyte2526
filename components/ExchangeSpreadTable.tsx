/**
 * ExchangeSpreadTable — Shows all 3 exchange quotes per asset
 * Highlights the "Green Bean" (lowest ask) with a red marker.
 */

"use client";

import { motion } from "framer-motion";
import type { ArbitrageOpportunity } from "@/lib/aiAnalyzer";

interface Props {
  opportunities: ArbitrageOpportunity[];
}

export default function ExchangeSpreadTable({ opportunities }: Props) {
  if (!opportunities.length) {
    return (
      <div className="border-4 border-gray-300 bg-black p-6 font-mono text-center text-gray-300 text-sm uppercase">
        NO EXCHANGE DATA
      </div>
    );
  }

  return (
    <div className="border-4 border-gray-300 bg-black text-white">
      <div className="border-b-4 border-gray-300 px-4 py-2 flex items-center justify-between">
        <h2 className="text-sm font-black font-mono uppercase">
          EXCHANGE SPREADS
        </h2>
        <span className="text-[10px] font-mono font-bold text-gray-300">
          3 FEEDS
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-4 border-gray-300 text-[10px] font-mono font-black uppercase text-gray-300">
              <th className="px-4 py-2">ASSET</th>
              <th className="px-2 py-2">EXCHANGE</th>
              <th className="px-2 py-2 text-right">ASK</th>
              <th className="px-2 py-2 text-right">BID</th>
              <th className="px-2 py-2 text-right">SPREAD</th>
              <th className="px-2 py-2 text-center">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.flatMap((opp) =>
              opp.allQuotes.map((q) => {
                const isGreenBean = q.exchange === opp.greenBean.exchange;
                return (
                  <motion.tr
                    key={`${opp.symbol}-${q.exchange}`}
                    className={`border-b border-gray-700 ${
                      isGreenBean ? "bg-red-950/40" : "hover:bg-gray-900"
                    }`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <td className="px-4 py-2 font-mono font-black text-sm">
                      {opp.symbol}
                    </td>
                    <td className="px-2 py-2 font-mono text-sm font-bold">
                      {q.exchange}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-sm">
                      $
                      {q.ask.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-sm">
                      $
                      {q.bid.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-sm">
                      {q.spreadPct.toFixed(4)}%
                    </td>
                    <td className="px-2 py-2 text-center">
                      {isGreenBean ? (
                        <span className="text-[10px] font-black font-mono bg-red-600 text-white px-2 py-0.5 border-2 border-gray-300 inline-block">
                          ☕ GREEN BEAN
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-gray-300">
                          —
                        </span>
                      )}
                    </td>
                  </motion.tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>

      {/* Summary row */}
      {opportunities.map((opp) => (
        <div
          key={`summary-${opp.symbol}`}
          className="border-t-4 border-gray-300 px-4 py-2 flex items-center justify-between bg-black"
        >
          <span className="font-mono font-black text-xs">
            {opp.symbol} ARBITRAGE: +{opp.potentialProfitPct.toFixed(3)}%
          </span>
          <span
            className={`text-[10px] font-black font-mono px-2 py-0.5 border-2 border-gray-300 ${
              opp.aiVerdict.action === "BUY"
                ? "bg-white text-black"
                : opp.aiVerdict.action === "SELL"
                  ? "bg-red-600 text-white"
                  : "bg-black text-white"
            }`}
          >
            AI: {opp.aiVerdict.action} ({opp.aiVerdict.confidence}%)
          </span>
        </div>
      ))}
    </div>
  );
}
