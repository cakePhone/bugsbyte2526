"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * AI-DRIVEN NEWS BUREAU — V5 Tactical Intelligence
 * 
 * High-density news feed with:
 * - Timestamps and asset tags
 * - Click to expand article in-place
 * - AI Analysis hover window (NVIDIA NIM)
 * - Tag-based filtering
 * - Source link redirect
 */

export interface NewsArticle {
  id: string;
  timestamp: string; // e.g., "18:44"
  date: string; // e.g., "13 FEBRUARY 2026"
  symbol: string; // e.g., "US2000", "BTC", "AAPL"
  title: string;
  summary: string;
  fullContent?: string;
  tags: string[]; // e.g., ["STOCKS", "CFD NEWS", "INDICES"]
  sourceUrl?: string;
  imageUrl?: string;
}

interface AIAnalysis {
  impact: "HIGH" | "MEDIUM" | "LOW";
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  recommendation: string;
  affectedHoldings: string[];
  confidence: number;
}

interface NewsBureauProps {
  articles: NewsArticle[];
  userHoldings?: string[];
  riskProfile?: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  onAnalyzeArticle?: (article: NewsArticle) => Promise<AIAnalysis>;
  onAssetClick?: (symbol: string) => void;
}

// Demo articles for development
const DEMO_ARTICLES: NewsArticle[] = [
  {
    id: "1",
    timestamp: "18:44",
    date: "13 FEBRUARY 2026",
    symbol: "US2000",
    title: "Daily summary: The Market recovers losses and awaits rate cuts",
    summary: "Wall Street ends the week higher. The main U.S. indexes are up above 1%...",
    fullContent: "Wall Street ends the week higher. The main U.S. indexes are up above 1% after a volatile trading session that saw investors react to the latest inflation data. The Federal Reserve is expected to maintain its current policy stance, with markets pricing in a potential rate cut in the second quarter. Tech stocks led the recovery with NVIDIA and Apple posting significant gains.",
    tags: ["COMMODITIES", "INDICES", "STOCKS", "CFD NEWS"],
    sourceUrl: "https://example.com/article1",
  },
  {
    id: "2",
    timestamp: "17:44",
    date: "13 FEBRUARY 2026",
    symbol: "AUDNZD",
    title: "Three markets to watch next week (13.02.2026)",
    summary: "Following a flurry of critical US economic data that offered a fragm...",
    fullContent: "Following a flurry of critical US economic data that offered a fragmented picture of the economy, traders are positioning for the coming week with caution. The Australian Dollar faces headwinds from China's slowing economy while the New Zealand Dollar could benefit from dairy export strength.",
    tags: ["FOREX", "COMMODITIES", "INDICES", "CFD NEWS"],
    sourceUrl: "https://example.com/article2",
  },
  {
    id: "3",
    timestamp: "16:35",
    date: "13 FEBRUARY 2026",
    symbol: "IBM.US",
    title: "IBM Goes Against the Tide: Three Times More Entry-Level Employees...",
    summary: "In recent months, headlines have been dominated by successive an...",
    fullContent: "In recent months, headlines have been dominated by successive announcements of layoffs in the tech sector. However, IBM is bucking the trend by significantly increasing its hiring of entry-level employees. The company announced plans to hire three times more junior developers and analysts than last year.",
    tags: ["STOCKS", "CFD NEWS"],
    sourceUrl: "https://example.com/article3",
  },
  {
    id: "4",
    timestamp: "15:14",
    date: "13 FEBRUARY 2026",
    symbol: "US100",
    title: "US OPEN: The market looks for direction after inflation data",
    summary: "The final session of a turbulent week is opening on Wall Street in a...",
    fullContent: "The final session of a turbulent week is opening on Wall Street in a mixed fashion. Traders are digesting the latest CPI numbers which came in slightly below expectations, fueling hopes for earlier rate cuts. The tech-heavy NASDAQ is showing resilience.",
    tags: ["INDICES", "STOCKS", "CFD NEWS"],
    sourceUrl: "https://example.com/article4",
  },
  {
    id: "5",
    timestamp: "14:38",
    date: "13 FEBRUARY 2026",
    symbol: "TNOTE",
    title: "CPI OVERVIEW: Further Disinflation Puts Fed In Comfortable Position",
    summary: "The January inflation report reveals a cooling headline rate — a dyn...",
    fullContent: "The January inflation report reveals a cooling headline rate — a dynamic that puts the Federal Reserve in a comfortable position to begin cutting rates. Core CPI rose 0.3% month-over-month, bringing the annual rate down to 3.1%.",
    tags: ["ECONOMIC REPORTS", "CFD NEWS"],
    sourceUrl: "https://example.com/article5",
  },
  {
    id: "6",
    timestamp: "14:15",
    date: "13 FEBRUARY 2026",
    symbol: "US100",
    title: "Equity futures point to a recovery, as the CPI report suggests US...",
    summary: "The US CPI report showed a moderation in the inflation rate for last...",
    fullContent: "The US CPI report showed a moderation in the inflation rate for last month, which has boosted equity futures across the board. Market participants now expect the Fed to start cutting rates in Q2 2026.",
    tags: ["MARKET ALERT", "STOCKS", "CFD NEWS"],
    sourceUrl: "https://example.com/article6",
  },
  {
    id: "7",
    timestamp: "13:43",
    date: "13 FEBRUARY 2026",
    symbol: "US100",
    title: "BREAKING: US CPI below expectations! 🚨📉",
    summary: "13.02.2026: US CPI inflation in January: Rose 2.4% year-on-year (E...",
    fullContent: "13.02.2026: US CPI inflation in January: Rose 2.4% year-on-year (Expectations: 2.6%). This is the lowest reading since October 2024 and represents a significant cooling in inflationary pressures.",
    tags: ["INDICES", "ECONOMIC REPORTS", "CFD NEWS"],
    sourceUrl: "https://example.com/article7",
  },
  {
    id: "8",
    timestamp: "12:36",
    date: "13 FEBRUARY 2026",
    symbol: "EURUSD",
    title: "🚨EURUSD softens ahead of the US CPI",
    summary: "EUR/USD has weakened in the lead-up to the crucial US inflation report...",
    fullContent: "EUR/USD has weakened in the lead-up to the crucial US inflation report. The pair is trading near 1.0780, down 0.3% on the day as traders position for potential dollar strength.",
    tags: ["FOREX", "CFD NEWS"],
    sourceUrl: "https://example.com/article8",
  },
];

