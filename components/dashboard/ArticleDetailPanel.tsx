"use client";

import { motion } from "framer-motion";
import type { NewsAnalysis } from "@/app/api/news/analyze/route";

export default function ArticleDetailPanel({
  article,
  prices,
}: {
  article: NewsAnalysis | null;
  prices: Record<string, number>;
}) {
  if (!article) {
    return (
      <div className="border-4 border-white bg-black h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-gray-600 text-4xl mb-4">◉</div>
          <p className="text-gray-600 text-sm">
            SELECT AN ARTICLE FROM THE BULLETIN
          </p>
        </div>
      </div>
    );
  }

  const isLethal = article.sentiment === "LETHAL";
  const isSell = article.action === "SELL";
  const primaryAsset =
    article.affected_assets.find((sym) => Number(prices[sym]) > 0) ||
    article.affected_assets[0] ||
    "BTC";

  return (
    <motion.div
      className={`border-4 bg-black h-full flex flex-col ${
        isLethal
          ? "border-[#FF0000]"
          : isSell
            ? "border-[#FF6666]"
            : "border-white"
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={article.id}
    >
      <div className="border-b-4 border-white px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-bold text-white">INTEL REPORT</span>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 ${
              article.sentiment === "LETHAL"
                ? "bg-[#FF0000] text-white"
                : article.sentiment === "BEARISH"
                  ? "bg-[#FF6666] text-white"
                  : "bg-green-600 text-white"
            }`}
          >
            {article.sentiment}
          </span>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <h3
          className={`text-lg font-bold leading-tight ${isLethal ? "text-[#FF0000]" : "text-white"}`}
        >
          {article.original.headline}
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <ScoreMeter
            label="GLOBAL SCORE"
            value={article.global_score}
            max={10}
          />
          <ScoreMeter
            label="PORTFOLIO THREAT"
            value={article.portfolio_threat}
            max={10}
            danger
          />
        </div>

        <div className="border-2 border-white p-3 bg-[#101010] space-y-2">
          <div className="text-[10px] text-gray-400 font-bold">
            AI QUICK READ
          </div>
          <p className="text-sm font-bold text-white">{article.summary}</p>
          <p className="text-xs text-gray-300">{article.reasoning}</p>
        </div>

        <div className="border-2 border-gray-700 p-3 bg-gray-950 space-y-3">
          <div className="text-[10px] text-gray-400 font-bold">
            RECOMMENDED ACTION
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span
              className={`text-sm font-bold px-3 py-1 border-2 ${
                article.action === "SELL"
                  ? "border-[#FF0000] text-[#FF0000]"
                  : article.action === "BUY"
                    ? "border-white text-white"
                    : article.action === "REBALANCE"
                      ? "border-[#D4AF37] text-[#D4AF37]"
                      : "border-gray-600 text-gray-400"
              }`}
            >
              {article.action}
            </span>
            <span className="text-[11px] text-gray-300 font-bold">
              BEST TARGET COIN: {primaryAsset}
            </span>
          </div>
        </div>

        <div className="border-2 border-gray-700 p-3 bg-gray-950 space-y-2">
          <div className="text-[10px] text-gray-400 font-bold mb-1">
            AI REVIEW — SOURCE RE-EVALUATION
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold px-1.5 py-0.5 border border-white text-white">
              AI SENTIMENT: {article.ai_review.revised_sentiment}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 border ${
                article.ai_review.verdict === "AGREE"
                  ? "border-green-500 text-green-400"
                  : article.ai_review.verdict === "DISAGREE"
                    ? "border-[#FF0000] text-[#FF0000]"
                    : "border-[#D4AF37] text-[#D4AF37]"
              }`}
            >
              VERDICT: {article.ai_review.verdict}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 border border-gray-600 text-gray-300">
              {article.ai_review.confidence}% CONFIDENCE
            </span>
          </div>
          <p className="text-xs text-gray-300">{article.ai_review.reasoning}</p>
        </div>

        <div>
          <div className="text-[10px] text-gray-500 font-bold mb-2">
            AFFECTED ASSETS
          </div>
          <div className="flex gap-2 flex-wrap">
            {article.affected_assets.map((sym) => (
              <span
                key={sym}
                className="text-xs font-bold px-2 py-1 border-2 border-white text-white"
              >
                {sym}
              </span>
            ))}
          </div>
        </div>

        <details className="border-2 border-gray-800 p-3">
          <summary className="cursor-pointer text-[10px] text-gray-500 font-bold">
            SOURCE CONTEXT
          </summary>
          <p className="mt-2 text-xs text-gray-400 leading-relaxed">
            {article.original.full_content}
          </p>
        </details>

        <div className="text-[10px] text-gray-600">
          SOURCE: {article.original.source} • {article.original.category} •{" "}
          {new Date(article.timestamp).toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
}

function ScoreMeter({
  label,
  value,
  max,
  danger = false,
}: {
  label: string;
  value: number;
  max: number;
  danger?: boolean;
}) {
  const pct = (value / max) * 100;
  const isHigh = value >= 7;

  return (
    <div className="border-2 border-gray-800 p-2">
      <div className="text-[9px] text-gray-500 font-bold mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div
          className={`text-xl font-bold ${danger && isHigh ? "text-[#FF0000]" : "text-white"}`}
        >
          {value}
        </div>
        <div className="flex-1 h-2 bg-gray-900">
          <motion.div
            className={`h-full ${danger && isHigh ? "bg-[#FF0000]" : pct > 70 ? "bg-[#D4AF37]" : "bg-white"}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[9px] text-gray-600">/{max}</span>
      </div>
    </div>
  );
}
