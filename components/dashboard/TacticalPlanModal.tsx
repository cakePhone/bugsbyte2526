"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * TACTICAL PLAN MODAL — Intelligence & AI Verdict Window
 *
 * Brutalist industrial design. JetBrains Mono throughout.
 * Opens when [ PLAN ] is clicked in Tactical Holdings.
 *
 * Left:  Alpha Vantage NEWS_SENTIMENT headlines
 * Right: NVIDIA NIM AI_ANALYSIS_STREAM
 * Footer: [ EXECUTE_STRATEGY ] button
 */

// ─── Types ───────────────────────────────────────────────────────────

type RiskProfile = "LOW_VOL" | "BALANCED" | "HIGH_VOL";
type Goal = "PROFIT_TAKING" | "CAPITAL_PRESERVATION";

interface NewsHeadline {
  title: string;
  source: string;
  sentiment: string;
  sentimentScore: number;
  publishedAt: string;
}

interface TacticalVerdict {
  verdict: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  observations: string[];
  bestMove: string;
  news: NewsHeadline[];
  reasoning: string;
}

interface TacticalPlanModalProps {
  isOpen: boolean;
  symbol: string;
  currentPrice: number;
  change24h: number;
  onClose: () => void;
  onExecute?: (symbol: string, verdict: string) => void;
}

// ─── Animation ───────────────────────────────────────────────────────

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, y: -8, x: 4, scaleY: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    x: 0,
    scaleY: 1,
    transition: {
      duration: 0.18,
      ease: [0.22, 0, 0.36, 1] as [number, number, number, number],
      y: { type: "spring" as const, stiffness: 600, damping: 30 },
      x: { type: "spring" as const, stiffness: 600, damping: 30 },
    },
  },
  exit: {
    opacity: 0,
    y: 6,
    x: -4,
    scaleY: 0.97,
    transition: { duration: 0.12 },
  },
};

// ─── Component ───────────────────────────────────────────────────────

