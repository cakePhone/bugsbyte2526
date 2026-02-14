/**
 * THE WAR ROOM — Fixed Layout Trading Dashboard
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
import WorldClock from "@/components/WorldClock";
import ExchangeSpreadTable from "@/components/ExchangeSpreadTable";
import { TradeLog } from "@/components/TradeLog";
import { formatMoney } from "@/components/dashboard/formatting";
import type { NewsAnalysis } from "@/app/api/news/analyze/route";
import useDashboardData from "./hooks/useDashboardData";
import useChartHistory from "./hooks/useChartHistory";
import useNewsAnalysis from "./hooks/useNewsAnalysis";
import useHoldingsTrade from "./hooks/useHoldingsTrade";
import useArbitrageMonitor from "./hooks/useArbitrageMonitor";

export default function FixedWarRoom() {
  const router = useRouter();
  const [selectedArticle, setSelectedArticle] = useState<NewsAnalysis | null>(
    null,
  );

  // Handle layout toggle to draggable
  const toggleToDraggable = () => {
    localStorage.setItem("dashboard-draggable", "true");
    window.location.reload(); // Simple way to switch
  };

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
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

  const {
    loading: arbitrageLoading,
    scanCount: arbitrageScanCount,
    opportunities,
    orders,
    cumulativePnL,
    opportunityHistory,
  } = useArbitrageMonitor(authChecked);

  // Handle layout toggle
  const toggleLayout = toggleToDraggable;

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

  const opportunityCount = opportunities.filter(
    (opportunity) => opportunity.execution.shouldTrade,
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
              onClick={toggleLayout}
              className="border-2 border-purple-500 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-purple-400 hover:border-purple-300 hover:text-purple-300 transition-colors"
            >
              📐 DRAGGABLE
            </button>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <DashboardStatCard
            label="ARBITRAGE P&L"
            value={`${cumulativePnL >= 0 ? "+" : ""}${formatMoney(cumulativePnL, "USD")}`}
            alert={cumulativePnL > 0}
          />
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 xl:col-span-8 space-y-4">
            <div>
              <ExchangeSpreadTable opportunities={opportunities} />
              <div className="border-4 border-t-0 border-white bg-black px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-widest">
                  ARBITRAGE SCANS: {arbitrageScanCount}
                </span>
                <span
                  className={`text-[10px] font-bold font-mono uppercase tracking-widest ${
                    arbitrageLoading ? "text-red-500" : "text-gray-400"
                  }`}
                >
                  {arbitrageLoading ? "SYNCING FEEDS..." : "LIVE"}
                </span>
              </div>
            </div>

            <TradeLog transactions={orders} />
          </div>

          <div className="col-span-12 xl:col-span-4">
            <div className="border-4 border-white bg-black h-full max-h-[1000px] overflow-y-auto">
              <div className="border-b-4 border-white px-4 py-2 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest">
                  OPPORTUNITY HISTORY
                </h3>
                <span className="text-[10px] text-gray-500">
                  {opportunityHistory.length} EVENTS
                </span>
              </div>

              <div>
                {opportunityHistory.length === 0 ? (
                  <div className="p-6 text-xs text-gray-500">
                    WAITING FOR NET-PROFITABLE SPREADS...
                  </div>
                ) : (
                  opportunityHistory.map((item) => (
                    <div
                      key={item.id}
                      className="border-b border-gray-800 px-4 py-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white">
                          {item.symbol}
                        </span>
                        <span className="text-[#D4AF37] font-bold">
                          {item.netSpreadPct >= 0 ? "+" : ""}
                          {item.netSpreadPct.toFixed(4)}%
                        </span>
                      </div>
                      <div className="text-gray-400 mt-1">
                        BUY {item.buyExchange} → SELL {item.sellExchange}
                      </div>
                      <div className="text-gray-500 mt-1">
                        est. {item.estimatedNetUsdPerUnit >= 0 ? "+" : ""}$
                        {item.estimatedNetUsdPerUnit.toFixed(4)} / unit
                      </div>
                      <div className="text-gray-600 mt-1">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
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

      <WorldClock />

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
