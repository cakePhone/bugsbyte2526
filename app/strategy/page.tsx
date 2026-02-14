"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface StrategyReview {
  stance: "STRONG" | "GOOD" | "CAUTION" | "RISK";
  score: number;
  summary: string;
  actions: string[];
  confidence: number;
  updatedAt: number;
  basedOnTxId: string | null;
}

interface StrategyTransaction {
  id: string;
  symbol: string;
  type: string;
  amount: number;
  price: number;
  totalValue: number;
  pnl: number | null;
  exchange: string | null;
  isOverdrive: boolean;
  confidence: number | null;
  reasoning: string | null;
  ts: number;
}

interface StrategyPayload {
  wallet: {
    balanceUsdt: number;
    assets: Record<string, number>;
    totalPnL: number;
  };
  transactions: StrategyTransaction[];
  latestReview: StrategyReview;
}

export default function StrategyAnalysisPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<StrategyPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetch("/api/auth/me");
      if (!me.ok) {
        router.push("/");
        return;
      }
      const { user } = await me.json();
      if (!user) {
        router.push("/");
        return;
      }

      const res = await fetch("/api/strategy-analysis", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load strategy analysis");
      }

      const data = (await res.json()) as StrategyPayload;
      setPayload(data);
      setAuthChecked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const typeStyles = useMemo(
    () => ({
      BUY: "border-white text-white",
      SELL: "border-[#FF0000] text-[#FF0000]",
      TOPUP: "border-[#D4AF37] text-[#D4AF37]",
      WITHDRAWAL: "border-gray-500 text-gray-400",
      TRANSFER: "border-gray-500 text-gray-400",
      ADJUSTMENT: "border-gray-500 text-gray-400",
    }),
    [],
  );

  if (!authChecked && loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-white font-mono text-2xl font-bold animate-pulse">
            STRATEGY
          </div>
          <div className="text-gray-500 font-mono text-sm">
            LOADING STRATEGY ANALYSIS...
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-white animate-ping"></div>
            <div className="w-2 h-2 bg-white animate-ping" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-white animate-ping" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white font-mono">
      <header className="border-b-4 border-white bg-black sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-bold uppercase tracking-tighter">
            🧠 STRATEGY ANALYSIS
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="border-2 border-gray-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:border-white hover:text-white transition-colors"
            >
              REFRESH
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="border-2 border-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
            >
              ← WAR ROOM
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4 pb-20">
        {error && (
          <div className="border-4 border-[#FF0000] bg-black p-4 text-sm text-[#FF0000]">
            {error.toUpperCase()}
          </div>
        )}

        {payload?.latestReview && (
          <section className="border-4 border-white bg-black">
            <div className="border-b-4 border-white px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-[#D4AF37]">
                LATEST STRATEGY REVIEW
              </span>
              <span className="text-[10px] text-gray-500">
                UPDATED{" "}
                {new Date(payload.latestReview.updatedAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border-2 border-white px-2 py-1 text-xs font-bold">
                  STANCE: {payload.latestReview.stance}
                </span>
                <span className="border-2 border-[#D4AF37] px-2 py-1 text-xs font-bold text-[#D4AF37]">
                  SCORE: {payload.latestReview.score}/100
                </span>
                <span className="border-2 border-gray-600 px-2 py-1 text-xs font-bold text-gray-400">
                  CONFIDENCE: {payload.latestReview.confidence}%
                </span>
              </div>

              <p className="text-sm font-bold text-white">
                {payload.latestReview.summary}
              </p>

              <div className="space-y-1">
                {payload.latestReview.actions.map((action) => (
                  <div key={action} className="text-xs text-gray-300">
                    {">"} {action}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="border-4 border-white bg-black">
          <div className="border-b-4 border-white px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-bold tracking-widest">
              TRANSACTION HISTORY
            </span>
            <span className="text-[10px] text-gray-500">
              {(payload?.transactions?.length || 0).toLocaleString()} EVENTS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-gray-700 text-gray-500">
                  <th className="text-left px-3 py-2">TIME</th>
                  <th className="text-left px-3 py-2">TYPE</th>
                  <th className="text-left px-3 py-2">ASSET</th>
                  <th className="text-right px-3 py-2">AMOUNT</th>
                  <th className="text-right px-3 py-2">VALUE</th>
                  <th className="text-right px-3 py-2">PNL</th>
                </tr>
              </thead>
              <tbody>
                {(payload?.transactions || []).map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-gray-900 hover:bg-gray-950"
                  >
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(tx.ts).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`border px-1.5 py-0.5 font-bold ${typeStyles[tx.type as keyof typeof typeStyles] ||
                          "border-gray-600 text-gray-400"
                          }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-bold">{tx.symbol}</td>
                    <td className="px-3 py-2 text-right">
                      {tx.amount.toLocaleString(undefined, {
                        maximumFractionDigits: 8,
                      })}
                    </td>
                    <td className="px-3 py-2 text-right">
                      $
                      {tx.totalValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-bold ${tx.pnl === null
                          ? "text-gray-500"
                          : tx.pnl >= 0
                            ? "text-green-400"
                            : "text-[#FF0000]"
                        }`}
                    >
                      {tx.pnl === null
                        ? "-"
                        : `${tx.pnl >= 0 ? "+" : ""}${tx.pnl.toFixed(2)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && (payload?.transactions?.length || 0) === 0 && (
              <div className="p-8 text-center text-gray-500">
                NO TRANSACTIONS RECORDED YET.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
