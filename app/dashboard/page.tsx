/**
 * THE WAR ROOM — Main Trading Dashboard
 *
 * Geisha Gains • BugsByte 2026
 * High-density, high-utility trading interface.
 * Minimalist Brutalist Design System.
 */

"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WarRoomLayout from "@/components/dashboard/WarRoomLayout";
import TacticalHoldings from "@/components/dashboard/TacticalHoldings";
import SuperpositionedGraph from "@/components/dashboard/SuperpositionedGraph";
import IntelligenceExchangeBar, {
  generateMockExchangeQuotes,
} from "@/components/dashboard/IntelligenceExchangeBar";
import { useWarRoom, type TimeWindow } from "@/contexts/WarRoomContext";
import type { ChartTimeframe } from "@/components/dashboard/types";
import useDashboardData from "./hooks/useDashboardData";
import useChartHistory from "./hooks/useChartHistory";
import useNewsAnalysis from "./hooks/useNewsAnalysis";
import useArbitrageMonitor from "./hooks/useArbitrageMonitor";

/** Map WarRoom TimeWindow → useChartHistory ChartTimeframe */
const TIME_WINDOW_MAP: Record<TimeWindow, ChartTimeframe> = {
  "1H": "1H",
  "1D": "24H",
  "1W": "7D",
  "1M": "30D",
};

/**
 * Symbols known to have working Yahoo Finance chart data.
 * Excludes stablecoins and tokens without reliable OHLC data.
 */
const SUPPORTED_CHART_SYMBOLS = new Set([
  "BTC",
  "ETH",
  "XRP",
  "SOL",
  "DOGE",
  "ADA",
  "AVAX",
  "DOT",
  "LINK",
  "MATIC",
  "UNI",
  "ATOM",
  "LTC",
  "BCH",
  "XLM",
  "ALGO",
  "NEAR",
  "ICP",
  "FIL",
  "VET",
  "HBAR",
  "EOS",
  "AAVE",
  "GRT",
  "SAND",
  "MANA",
  "AXS",
  "ENJ",
  "CRV",
  "COMP",
  "MKR",
  "SNX",
  "SUSHI",
  "YFI",
  "BAT",
  "ZRX",
  "1INCH",
  "ANKR",
  "CHZ",
  "GALA",
]);

/** Filter available coins to only those with working chart data */
function filterChartableCoins(coins: string[]): string[] {
  return coins.filter((symbol) => SUPPORTED_CHART_SYMBOLS.has(symbol));
}