export default function TacticalPlanModal({
  isOpen,
  symbol,
  currentPrice,
  change24h,
  onClose,
  onExecute,
}: TacticalPlanModalProps) {
  // Tactical Settings
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("BALANCED");
  const [goal, setGoal] = useState<Goal>("PROFIT_TAKING");

  // API state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TacticalVerdict | null>(null);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch evaluation ───────────────────────────────────────────────

  const runEvaluation = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setResult(null);
    setStreamText("");
    setError(null);

    try {
      const res = await fetch("/api/tactical-eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          currentPrice,
          change24h,
          riskProfile,
          goal,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TacticalVerdict = await res.json();
      setResult(data);

      // Simulate typing effect for analysis stream
      const fullText = [
        `VERDICT: ${data.verdict} (${data.confidence}% confidence)`,
        "",
        "TACTICAL OBSERVATIONS:",
        ...data.observations.map((o, i) => `  ${i + 1}. ${o}`),
        "",
        `BEST MOVE: ${data.bestMove}`,
        "",
        `REASONING: ${data.reasoning}`,
      ].join("\n");

      // Typewriter
      let idx = 0;
      const typeInterval = setInterval(() => {
        if (idx < fullText.length) {
          setStreamText(fullText.slice(0, idx + 1));
          idx++;
        } else {
          clearInterval(typeInterval);
        }
      }, 8);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("EVALUATION FAILED — RETRYING ADVISED");
        console.error("[TacticalPlanModal]", err);
      }
    } finally {
      setLoading(false);
    }
  }, [symbol, currentPrice, change24h, riskProfile, goal]);

  // Auto-evaluate on open and when settings change
  useEffect(() => {
    if (isOpen && symbol) {
      runEvaluation();
    }
    return () => abortRef.current?.abort();
  }, [isOpen, symbol, riskProfile, goal, runEvaluation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  if (!isOpen) return null;

  const verdictColor =
    result?.verdict === "BULLISH"
      ? "#00FF88"
      : result?.verdict === "BEARISH"
        ? "#FF3B3B"
        : "#FFD93D";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/85"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-[90vw] max-w-[1100px] max-h-[85vh] bg-black border-4 border-white flex flex-col font-mono select-none overflow-hidden"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* ── HEADER ─────────────────────────────────────── */}
            <div className="flex items-center justify-between border-b-4 border-white px-6 py-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-white uppercase tracking-[0.2em]">
                  [ TACTICAL_EVALUATION : {symbol} ]
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  ${currentPrice.toFixed(2)} |{" "}
                  <span
                    className={change24h >= 0 ? "text-[#00FF88]" : "text-[#FF3B3B]"}
                  >
                    {change24h >= 0 ? "+" : ""}
                    {change24h.toFixed(2)}%
                  </span>
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-white text-2xl font-black font-mono hover:text-[#FF3B3B] transition-colors leading-none px-2"
              >
                X
              </button>
            </div>

            {/* ── TACTICAL SETTINGS ──────────────────────────── */}
            <div className="border-b-2 border-gray-800 px-6 py-3 flex items-center gap-6 flex-wrap">
              {/* Risk Profile */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">
                  RISK:
                </span>
                {(["LOW_VOL", "BALANCED", "HIGH_VOL"] as RiskProfile[]).map(
                  (r) => (
                    <button
                      key={r}
                      onClick={() => setRiskProfile(r)}
                      className={`text-[10px] font-black font-mono uppercase tracking-wider px-3 py-1 border-2 transition-colors ${
                        riskProfile === r
                          ? "border-white bg-white text-black"
                          : "border-gray-700 text-gray-500 hover:border-white hover:text-white"
                      }`}
                    >
                      {r.replace("_", " ")}
                    </button>
                  )
                )}
              </div>

              {/* Goal */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">
                  GOAL:
                </span>
                {(
                  ["PROFIT_TAKING", "CAPITAL_PRESERVATION"] as Goal[]
                ).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`text-[10px] font-black font-mono uppercase tracking-wider px-3 py-1 border-2 transition-colors ${
                      goal === g
                        ? "border-white bg-white text-black"
                        : "border-gray-700 text-gray-500 hover:border-white hover:text-white"
                    }`}
                  >
                    {g.replace("_", " ")}
                  </button>
                ))}
              </div>

              {/* Re-evaluate */}
              <button
                onClick={runEvaluation}
                disabled={loading}
                className="ml-auto text-[10px] font-black font-mono uppercase tracking-wider px-3 py-1 border-2 border-gray-700 text-gray-500 hover:border-[#00D4FF] hover:text-[#00D4FF] transition-colors disabled:opacity-30"
              >
                {loading ? "SCANNING..." : "RE-EVALUATE"}
              </button>
            </div>

            {/* ── BODY: Two Columns ──────────────────────────── */}
            <div className="flex-1 grid grid-cols-2 min-h-0 overflow-hidden">
              {/* LEFT — Intelligence (News) */}
              <div className="border-r-4 border-white flex flex-col min-h-0">
                <div className="px-4 py-3 border-b-2 border-gray-800">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">
                    INTELLIGENCE — NEWS_SENTIMENT
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loading && !result ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-[10px] text-gray-600 font-mono uppercase tracking-widest animate-pulse">
                        FETCHING INTELLIGENCE...
                      </div>
                    </div>
                  ) : result?.news && result.news.length > 0 ? (
                    result.news.map((item, idx) => (
                      <div
                        key={idx}
                        className="border-2 border-gray-800 p-3 hover:border-gray-600 transition-colors"
                      >
                        <div className="text-[11px] text-white font-mono leading-snug mb-2">
                          {item.title}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-gray-500 font-mono uppercase">
                            {item.source}
                          </span>
                          <span
                            className={`text-[9px] font-black font-mono uppercase ${
                              item.sentimentScore > 0.1
                                ? "text-[#00FF88]"
                                : item.sentimentScore < -0.1
                                  ? "text-[#FF3B3B]"
                                  : "text-[#FFD93D]"
                            }`}
                          >
                            {item.sentiment} ({item.sentimentScore.toFixed(2)})
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-gray-600 font-mono uppercase tracking-widest text-center py-8">
                      NO INTELLIGENCE AVAILABLE
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT — AI Analysis Stream */}
              <div className="flex flex-col min-h-0">
                <div className="px-4 py-3 border-b-2 border-gray-800 flex items-center justify-between">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">
                    AI_ANALYSIS_STREAM
                  </span>
                  {result && (
                    <span
                      className="text-xs font-black font-mono"
                      style={{ color: verdictColor }}
                    >
                      {result.verdict}
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {loading && !streamText ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent animate-spin" />
                      <div className="text-[10px] text-gray-600 font-mono uppercase tracking-widest animate-pulse">
                        NIM EVALUATING...
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-[10px] text-[#FF3B3B] font-mono font-black uppercase tracking-widest">
                        {error}
                      </div>
                    </div>
                  ) : streamText ? (
                    <pre className="text-[11px] text-white font-mono whitespace-pre-wrap leading-relaxed">
                      {streamText}
                      {loading && (
                        <span className="animate-pulse text-[#00D4FF]">▌</span>
                      )}
                    </pre>
                  ) : (
                    <div className="text-[10px] text-gray-600 font-mono uppercase tracking-widest text-center py-8">
                      AWAITING ANALYSIS...
                    </div>
                  )}

                  {/* Verdict banner */}
                  {result && !loading && (
                    <div
                      className="mt-6 border-2 p-4"
                      style={{ borderColor: verdictColor }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="text-lg font-black font-mono"
                          style={{ color: verdictColor }}
                        >
                          {result.verdict}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          CONFIDENCE: {result.confidence}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-900 mb-3">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${result.confidence}%`,
                            backgroundColor: verdictColor,
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono uppercase">
                        BEST MOVE: {result.bestMove}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── FOOTER ─────────────────────────────────────── */}
            <div className="border-t-4 border-white px-6 py-4 flex items-center justify-between">
              <div className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">
                NVIDIA NIM • LLAMA-3 • ALPHA VANTAGE NEWS_SENTIMENT
              </div>
              <button
                disabled={!result || loading}
                onClick={() => {
                  if (result) {
                    onExecute?.(symbol, result.verdict);
                    onClose();
                  }
                }}
                className={`px-8 py-3 font-black font-mono text-xs uppercase tracking-[0.2em] border-4 transition-all ${
                  result && !loading
                    ? "border-white bg-white text-black hover:bg-[#00FF88] hover:border-[#00FF88] hover:text-black"
                    : "border-gray-800 bg-gray-900 text-gray-700 cursor-not-allowed"
                }`}
              >
                [ EXECUTE_STRATEGY ]
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
