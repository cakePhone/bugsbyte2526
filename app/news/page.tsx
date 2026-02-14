/**
 * NEWS BUREAU — AI-Driven Market Intelligence
 * 
 * Geisha Gains • V5 Tactical Intelligence
 * High-density news feed with NVIDIA NIM analysis.
 * Live crypto news from cryptocurrency.cv (200+ sources)
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import NewsBureau, { type NewsArticle } from "@/components/dashboard/NewsBureau";
import WarRoomFooter from "@/components/dashboard/WarRoomFooter";
import useDashboardData from "@/app/dashboard/hooks/useDashboardData";
import type { NewsAnalysisResponse } from "@/lib/nvidia-nim";

type NewsCategory = "all" | "bitcoin" | "defi" | "breaking";

export default function NewsPage() {
  const router = useRouter();
  const { holdings, profile } = useDashboardData(router);

  // News state
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<NewsCategory>("all");
  const [lastUpdate, setLastUpdate] = useState<string>("");

  // Fetch news from API
  const fetchNews = useCallback(async (cat: NewsCategory) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({ limit: "30" });
      if (cat !== "all") {
        params.set("category", cat);
      }
      
      const res = await fetch(`/api/crypto-news?${params}`);
      if (!res.ok) throw new Error("Failed to fetch news");
      
      const data = await res.json();
      if (data.success && data.articles) {
        setArticles(data.articles);
        setLastUpdate(new Date().toLocaleTimeString());
      } else {
        throw new Error(data.error || "No articles returned");
      }
    } catch (err) {
      console.error("[NEWS] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load news");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh every 2 minutes
  useEffect(() => {
    fetchNews(category);
    
    const interval = setInterval(() => {
      fetchNews(category);
    }, 120000); // 2 minutes
    
    return () => clearInterval(interval);
  }, [category, fetchNews]);

  // Get user holdings as array
  const userHoldings = useMemo(() => 
    Object.entries(holdings)
      .filter(([, amt]) => amt > 0)
      .map(([sym]) => sym),
    [holdings]
  );

  // Get risk profile
  const riskProfile = ((profile as { preferences?: { riskProfile?: string } })?.preferences?.riskProfile || "MODERATE") as 
    "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";

  // Analyze article with NVIDIA NIM
  const handleAnalyzeArticle = async (article: NewsArticle): Promise<NewsAnalysisResponse> => {
    const res = await fetch("/api/nim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "analyze-news",
        articleTitle: article.title,
        articleContent: article.fullContent || article.summary,
        relatedSymbol: article.symbol,
        userHoldings,
        riskProfile,
      }),
    });

    if (!res.ok) {
      throw new Error("Analysis failed");
    }

    return res.json();
  };

  // Handle asset click - navigate to dashboard with that asset solo'd
  const handleAssetClick = (symbol: string) => {
    router.push(`/dashboard?solo=${symbol}`);
  };

  // Handle category change
  const handleCategoryChange = (cat: NewsCategory) => {
    setCategory(cat);
  };

  // Handle manual refresh
  const handleRefresh = () => {
    fetchNews(category);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white font-mono flex flex-col">
      {/* Header */}
      <header className="border-b-4 border-white bg-black sticky top-0 z-50">
        <div className="flex items-center h-14">
          {/* Logo */}
          <div className="border-r-4 border-white h-full flex items-center px-4">
            <h1 className="text-lg font-black uppercase tracking-tighter text-white whitespace-nowrap">
              ☕ GEISHA GAINS
            </h1>
          </div>

          {/* Title */}
          <div className="flex-1 px-4">
            <span className="text-xs font-black uppercase tracking-widest text-[#FF0000]">
              NEWS BUREAU
            </span>
            <span className="text-[8px] text-zinc-500 ml-2 uppercase">
              AI-DRIVEN MARKET INTELLIGENCE • 200+ SOURCES
            </span>
          </div>

          {/* Category Filters */}
          <div className="flex items-center h-full border-l-4 border-white">
            {(["all", "breaking", "bitcoin", "defi"] as NewsCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`h-full px-3 text-[10px] font-black uppercase tracking-wider transition-colors ${
                  category === cat
                    ? "bg-[#FF0000] text-white"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {cat === "all" ? "ALL" : cat.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="h-full border-l-4 border-white px-4 text-xs font-black uppercase tracking-widest text-white hover:bg-[#FF0000] transition-colors disabled:opacity-50"
          >
            {loading ? "[ LOADING... ]" : "[ REFRESH ]"}
          </button>

          {/* Navigation */}
          <nav className="flex items-center h-full">
            <button
              onClick={() => router.push("/dashboard")}
              className="h-full border-l-4 border-white px-4 text-xs font-black font-mono uppercase tracking-widest text-white hover:bg-[#FF0000] transition-colors"
            >
              [ WAR ROOM ]
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="h-full border-l-4 border-white px-4 text-xs font-black font-mono uppercase tracking-widest text-white hover:bg-[#FF0000] transition-colors"
            >
              [ BASE ]
            </button>
          </nav>
        </div>
      </header>

      {/* Status Bar */}
      <div className="bg-black border-b border-zinc-800 px-4 py-1 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-4">
          <span className="text-zinc-500">
            SOURCE: <span className="text-emerald-400">CRYPTOCURRENCY.CV</span>
          </span>
          <span className="text-zinc-500">
            ARTICLES: <span className="text-white">{articles.length}</span>
          </span>
          <span className="text-zinc-500">
            CATEGORY: <span className="text-[#FF0000] uppercase">{category}</span>
          </span>
        </div>
        <div className="text-zinc-500">
          LAST UPDATE: <span className="text-white">{lastUpdate || "--:--:--"}</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex">
        {error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[#FF0000] text-xl font-black mb-4">⚠ INTEL COMPROMISED</p>
              <p className="text-zinc-500 text-sm mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="border-4 border-white px-6 py-2 text-sm font-black hover:bg-white hover:text-black transition-colors"
              >
                [ RETRY ]
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <NewsBureau
              articles={articles}
              userHoldings={userHoldings}
              riskProfile={riskProfile}
              onAnalyzeArticle={handleAnalyzeArticle}
              onAssetClick={handleAssetClick}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <WarRoomFooter connectionStatus={loading ? "reconnecting" : "connected"} />
    </div>
  );
}