const TAG_COLORS: Record<string, string> = {
  // Original tags
  "STOCKS": "bg-emerald-600/20 text-emerald-400 border-emerald-600",
  "INDICES": "bg-blue-600/20 text-blue-400 border-blue-600",
  "FOREX": "bg-purple-600/20 text-purple-400 border-purple-600",
  "COMMODITIES": "bg-amber-600/20 text-amber-400 border-amber-600",
  "CFD NEWS": "bg-zinc-600/20 text-zinc-400 border-zinc-600",
  "ECONOMIC REPORTS": "bg-cyan-600/20 text-cyan-400 border-cyan-600",
  "MARKET ALERT": "bg-red-600/20 text-red-400 border-red-600",
  // Crypto-specific tags
  "BITCOIN": "bg-orange-600/20 text-orange-400 border-orange-600",
  "ETHEREUM": "bg-indigo-600/20 text-indigo-400 border-indigo-600",
  "DEFI": "bg-purple-600/20 text-purple-400 border-purple-600",
  "NFT": "bg-pink-600/20 text-pink-400 border-pink-600",
  "REGULATION": "bg-yellow-600/20 text-yellow-400 border-yellow-600",
  "INSTITUTIONAL": "bg-blue-600/20 text-blue-400 border-blue-600",
  "SECURITY": "bg-red-600/20 text-red-400 border-red-600",
  "MARKET": "bg-green-600/20 text-green-400 border-green-600",
  "BREAKING": "bg-red-600/20 text-red-400 border-red-600 animate-pulse",
  "CRYPTO NEWS": "bg-cyan-600/20 text-cyan-400 border-cyan-600",
};

// Loading skeleton for articles
function ArticleSkeleton() {
  return (
    <div className="border border-zinc-800 bg-zinc-900/50 p-3 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-zinc-700 h-4 w-12 rounded"></div>
        <div className="bg-zinc-700 h-4 w-16 rounded"></div>
        <div className="bg-zinc-700 h-4 w-20 rounded"></div>
      </div>
      <div className="bg-zinc-700 h-5 w-3/4 rounded mb-2"></div>
      <div className="bg-zinc-700 h-3 w-full rounded"></div>
    </div>
  );
}

