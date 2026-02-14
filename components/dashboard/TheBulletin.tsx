/**
 * THE BULLETIN — High-Contrast News Feed
 * Geisha Gains • Coffee Driven Development
 *
 * Vertical news list: border-4 border-black.
 * SELL → Red border. Global Score > 8 → Gold border.
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { NewsAnalysis } from "@/app/api/news/analyze/route";

interface BulletinProps {
  analyses: NewsAnalysis[];
  onSelectArticle?: (analysis: NewsAnalysis) => void;
  selectedId?: string;
  page?: number;
  totalPages?: number;
  onPrevPage?: () => void;
  onNextPage?: () => void;
}

export default function TheBulletin({
  analyses,
  onSelectArticle,
  selectedId,
  page = 1,
  totalPages = 1,
  onPrevPage,
  onNextPage,
}: BulletinProps) {
  return (
    <div className="border-4 border-white bg-black h-full flex flex-col">
      {/* Header */}
      <div className="border-b-4 border-white px-4 py-2 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-widest text-white">
            THE BULLETIN
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <div className="w-2 h-2 bg-[#FF0000] animate-pulse" />
            <span className="text-xs text-gray-400">
              {analyses.length} ITEMS
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <span>
            PAGE {page}/{Math.max(1, totalPages)}
          </span>
          <button
            onClick={onPrevPage}
            disabled={page <= 1}
            className="border border-gray-700 px-2 py-1 disabled:opacity-40"
          >
            PREV
          </button>
          <button
            onClick={onNextPage}
            disabled={page >= totalPages}
            className="border border-gray-700 px-2 py-1 disabled:opacity-40"
          >
            NEXT
          </button>
        </div>
      </div>

      {/* News Items */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {analyses.map((item, i) => {
            const isSell = item.action === "SELL";
            const isHighGlobal = item.global_score > 8;
            const isLethal = item.sentiment === "LETHAL";
            const isSelected = selectedId === item.id;

            let borderColor = "border-gray-700";
            if (isLethal) borderColor = "border-[#FF0000]";
            else if (isSell) borderColor = "border-[#FF0000]";
            else if (isHighGlobal) borderColor = "border-[#D4AF37]";

            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelectArticle?.(item)}
                className={`w-full text-left border-b-2 ${borderColor} p-4 transition-colors ${
                  isSelected ? "bg-gray-900" : "bg-black hover:bg-gray-950"
                } ${isLethal ? "animate-pulse" : ""}`}
              >
                {/* Top: threat badge + time */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ThreatBadge level={item.threat_level} />
                    <SentimentTag sentiment={item.sentiment} />
                    <ActionTag action={item.action} />
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {formatTime(item.timestamp)}
                  </span>
                </div>

                {/* Headline */}
                <p
                  className={`text-sm font-bold leading-tight mb-1 ${
                    isLethal
                      ? "text-[#FF0000]"
                      : isSell
                        ? "text-[#FF6666]"
                        : "text-white"
                  }`}
                >
                  {item.original.headline}
                </p>

                {/* Summary */}
                <p className="text-xs text-gray-400 leading-snug">
                  {item.summary}
                </p>

                {/* AI Re-evaluation */}
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`text-[9px] font-bold px-1 py-0.5 border ${
                      item.ai_review.verdict === "AGREE"
                        ? "border-green-500 text-green-400"
                        : item.ai_review.verdict === "DISAGREE"
                          ? "border-[#FF0000] text-[#FF0000]"
                          : "border-[#D4AF37] text-[#D4AF37]"
                    }`}
                  >
                    AI REVIEW: {item.ai_review.verdict}
                  </span>
                </div>

                {/* Footer: source + affected assets */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-gray-600">
                    {item.original.source}
                  </span>
                  <div className="flex gap-1">
                    {item.affected_assets.map((sym) => (
                      <span
                        key={sym}
                        className="text-[9px] font-bold px-1.5 py-0.5 border border-gray-700 text-gray-400"
                      >
                        {sym}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {analyses.length === 0 && (
          <div className="p-8 text-center text-gray-600 text-sm">
            SCANNING NEWS FEEDS...
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function ThreatBadge({ level }: { level: number }) {
  let bg = "bg-gray-800 text-gray-400";
  if (level >= 8) bg = "bg-[#FF0000] text-white";
  else if (level >= 5) bg = "bg-[#D4AF37] text-black";

  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 ${bg}`}>
      T{level}
    </span>
  );
}

function SentimentTag({ sentiment }: { sentiment: string }) {
  const colors: Record<string, string> = {
    LETHAL: "text-[#FF0000] border-[#FF0000]",
    BEARISH: "text-[#FF6666] border-[#FF6666]",
    BULLISH: "text-green-400 border-green-400",
  };

  return (
    <span
      className={`text-[9px] font-bold px-1 py-0.5 border ${colors[sentiment] || "text-gray-400 border-gray-600"}`}
    >
      {sentiment}
    </span>
  );
}

function ActionTag({ action }: { action: string }) {
  const colors: Record<string, string> = {
    SELL: "bg-[#FF0000] text-white",
    BUY: "bg-white text-black",
    HODL: "bg-gray-800 text-gray-300",
    REBALANCE: "bg-[#D4AF37] text-black",
  };

  return (
    <span
      className={`text-[9px] font-bold px-1.5 py-0.5 ${colors[action] || "bg-gray-800 text-gray-400"}`}
    >
      {action}
    </span>
  );
}

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "NOW";
    if (diffMin < 60) return `${diffMin}m AGO`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h AGO`;
    return d.toLocaleDateString();
  } catch {
    return "--";
  }
}