// Inner component that uses the WarRoom context
function WarRoomContent() {
  const router = useRouter();
  const { state, updateSystemStatus, initLayers } = useWarRoom();

  const {
    profile,
    authChecked,
    displayCurrency,
    holdings,
    balanceUsdt,
    holdingValuesUsdt,
    holdingValuesDisplay,
    availableCoins,
    prices,
  } = useDashboardData(router);

  // Filter to only coins with working chart data
  const chartableCoins = useMemo(
    () => filterChartableCoins(availableCoins),
    [availableCoins],
  );

  const { analyses, isLoading, scanCount } = useNewsAnalysis({
    profile,
    holdings,
  });

  // Trade execution handlers
  const [isExecutingTrade, setIsExecutingTrade] = useState(false);

  const handleSellRequest = async (symbol: string, amount: number) => {
    if (isExecutingTrade) return;

    try {
      setIsExecutingTrade(true);
      const res = await fetch("/api/user/wallets/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          amountCoin: amount,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Sell failed");
      }

      // Reload user data after successful trade
      window.location.reload();
    } catch (error) {
      console.error("[SELL] Error:", error);
      alert(
        error instanceof Error ? error.message : "Failed to execute sell order",
      );
    } finally {
      setIsExecutingTrade(false);
    }
  };

  const handleBuyRequest = async (
    exchange: string,
    symbol: string,
    amountUsdt: number,
  ) => {
    if (isExecutingTrade) return;

    try {
      setIsExecutingTrade(true);
      const res = await fetch("/api/user/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          amountUsdt,
          exchange,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Buy failed");
      }

      window.location.reload();
    } catch (error) {
      console.error("[BUY] Error:", error);
      alert(
        error instanceof Error ? error.message : "Failed to execute buy order",
      );
    } finally {
      setIsExecutingTrade(false);
    }
  };

  // Get symbols from WarRoom state layers
  const selectedSymbols = useMemo(
    () => state.layers.map((layer) => layer.symbol),
    [state.layers],
  );

  // Initialize layers from first holding on first load (no BTC hardcoding)
  const holdingSymbols = useMemo(
    () =>
      Object.entries(holdings)
        .filter(([, amt]) => amt > 0)
        .map(([sym]) => sym),
    [holdings],
  );

  useEffect(() => {
    if (holdingSymbols.length > 0 && state.layers.length === 0) {
      initLayers(holdingSymbols);
    }
  }, [holdingSymbols, state.layers.length, initLayers]);

  // Map TimeWindow to ChartTimeframe
  const chartTimeframe = TIME_WINDOW_MAP[state.timeWindow];

  const { priceHistories, chartLoading, setActiveTimeframe } = useChartHistory({
    authChecked,
    selectedChartSymbols: selectedSymbols,
    displayCurrency,
  });

  // Sync WarRoom timeWindow → useChartHistory activeTimeframe
  useEffect(() => {
    setActiveTimeframe(chartTimeframe);
  }, [chartTimeframe, setActiveTimeframe]);

  // Track which layers have API errors (no data after loading)
  const [apiErrors, setApiErrors] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (chartLoading) return;
    const errors: Record<string, boolean> = {};
    selectedSymbols.forEach((sym) => {
      const hasData = priceHistories[sym] && priceHistories[sym].length >= 2;
      errors[sym] = !hasData;
    });
    setApiErrors(errors);
  }, [chartLoading, priceHistories, selectedSymbols]);

  const { loading: arbitrageLoading, scanCount: arbitrageScanCount } =
    useArbitrageMonitor(authChecked);

  // Compute threatened symbols from news analysis
  const threatenedSymbols = useMemo(() => {
    const set = new Set<string>();
    analyses.forEach((a) => {
      if (a.threat_level >= 9 && a.sentiment === "LETHAL") {
        a.affected_assets.forEach((sym) => {
          if (holdings[sym] && holdings[sym] > 0) set.add(sym);
        });
      }
    });
    return set;
  }, [analyses, holdings]);

  // Generate exchange quotes for the primary/solo asset (dynamic, no BTC fallback)
  const primarySymbol =
    state.layers.find((l) => l.isPrimary)?.symbol ||
    state.layers[0]?.symbol ||
    "";
  const primaryPrice = prices[primarySymbol] || 0;
  const exchangeQuotes = useMemo(
    () =>
      primarySymbol
        ? generateMockExchangeQuotes(primarySymbol, primaryPrice || 100)
        : [],
    [primarySymbol, primaryPrice],
  );

  // Mock AI predictions
  const aiPredictions = useMemo(() => {
    const predictions: Record<
      string,
      { trend: "BULLISH" | "BEARISH" | "NEUTRAL"; confidence: number }
    > = {};
    chartableCoins.forEach((coin) => {
      const rand = Math.random();
      predictions[coin] = {
        trend: rand > 0.6 ? "BULLISH" : rand > 0.3 ? "NEUTRAL" : "BEARISH",
        confidence: Math.floor(50 + Math.random() * 45),
      };
    });
    return predictions;
  }, [chartableCoins]);

  // Mock entry prices for holdings (simulates purchase prices)
  const purchasePrices = useMemo(() => {
    const entryPrices: Record<string, number> = {};
    Object.keys(holdings).forEach((sym) => {
      if (holdings[sym] > 0 && prices[sym]) {
        // Mock entry price as +/- 15% from current price
        const variance = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
        entryPrices[sym] = prices[sym] * variance;
      }
    });
    return entryPrices;
  }, [holdings, prices]);

  // Update system status based on loading states
  useEffect(() => {
    updateSystemStatus({
      nimLatency: 12 + Math.floor(Math.random() * 30),
      upholdApiStatus: arbitrageLoading ? "DEGRADED" : "ACTIVE",
    });
  }, [arbitrageLoading, updateSystemStatus]);

  if (!authChecked) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 font-mono text-sm uppercase tracking-widest animate-pulse">
          INITIALIZING WAR ROOM...
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      {/* Left Sidebar - Tactical Holdings (25% width) */}
      <div className="w-1/4 min-w-[280px] max-w-[400px]">
        <TacticalHoldings
          holdings={holdings}
          balanceUsdt={balanceUsdt}
          prices={prices}
          holdingValuesUsdt={holdingValuesUsdt}
          holdingValuesDisplay={holdingValuesDisplay}
          currency={displayCurrency}
          threatenedSymbols={threatenedSymbols}
          priceChanges24h={{}}
          onSellRequest={handleSellRequest}
        />
      </div>

      {/* Main Content Area (75% width) */}
      <div className="flex flex-col p-4 gap-4 w-full h-full">
        {/* Superpositioned Graph Viewer - shrinks when exchange bar expands */}
        <SuperpositionedGraph
          priceHistories={priceHistories}
          currentPrices={prices}
          availableAssets={chartableCoins}
          aiPredictions={aiPredictions}
          apiErrors={apiErrors}
          purchasePrices={purchasePrices}
        />

        {/* Intelligence Exchange Bar - fixed at bottom, doesn't overlap chart */}
        <IntelligenceExchangeBar
          quotes={exchangeQuotes}
          isLoading={chartLoading || arbitrageLoading}
          apiFailed={Object.values(apiErrors).some(Boolean)}
          onExecuteTrade={handleBuyRequest}
        />
      </div>
    </div>
  );
}

// Wrapper component to pass props to layout
function WarRoomWrapper() {
  const router = useRouter();

  const { profile, holdings, availableCoins } = useDashboardData(router);

  // Filter to only coins with working chart data
  const chartableCoins = useMemo(
    () => filterChartableCoins(availableCoins),
    [availableCoins],
  );

  const { isLoading, scanCount } = useNewsAnalysis({
    profile,
    holdings,
  });

  return (
    <WarRoomLayout
      scanCount={scanCount}
      isScanning={isLoading}
      availableAssets={chartableCoins}
    >
      <WarRoomContent />
    </WarRoomLayout>
  );
}

// Main Page Export
export default function WarRoom() {
  return <WarRoomWrapper />;
}