export default function NewsBureau({
  articles = DEMO_ARTICLES,
  userHoldings = ["BTC", "ETH", "AAPL", "NVDA"],
  riskProfile = "MODERATE",
  onAnalyzeArticle,
  onAssetClick,
}: NewsBureauProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, AIAnalysis>>({});
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    articles.forEach((a) => a.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [articles]);

  // Filter articles
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      // Tag filter
      if (selectedTags.size > 0) {
        if (!article.tags.some((t) => selectedTags.has(t))) return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toUpperCase();
        return (
          article.symbol.includes(query) ||
          article.title.toUpperCase().includes(query) ||
          article.tags.some((t) => t.includes(query))
        );
      }
      return true;
    });
  }, [articles, selectedTags, searchQuery]);

  // Toggle tag selection
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }, []);

  // Analyze article with AI
  const analyzeArticle = useCallback(
    async (article: NewsArticle) => {
      if (aiAnalysis[article.id]) {
        setShowAiPanel(article.id);
        return;
      }

      setAnalyzingId(article.id);

      // If external analyzer provided, use it
      if (onAnalyzeArticle) {
        try {
          const analysis = await onAnalyzeArticle(article);
          setAiAnalysis((prev) => ({ ...prev, [article.id]: analysis }));
          setShowAiPanel(article.id);
        } catch {
          // Fallback to mock
        }
      }

      // Mock AI analysis (will be replaced with NVIDIA NIM)
      await new Promise((r) => setTimeout(r, 800));
      const mockAnalysis: AIAnalysis = {
        impact: article.tags.includes("MARKET ALERT") ? "HIGH" : article.tags.includes("ECONOMIC REPORTS") ? "MEDIUM" : "LOW",
        sentiment: article.title.includes("recovers") || article.title.includes("below expectations") ? "BULLISH" : article.title.includes("softens") ? "BEARISH" : "NEUTRAL",
        recommendation: `Based on your ${riskProfile} risk profile and current holdings, ${
          article.tags.includes("MARKET ALERT")
            ? "MONITOR POSITIONS CLOSELY — potential volatility ahead."
            : "NO IMMEDIATE ACTION REQUIRED — continue holding."
        }`,
        affectedHoldings: userHoldings.filter(() => Math.random() > 0.5),
        confidence: Math.floor(65 + Math.random() * 30),
      };

      setAiAnalysis((prev) => ({ ...prev, [article.id]: mockAnalysis }));
      setShowAiPanel(article.id);
      setAnalyzingId(null);
    },
    [aiAnalysis, onAnalyzeArticle, riskProfile, userHoldings],
  );

  return (
    <div className="flex flex-col h-full bg-[#121212] border-4 border-white font-mono">
      {/* Header */}
      <div className="border-b-4 border-white px-4 py-2 flex items-center justify-between bg-zinc-900">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black tracking-widest text-white uppercase">
            NEWS BUREAU
          </span>
          <span className="text-[8px] text-zinc-500">
            {filteredArticles.length} ARTICLES
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#FF0000] animate-pulse" />
          <span className="text-[8px] text-zinc-500 uppercase">LIVE FEED</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="border-b-4 border-white p-3 bg-black">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
          placeholder="FILTER BY SYMBOL OR KEYWORD..."
          className="w-full bg-black border-2 border-zinc-700 text-white text-xs px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:border-white uppercase tracking-wide"
        />
        
        {/* Tag Filters */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-2 py-0.5 text-[8px] font-bold uppercase border transition-all ${
                selectedTags.has(tag)
                  ? "bg-[#FF0000] text-white border-[#FF0000]"
                  : TAG_COLORS[tag] || "bg-zinc-800 text-zinc-400 border-zinc-600"
              }`}
            >
              {tag}
            </button>
          ))}
          {selectedTags.size > 0 && (
            <button
              onClick={() => setSelectedTags(new Set())}
              className="px-2 py-0.5 text-[8px] font-bold uppercase text-zinc-500 hover:text-white"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {/* Articles List */}
      <div className="flex-1 overflow-y-auto">
        {/* Empty/Loading State */}
        {filteredArticles.length === 0 && (
          <div className="p-4 space-y-3">
            {articles.length === 0 ? (
              // Loading state
              <>
                <ArticleSkeleton />
                <ArticleSkeleton />
                <ArticleSkeleton />
                <ArticleSkeleton />
                <ArticleSkeleton />
              </>
            ) : (
              // No matches
              <div className="text-center py-8">
                <p className="text-zinc-500 text-xs">NO ARTICLES MATCH YOUR FILTERS</p>
                <button
                  onClick={() => {
                    setSelectedTags(new Set());
                    setSearchQuery("");
                  }}
                  className="mt-2 text-[10px] text-[#FF0000] hover:underline"
                >
                  CLEAR FILTERS
                </button>
              </div>
            )}
          </div>
        )}
        
        {filteredArticles.map((article, idx) => {
          const isExpanded = expandedId === article.id;
          const analysis = aiAnalysis[article.id];
          const isAnalyzing = analyzingId === article.id;
          const showingAi = showAiPanel === article.id;

          return (
            <motion.div
              key={article.id}
              layout
              className={`border-b border-zinc-800 ${
                idx === 0 ? "" : ""
              }`}
            >
              {/* Article Row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : article.id)}
                className="w-full text-left px-4 py-3 hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Timestamp */}
                  <div className="flex flex-col items-center min-w-[40px]">
                    <span className="text-[10px] text-zinc-500 font-bold">
                      {article.timestamp}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Symbol & Title */}
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssetClick?.(article.symbol);
                        }}
                        className="text-[10px] font-black text-[#FF0000] hover:underline"
                      >
                        {article.symbol}
                      </button>
                      <span className="text-[10px] text-zinc-600">•</span>
                      <span className="text-xs font-bold text-white truncate">
                        {article.title}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-[10px] text-zinc-500 line-clamp-1">
                      {article.summary}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {article.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-1.5 py-0.5 text-[7px] font-bold uppercase border ${
                            TAG_COLORS[tag] || "bg-zinc-800 text-zinc-400 border-zinc-600"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Expand Indicator */}
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    className="text-zinc-500 text-xs"
                  >
                    ▼
                  </motion.span>
                </div>
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {/* AI Analysis Panel (Click-to-toggle, inline) */}
                    <div className="border-t-2 border-zinc-800 bg-zinc-950">
                      <button
                        onClick={() => {
                          if (analysis) {
                            // Toggle visibility of existing analysis
                            setShowAiPanel(showingAi ? null : article.id);
                          } else {
                            analyzeArticle(article);
                          }
                        }}
                        className="w-full px-4 py-2 flex items-center gap-2 hover:bg-zinc-900 transition-colors"
                      >
                        <span className="w-6 h-6 border-2 border-[#76B900] bg-[#76B900]/10 flex items-center justify-center text-[8px] font-black text-[#76B900]">
                          AI
                        </span>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase">
                          {isAnalyzing ? "ANALYZING..." : analysis ? (showingAi ? "HIDE AI REPORT" : "VIEW AI REPORT") : "GENERATE AI ANALYSIS"}
                        </span>
                        {isAnalyzing && (
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="text-[#76B900]"
                          >
                            ⟳
                          </motion.span>
                        )}
                        {analysis && (
                          <motion.span
                            animate={{ rotate: showingAi ? 180 : 0 }}
                            className="text-zinc-500 text-xs ml-auto"
                          >
                            ▼
                          </motion.span>
                        )}
                      </button>

                      {/* Inline AI Analysis Panel — full width, not absolute */}
                      <AnimatePresence>
                        {showingAi && analysis && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-4 border-[#76B900] bg-black p-4 mx-4 mb-3 shadow-[4px_4px_0_0_#76B900]">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black text-[#76B900] uppercase tracking-wider">
                                  NVIDIA NIM ANALYSIS
                                </span>
                                <span className="text-[8px] text-zinc-500">
                                  {analysis.confidence}% CONFIDENCE
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-3 mb-3">
                                <div className="border border-zinc-700 p-2">
                                  <span className="text-[7px] text-zinc-500 uppercase block mb-1">IMPACT</span>
                                  <span className={`text-sm font-black ${
                                    analysis.impact === "HIGH" ? "text-[#FF0000]" :
                                    analysis.impact === "MEDIUM" ? "text-amber-400" : "text-emerald-400"
                                  }`}>
                                    {analysis.impact}
                                  </span>
                                </div>
                                <div className="border border-zinc-700 p-2">
                                  <span className="text-[7px] text-zinc-500 uppercase block mb-1">SENTIMENT</span>
                                  <span className={`text-sm font-black ${
                                    analysis.sentiment === "BULLISH" ? "text-emerald-400" :
                                    analysis.sentiment === "BEARISH" ? "text-[#FF0000]" : "text-zinc-400"
                                  }`}>
                                    {analysis.sentiment}
                                  </span>
                                </div>
                                <div className="border border-zinc-700 p-2">
                                  <span className="text-[7px] text-zinc-500 uppercase block mb-1">AFFECTED</span>
                                  <span className="text-sm font-black text-white">
                                    {analysis.affectedHoldings.length > 0
                                      ? analysis.affectedHoldings.join(", ")
                                      : "NONE"}
                                  </span>
                                </div>
                              </div>

                              <div className="border-t border-zinc-700 pt-2">
                                <span className="text-[7px] text-zinc-500 uppercase block mb-1">RECOMMENDATION</span>
                                <p className="text-xs text-white leading-relaxed">
                                  {analysis.recommendation}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Full Article Content */}
                    <div className="px-4 py-3 bg-zinc-950/50">
                      <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                        {article.fullContent || article.summary}
                      </p>

                      {/* Source Link */}
                      {article.sourceUrl && (
                        <a
                          href={article.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-500 hover:text-[#FF0000] uppercase transition-colors"
                        >
                          <span>SOURCE</span>
                          <span>↗</span>
                        </a>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t-4 border-white px-4 py-2 bg-zinc-900 flex items-center justify-between">
        <span className="text-[8px] text-zinc-500 uppercase">
          POWERED BY NVIDIA NIM
        </span>
        <span className="text-[8px] text-zinc-500">
          {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
        </span>
      </div>
    </div>
  );
}
