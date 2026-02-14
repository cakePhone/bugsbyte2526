/**
 * THE WAR ROOM — Main Trading Dashboard
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import TheBulletin from "@/components/dashboard/TheBulletin";
import ThreatRadar from "@/components/dashboard/ThreatRadar";
import { FatalEventLine } from "@/components/dashboard/ActionOverlay";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import PriceChartSVG from "@/components/dashboard/PriceChartSVG";
import ArticleDetailPanel from "@/components/dashboard/ArticleDetailPanel";
import HoldingsPanel from "@/components/dashboard/HoldingsPanel";
import HoldingsTradeModal from "@/components/dashboard/HoldingsTradeModal";
import { formatMoney } from "@/components/dashboard/formatting";
import type { NewsAnalysis } from "@/app/api/news/analyze/route";
import useDashboardData from "./hooks/useDashboardData";
import useChartHistory from "./hooks/useChartHistory";
import useNewsAnalysis from "./hooks/useNewsAnalysis";
import useHoldingsTrade from "./hooks/useHoldingsTrade";

export default function WarRoom() {
  const router = useRouter();
  const [selectedArticle, setSelectedArticle] = useState<NewsAnalysis | null>(
    null,
  );

  const {
    profile,
    authChecked,
    displayCurrency,
    holdings,
    holdingValuesUsdt,
    holdingValuesDisplay,
    availableCoins,
    selectedChartSymbols,
    prices,
    loadUserData,
    toggleChartSymbol,
  } = useDashboardData(router);

  const {
    analyses,
    isLoading,
    scanCount,
    newsPage,
    newsTotalPages,
    fatalEvents,
    setNewsPage,
  } = useNewsAnalysis({
    profile,
    holdings,
  });

  const {
    chartTimeframes,
    priceHistories,
    activeTimeframe,
    chartLoading,
    setActiveTimeframe,
  } = useChartHistory({
    authChecked,
    selectedChartSymbols,
    displayCurrency,
  });

  const {
    pendingHoldingsTrade,
    holdingsTradeSubmitting,
    holdingsTradeFeedback,
    setPendingHoldingsTrade,
    handleOpenHoldingsTrade,
    handleSubmitHoldingsTrade,
  } = useHoldingsTrade({
    displayCurrency,
    prices,
    loadUserData,
  });

  const totalHoldingsValue = Object.entries(holdings).reduce(
    (acc, [symbol, amount]) => {
      const serverValue =
        displayCurrency === "USD"
          ? holdingValuesUsdt[symbol]
          : holdingValuesDisplay[symbol];
      if (typeof serverValue === "number" && Number.isFinite(serverValue)) {
        return acc + serverValue;
      }
      const livePrice = Number(prices[symbol] || 0);
      if (!Number.isFinite(livePrice) || livePrice <= 0) return acc;
      return acc + amount * livePrice;
    },
    0,
  );

  const opportunityCount = analyses.filter(
    (analysis) =>
      analysis.action === "BUY" &&
      analysis.sentiment === "BULLISH" &&
      analysis.global_score >= 7 &&
      analysis.portfolio_threat <= 6,
  ).length;

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-gray-500 font-mono text-sm">
          LOADING PROFILE...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white font-mono">
      <header className="border-b-4 border-white bg-black sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter text-white">
              ☕ GEISHA GAINS
            </h1>
            <span className="text-[10px] font-bold border-2 border-white px-2 py-0.5 text-white hidden md:inline-block">
              WAR ROOM
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="border-2 border-white px-3 py-1 flex items-center gap-2">
              <motion.div
                className={`w-2 h-2 ${isLoading ? "bg-[#FF0000]" : "bg-green-400"}`}
                animate={isLoading ? { scale: [1, 1.4, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.3 }}
              />
              <span className="text-[10px] font-bold text-gray-300">
                {scanCount} SCANS
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 border ${
                  profile.risk_tolerance === "AGGRESSIVE"
                    ? "border-[#FF0000] text-[#FF0000]"
                    : profile.risk_tolerance === "MODERATE"
                      ? "border-[#D4AF37] text-[#D4AF37]"
                      : "border-gray-500 text-gray-400"
                }`}
              >
                {profile.risk_tolerance}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 border ${
                  profile.geopolitical_sensitivity === "PARANOID"
                    ? "border-[#FF0000] text-[#FF0000]"
                    : "border-gray-600 text-gray-500"
                }`}
              >
                {profile.geopolitical_sensitivity}
              </span>
            </div>

            <button
              onClick={() => router.push("/settings")}
              className="border-2 border-gray-600 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:border-white hover:text-white transition-colors"
            >
              ⚙ BASE
            </button>
            <button
              onClick={() => router.push("/fund")}
              className="border-2 border-[#D4AF37] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
            >
              $ FUND ARMY
            </button>
            <button
              onClick={() => router.push("/strategy")}
              className="border-2 border-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white hover:text-black transition-colors"
            >
              🧠 STRATEGY
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DashboardStatCard
            label="PORTFOLIO VALUE"
            value={formatMoney(totalHoldingsValue, displayCurrency)}
          />
          <DashboardStatCard
            label="BEST OPPORTUNITIES"
            value={
              opportunityCount > 0 ? `${opportunityCount} LIVE` : "SCANNING"
            }
            alert={opportunityCount > 0}
          />
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8">
            <div className="border-4 border-white bg-black">
              <div className="border-b-4 border-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedChartSymbols.map((symbol) => (
                    <span
                      key={symbol}
                      className="border-2 border-white px-2 py-1 text-[10px] font-bold"
                    >
                      {symbol} • {displayCurrency === "EUR" ? "€" : "$"}
                      {(prices[symbol] || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  ))}
                </div>

                <details className="relative">
                  <summary className="list-none cursor-pointer border-2 border-white px-3 py-1 text-[10px] font-bold tracking-widest hover:bg-white hover:text-black transition-colors">
                    SELECT COINS
                  </summary>
                  <div className="absolute right-0 top-8 z-20 w-40 border-2 border-white bg-black p-2 space-y-2">
                    {availableCoins.map((coin) => {
                      const checked = selectedChartSymbols.includes(coin);
                      return (
                        <label
                          key={coin}
                          className="flex items-center gap-2 text-xs font-bold text-white"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleChartSymbol(coin)}
                            className="accent-white"
                          />
                          <span>{coin}</span>
                        </label>
                      );
                    })}
                  </div>
                </details>
              </div>

              <div className="relative h-[300px] p-4">
                <div className="mb-3 flex items-center gap-2">
                  {chartTimeframes.map((timeframe) => (
                    <button
                      key={timeframe.key}
                      onClick={() => setActiveTimeframe(timeframe.key)}
                      className={`border-2 px-2 py-1 text-[10px] font-bold tracking-widest transition-colors ${
                        activeTimeframe === timeframe.key
                          ? "border-white bg-white text-black"
                          : "border-gray-700 text-gray-400 hover:border-white hover:text-white"
                      }`}
                    >
                      {timeframe.label}
                    </button>
                  ))}
                </div>

                {chartLoading && (
                  <div className="absolute top-16 right-6 z-10 text-[10px] font-bold text-gray-500">
                    LOADING HISTORY...
                  </div>
                )}

                <PriceChartSVG
                  histories={priceHistories}
                  selectedSymbols={selectedChartSymbols}
                  timeframe={activeTimeframe}
                  currency={displayCurrency}
                />
                <FatalEventLine
                  events={fatalEvents}
                  timeStart={
                    (priceHistories[selectedChartSymbols[0] || "BTC"] || [])[0]
                      ?.timestamp ?? Date.now()
                  }
                  timeEnd={
                    (priceHistories[selectedChartSymbols[0] || "BTC"] || []).at(
                      -1,
                    )?.timestamp ?? Date.now()
                  }
                />
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <ThreatRadar
              analyses={analyses}
              sensitivity={profile.geopolitical_sensitivity}
              holdings={holdings}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-5 max-h-[600px]">
            <TheBulletin
              analyses={analyses}
              onSelectArticle={setSelectedArticle}
              selectedId={selectedArticle?.id}
              page={newsPage}
              totalPages={newsTotalPages}
              onPrevPage={() => setNewsPage((page) => Math.max(1, page - 1))}
              onNextPage={() =>
                setNewsPage((page) => Math.min(newsTotalPages || 1, page + 1))
              }
            />
          </div>

          <div className="col-span-12 lg:col-span-4">
            <ArticleDetailPanel article={selectedArticle} prices={prices} />
          </div>

          <div className="col-span-12 lg:col-span-3">
            <HoldingsPanel
              holdings={holdings}
              prices={prices}
              holdingValuesUsdt={holdingValuesUsdt}
              holdingValuesDisplay={holdingValuesDisplay}
              currency={displayCurrency}
              analyses={analyses}
              onOpenTradeDialog={handleOpenHoldingsTrade}
              tradeFeedback={holdingsTradeFeedback}
            />
          </div>
        </div>
      </main>

      <footer className="border-t-4 border-white bg-black mt-8">
        <div className="max-w-[1600px] mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase text-gray-500">
            COFFEE DRIVEN DEVELOPMENT • BUGSBYTE 2026
          </span>
          <span className="text-[10px] uppercase text-gray-600">
            NVIDIA NIM • UPHOLD • LIVE NEWS
          </span>
        </div>
      </footer>

      <HoldingsTradeModal
        request={pendingHoldingsTrade}
        holdings={holdings}
        prices={prices}
        currency={displayCurrency}
        isSubmitting={holdingsTradeSubmitting}
        onCancel={() => {
          if (holdingsTradeSubmitting) return;
          setPendingHoldingsTrade(null);
        }}
        onSubmit={handleSubmitHoldingsTrade}
      />
    </div>
  );
}
