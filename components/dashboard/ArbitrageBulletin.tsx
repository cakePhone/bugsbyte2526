/**
 * ARBITRAGE BULLETIN — P&L Dashboard, Opportunity History & Order Log
 * Geisha Gains • BugsByte 2026
 *
 * Displays real-time arbitrage monitoring data:
 *  - Cumulative P&L counter
 *  - Detected opportunity history timeline
 *  - Simulated order log
 *
 * Matches the War Room brutalist design system.
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  ArbitrageOpportunityView,
  ArbitrageOrder,
  OpportunityHistoryEntry,
} from "@/app/dashboard/hooks/useArbitrageMonitor";

type Tab = "OPPORTUNITIES" | "ORDERS";

interface ArbitrageBulletinProps {
  cumulativePnL: number;
  opportunities: ArbitrageOpportunityView[];
  opportunityHistory: OpportunityHistoryEntry[];
  orders: ArbitrageOrder[];
  scanCount: number;
  isLoading: boolean;
}

export default function ArbitrageBulletin({
  cumulativePnL,
  opportunities,
  opportunityHistory,
  orders,
  scanCount,
  isLoading,
}: ArbitrageBulletinProps) {
  const [tab, setTab] = useState<Tab>("OPPORTUNITIES");

  const pnlPositive = cumulativePnL > 0;
  const pnlColor = pnlPositive
    ? "text-green-400"
    : cumulativePnL < 0
      ? "text-[#FF0000]"
      : "text-gray-400";

  const tradableCount = opportunities.filter(
    (o) => o.execution?.shouldTrade,
  ).length;

  return (
    <div className="border-4 border-white bg-black flex flex-col h-full overflow-hidden">
      {/* ── P&L Header ── */}
      <div className="border-b-4 border-white px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black font-mono uppercase tracking-widest text-white">
            ARBITRAGE BULLETIN
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 ${isLoading ? "bg-[#D4AF37] animate-pulse" : "bg-green-400"}`}
              />
              <span className="text-[10px] font-mono text-gray-500">
                SCAN #{scanCount}
              </span>
            </div>
            <span className="text-[10px] font-mono text-gray-600">|</span>
            <span className="text-[10px] font-mono text-gray-500">
              {tradableCount} LIVE{" "}
              {tradableCount === 1 ? "OPPORTUNITY" : "OPPORTUNITIES"}
            </span>
          </div>
        </div>

        {/* Cumulative P&L */}
        <div className="text-right">
          <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">
            CUMULATIVE P&L
          </div>
          <div className={`text-xl font-black font-mono ${pnlColor}`}>
            {pnlPositive ? "+" : ""}
            {cumulativePnL.toFixed(2)}{" "}
            <span className="text-[10px] text-gray-500">USDT</span>
          </div>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex border-b-2 border-gray-800">
        {(["OPPORTUNITIES", "ORDERS"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-[10px] font-black font-mono uppercase tracking-widest py-2 transition-colors ${
              tab === t
                ? "text-white border-b-2 border-white bg-gray-900"
                : "text-gray-600 hover:text-gray-400"
            }`}
          >
            {t === "OPPORTUNITIES"
              ? `OPPORTUNITIES (${opportunityHistory.length})`
              : `ORDERS (${orders.length})`}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === "OPPORTUNITIES" ? (
            <motion.div
              key="opportunities"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Live opportunities */}
              {opportunities.length > 0 && (
                <div className="border-b-2 border-gray-800">
                  <div className="px-4 py-2 bg-gray-950">
                    <span className="text-[9px] font-black font-mono text-[#D4AF37] uppercase tracking-widest">
                      LIVE SCAN
                    </span>
                  </div>
                  {opportunities.map((opp) => (
                    <LiveOpportunityRow key={opp.symbol} opp={opp} />
                  ))}
                </div>
              )}

              {/* History timeline */}
              {opportunityHistory.length > 0 ? (
                <div>
                  <div className="px-4 py-2 bg-gray-950 border-b border-gray-800">
                    <span className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest">
                      DETECTED HISTORY
                    </span>
                  </div>
                  {opportunityHistory.slice(0, 5).map((entry) => (
                    <HistoryRow key={entry.id} entry={entry} />
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-600 text-sm font-mono">
                  {isLoading
                    ? "SCANNING FOR ARBITRAGE OPPORTUNITIES..."
                    : "NO OPPORTUNITIES DETECTED YET"}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="orders"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {orders.length > 0 ? (
                orders.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))
              ) : (
                <div className="p-8 text-center text-gray-600 text-sm font-mono">
                  NO SIMULATED ORDERS YET
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━ Sub-components ━━━━━━━━━━━━━━━━━━ */

function LiveOpportunityRow({ opp }: { opp: ArbitrageOpportunityView }) {
  const exec = opp.execution;
  const isTradable = exec?.shouldTrade;

  return (
    <div
      className={`px-4 py-3 border-b border-gray-800 ${isTradable ? "bg-green-400/5" : "bg-black"}`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black font-mono text-white">
            {opp.symbol}
          </span>
          {isTradable && (
            <span className="text-[8px] font-black font-mono text-green-400 bg-green-400/20 border border-green-400 px-1.5 py-0.5">
              TRADABLE
            </span>
          )}
          <span
            className={`text-[8px] font-black font-mono px-1.5 py-0.5 border ${
              opp.aiVerdict.action === "BUY"
                ? "text-green-400 border-green-500"
                : opp.aiVerdict.action === "SELL"
                  ? "text-[#FF0000] border-[#FF0000]"
                  : "text-gray-400 border-gray-600"
            }`}
          >
            AI: {opp.aiVerdict.action} ({opp.aiVerdict.confidence}%)
          </span>
        </div>
        <span className="text-[10px] font-mono text-gray-500">
          {opp.aiVerdict.riskLevel.replace("_", " ")}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 mt-2">
        <Stat
          label="BUY"
          value={exec?.buyExchange || "—"}
          color="text-gray-300"
        />
        <Stat
          label="SELL"
          value={exec?.sellExchange || "—"}
          color="text-gray-300"
        />
        <Stat
          label="GROSS SPREAD"
          value={`${(exec?.grossSpreadPct ?? 0).toFixed(4)}%`}
          color="text-[#D4AF37]"
        />
        <Stat
          label="NET SPREAD"
          value={`${(exec?.netSpreadPct ?? 0).toFixed(4)}%`}
          color={
            (exec?.netSpreadPct ?? 0) > 0 ? "text-green-400" : "text-[#FF0000]"
          }
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mt-1">
        <Stat
          label="FEES"
          value={`${(exec?.totalCostPct ?? 0).toFixed(4)}%`}
          color="text-gray-500"
        />
        <Stat
          label="TRANSFER"
          value={`${(exec?.transferCostPct ?? 0).toFixed(4)}%`}
          color="text-gray-500"
        />
        <Stat
          label="NET $/UNIT"
          value={`$${(exec?.estimatedNetUsdPerUnit ?? 0).toFixed(2)}`}
          color={
            (exec?.estimatedNetUsdPerUnit ?? 0) > 0
              ? "text-green-400"
              : "text-[#FF0000]"
          }
        />
      </div>
    </div>
  );
}

function HistoryRow({ entry }: { entry: OpportunityHistoryEntry }) {
  const isPositive = entry.estimatedNetUsdPerUnit > 0;

  return (
    <div className="px-4 py-2 border-b border-gray-800 hover:bg-gray-950 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black font-mono text-white">
            {entry.symbol}
          </span>
          <span className="text-[9px] font-mono text-gray-500">
            {entry.buyExchange} → {entry.sellExchange}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-[10px] font-black font-mono ${isPositive ? "text-green-400" : "text-[#FF0000]"}`}
          >
            {isPositive ? "+" : ""}
            {entry.netSpreadPct.toFixed(4)}%
          </span>
          <span className="text-[10px] font-mono text-gray-600">
            {formatTimestamp(entry.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: ArbitrageOrder }) {
  const isBuy = order.type === "BUY";
  const hasPnl = order.pnl !== null && order.pnl !== undefined;

  return (
    <div className="px-4 py-3 border-b border-gray-800 hover:bg-gray-950 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-[9px] font-black font-mono px-1.5 py-0.5 ${
              isBuy ? "bg-green-400 text-black" : "bg-[#FF0000] text-white"
            }`}
          >
            {order.type}
          </span>
          <span className="text-sm font-black font-mono text-white">
            {order.symbol}
          </span>
          {order.exchange && (
            <span className="text-[9px] font-mono text-gray-500 border border-gray-700 px-1.5 py-0.5">
              {order.exchange}
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-gray-600">
          {formatTimestamp(new Date(order.timestamp).getTime())}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 mt-1">
        <Stat
          label="AMOUNT"
          value={order.amount.toFixed(6)}
          color="text-gray-300"
        />
        <Stat
          label="PRICE"
          value={`$${order.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          color="text-gray-300"
        />
        <Stat
          label="TOTAL"
          value={`$${order.totalValue.toFixed(2)}`}
          color="text-white"
        />
        <Stat
          label="P&L"
          value={
            hasPnl
              ? `${order.pnl! > 0 ? "+" : ""}$${order.pnl!.toFixed(2)}`
              : "—"
          }
          color={
            hasPnl
              ? order.pnl! > 0
                ? "text-green-400"
                : "text-[#FF0000]"
              : "text-gray-600"
          }
        />
      </div>

      {order.confidence !== null && (
        <div className="mt-1">
          <span className="text-[8px] font-mono text-gray-600">
            AI CONFIDENCE: {order.confidence}%
          </span>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <div className="text-[7px] font-mono text-gray-600 uppercase tracking-widest">
        {label}
      </div>
      <div className={`text-[11px] font-black font-mono ${color}`}>
        {value}
      </div>
    </div>
  );
}

function formatTimestamp(ts: number): string {
  try {
    const d = new Date(ts);
    const now = Date.now();
    const diffMs = now - ts;
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "NOW";
    if (diffMin < 60) return `${diffMin}m AGO`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h AGO`;
    return d.toLocaleDateString();
  } catch {
    return "—";
  }
}
