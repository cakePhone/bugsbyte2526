/**
 * DRAGGABLE DASHBOARD - Modular War Room
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import DraggableDashboard, { DashboardPanelConfig } from "@/components/dashboard/DraggableDashboard";
import DashboardPanel from "@/components/dashboard/DashboardPanel";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import TheBulletin from "@/components/dashboard/TheBulletin";
import ThreatRadar from "@/components/dashboard/ThreatRadar";
import PriceChartSVG from "@/components/dashboard/PriceChartSVG";
import { FatalEventLine } from "@/components/dashboard/ActionOverlay";
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

export default function DraggableWarRoom() {
  const router = useRouter();
  const [selectedArticle, setSelectedArticle] = useState<NewsAnalysis | null>(null);



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
        <div className="text-gray-500 font-mono text-sm">LOADING PROFILE...</div>
      </div>
    );
  }

  // Define all dashboard panels with their configurations
  const panels: DashboardPanelConfig[] = [
    {
      id: "portfolio-value",
      component: (
        <DashboardStatCard
          label="PORTFOLIO VALUE"
          value={formatMoney(totalHoldingsValue, displayCurrency)}
        />
      ),
      defaultLayout: {
        lg: { i: "portfolio-value", x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
        md: { i: "portfolio-value", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        sm: { i: "portfolio-value", x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
        xs: { i: "portfolio-value", x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 }
      }
    },
    {
      id: "opportunities",
      component: (
        <DashboardStatCard
          label="BEST OPPORTUNITIES"
          value={opportunityCount > 0 ? `${opportunityCount} LIVE` : "SCANNING"}
          alert={opportunityCount > 0}
        />
      ),
      defaultLayout: {
        lg: { i: "opportunities", x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
        md: { i: "opportunities", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        sm: { i: "opportunities", x: 2, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
        xs: { i: "opportunities", x: 2, y: 0, w: 2, h: 2, minW: 2, minH: 2 }
      }
    },
    {
      id: "arbitrage-pnl",
      component: (
        <DashboardStatCard
          label="ARBITRAGE P&L"
          value={`${cumulativePnL >= 0 ? "+" : ""}${formatMoney(cumulativePnL, "USD")}`}
          alert={cumulativePnL > 0}
        />
      ),
      defaultLayout: {
        lg: { i: "arbitrage-pnl", x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
        md: { i: "arbitrage-pnl", x: 6, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
        sm: { i: "arbitrage-pnl", x: 4, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
        xs: { i: "arbitrage-pnl", x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 }
      }
    },
    {
      id: "exchange-spreads",
      component: (
        <DashboardPanel
          title="EXCHANGE SPREADS"
          headerActions={
            <div className="flex items-center gap-2">
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
          }
        >
          <ExchangeSpreadTable opportunities={opportunities} />
        </DashboardPanel>
      ),
      defaultLayout: {
        lg: { i: "exchange-spreads", x: 0, y: 2, w: 8, h: 6, minW: 6, minH: 4 },
        md: { i: "exchange-spreads", x: 0, y: 2, w: 7, h: 6, minW: 5, minH: 4 },
        sm: { i: "exchange-spreads", x: 0, y: 2, w: 6, h: 6, minW: 4, minH: 4 },
        xs: { i: "exchange-spreads", x: 0, y: 4, w: 4, h: 6, minW: 4, minH: 4 }
      }
    },
    {
      id: "opportunity-history",
      component: (
        <DashboardPanel
          title="OPPORTUNITY HISTORY"
          headerActions={
            <span className="text-[10px] text-gray-500">
              {opportunityHistory.length} EVENTS
            </span>
          }
          compact
        >
          <div className="p-2">
            {opportunityHistory.length === 0 ? (
              <div className="p-6 text-xs text-gray-500">
                WAITING FOR NET-PROFITABLE SPREADS...
              </div>
            ) : (
              opportunityHistory.map((item) => (
                <div
                  key={item.id}
                  className="border-b border-gray-800 px-2 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white">{item.symbol}</span>
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
        </DashboardPanel>
      ),
      defaultLayout: {
        lg: { i: "opportunity-history", x: 8, y: 2, w: 4, h: 6, minW: 3, minH: 4 },
        md: { i: "opportunity-history", x: 7, y: 2, w: 3, h: 6, minW: 3, minH: 4 },
        sm: { i: "opportunity-history", x: 0, y: 8, w: 6, h: 4, minW: 3, minH: 4 },
        xs: { i: "opportunity-history", x: 0, y: 10, w: 4, h: 4, minW: 3, minH: 4 }
      }
    },
    {
      id: "price-chart",
      component: (
        <DashboardPanel
          title="PRICE CHART"
          headerActions={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 flex-wrap">
                {selectedChartSymbols.map((symbol) => (
                  <span
                    key={symbol}
                    className="border border-white px-1 py-0.5 text-[8px] font-bold"
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
                <summary className="list-none cursor-pointer border border-white px-2 py-0.5 text-[8px] font-bold tracking-widest hover:bg-white hover:text-black transition-colors">
                  SELECT
                </summary>
                <div className="absolute right-0 top-6 z-20 w-32 border-2 border-white bg-black p-2 space-y-1">
                  {availableCoins.map((coin) => {
                    const checked = selectedChartSymbols.includes(coin);
                    return (
                      <label
                        key={coin}
                        className="flex items-center gap-1 text-xs font-bold text-white"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleChartSymbol(coin)}
                          className="accent-white scale-75"
                        />
                        <span>{coin}</span>
                      </label>
                    );
                  })}
                </div>
              </details>
            </div>
          }
        >
          <div className="p-2 h-full">
            <div className="mb-2 flex items-center gap-1">
              {chartTimeframes.map((timeframe) => (
                <button
                  key={timeframe.key}
                  onClick={() => setActiveTimeframe(timeframe.key)}
                  className={`border px-1 py-0.5 text-[8px] font-bold tracking-widest transition-colors ${
                    activeTimeframe === timeframe.key
                      ? "border-white bg-white text-black"
                      : "border-gray-700 text-gray-400 hover:border-white hover:text-white"
                  }`}
                >
                  {timeframe.label}
                </button>
              ))}
              {chartLoading && (
                <span className="text-[8px] font-bold text-gray-500 ml-2">
                  LOADING...
                </span>
              )}
            </div>

            <div className="relative h-[calc(100%-3rem)] min-h-0">
              <PriceChartSVG
                histories={priceHistories}
                selectedSymbols={selectedChartSymbols}
                timeframe={activeTimeframe}
                currency={displayCurrency}
              />
              <FatalEventLine
                events={fatalEvents}
                timeStart={
                  (priceHistories[selectedChartSymbols[0] || "BTC"] || [])[0]?.timestamp ?? Date.now()
                }
                timeEnd={
                  (priceHistories[selectedChartSymbols[0] || "BTC"] || []).at(-1)?.timestamp ?? Date.now()
                }
              />
            </div>
          </div>
        </DashboardPanel>
      ),
      defaultLayout: {
        lg: { i: "price-chart", x: 0, y: 8, w: 8, h: 6, minW: 6, minH: 4 },
        md: { i: "price-chart", x: 0, y: 8, w: 7, h: 6, minW: 5, minH: 4 },
        sm: { i: "price-chart", x: 0, y: 12, w: 6, h: 6, minW: 4, minH: 4 },
        xs: { i: "price-chart", x: 0, y: 14, w: 4, h: 6, minW: 4, minH: 4 }
      }
    },
    {
      id: "threat-radar",
      component: (
        <ThreatRadar
          analyses={analyses}
          sensitivity={profile.geopolitical_sensitivity}
          holdings={holdings}
        />
      ),
      defaultLayout: {
        lg: { i: "threat-radar", x: 8, y: 8, w: 4, h: 6, minW: 3, minH: 4 },
        md: { i: "threat-radar", x: 7, y: 8, w: 3, h: 6, minW: 3, minH: 4 },
        sm: { i: "threat-radar", x: 0, y: 18, w: 3, h: 6, minW: 3, minH: 4 },
        xs: { i: "threat-radar", x: 0, y: 20, w: 4, h: 6, minW: 3, minH: 4 }
      }
    },
    {
      id: "trade-log",
      component: (
        <TradeLog transactions={orders} />
      ),
      defaultLayout: {
        lg: { i: "trade-log", x: 0, y: 14, w: 8, h: 4, minW: 6, minH: 3 },
        md: { i: "trade-log", x: 0, y: 14, w: 7, h: 4, minW: 5, minH: 3 },
        sm: { i: "trade-log", x: 0, y: 24, w: 6, h: 4, minW: 4, minH: 3 },
        xs: { i: "trade-log", x: 0, y: 26, w: 4, h: 4, minW: 4, minH: 3 }
      }
    },
    {
      id: "news-bulletin",
      component: (
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
      ),
      defaultLayout: {
        lg: { i: "news-bulletin", x: 0, y: 18, w: 5, h: 6, minW: 4, minH: 4 },
        md: { i: "news-bulletin", x: 0, y: 18, w: 5, h: 6, minW: 4, minH: 4 },
        sm: { i: "news-bulletin", x: 3, y: 18, w: 3, h: 6, minW: 3, minH: 4 },
        xs: { i: "news-bulletin", x: 0, y: 30, w: 4, h: 6, minW: 4, minH: 4 }
      }
    },
    {
      id: "article-detail",
      component: (
        <ArticleDetailPanel article={selectedArticle} prices={prices} />
      ),
      defaultLayout: {
        lg: { i: "article-detail", x: 5, y: 18, w: 4, h: 6, minW: 3, minH: 4 },
        md: { i: "article-detail", x: 5, y: 18, w: 3, h: 6, minW: 3, minH: 4 },
        sm: { i: "article-detail", x: 0, y: 30, w: 6, h: 6, minW: 3, minH: 4 },
        xs: { i: "article-detail", x: 0, y: 36, w: 4, h: 6, minW: 3, minH: 4 }
      }
    },
    {
      id: "holdings",
      component: (
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
      ),
      defaultLayout: {
        lg: { i: "holdings", x: 9, y: 18, w: 3, h: 6, minW: 3, minH: 4 },
        md: { i: "holdings", x: 8, y: 18, w: 2, h: 6, minW: 2, minH: 4 },
        sm: { i: "holdings", x: 0, y: 36, w: 6, h: 6, minW: 3, minH: 4 },
        xs: { i: "holdings", x: 0, y: 42, w: 4, h: 6, minW: 3, minH: 4 }
      }
    },
    {
      id: "world-clock",
      component: (
        <DashboardPanel title="WORLD CLOCK">
          <WorldClock />
        </DashboardPanel>
      ),
      defaultLayout: {
        lg: { i: "world-clock", x: 8, y: 14, w: 4, h: 6, minW: 3, minH: 4 },
        md: { i: "world-clock", x: 7, y: 14, w: 3, h: 6, minW: 3, minH: 4 },
        sm: { i: "world-clock", x: 0, y: 28, w: 6, h: 6, minW: 3, minH: 4 },
        xs: { i: "world-clock", x: 0, y: 48, w: 4, h: 6, minW: 3, minH: 4 }
      }
    }
  ];

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

      <main className="max-w-[1600px] mx-auto p-4">
        <DraggableDashboard
          panels={panels}
          onLayoutChange={(layouts) => {
            console.log("Layout changed:", layouts);
          }}
        />
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