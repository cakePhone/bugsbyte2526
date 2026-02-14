"use client";

import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  createChart,
  CrosshairMode,
  LineStyle,
  LineSeries,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { useWarRoom, type TimeWindow, type ChartType } from "@/contexts/WarRoomContext";
import type { PricePoint } from "./types";
import { SearchActionPopup, type SearchAction } from "@/components/SearchActionPopup";
import { TradeModal, type TradeOrder } from "@/components/TradeModal";

/**
 * SUPERPOSITIONED GRAPH VIEWER — V5 Lightweight-Charts Engine
 *
 * XTB-style historical scroll & navigation.
 * lightweight-charts by TradingView for industrial-grade interaction.
 *
 * Features:
 *  - Scroll DOWN = zoom out (reveal past), sticky right edge
 *  - Superpositioned layers all share the same timeScale
 *  - CrosshairMode.Normal with thick white lines
 *  - JetBrains Mono X-axis, high-contrast white-on-black
 *  - Snap-to-Now red-bordered arrow button
 */

interface SuperpositionedGraphProps {
  priceHistories: Record<string, PricePoint[]>;
  currentPrices: Record<string, number>;
  availableAssets: string[];
  aiPredictions?: Record<string, { trend: "BULLISH" | "BEARISH" | "NEUTRAL"; confidence: number }>;
  apiErrors?: Record<string, boolean>;
  purchasePrices?: Record<string, number>;
}

const TIME_WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: "1H", label: "1H" },
  { key: "1D", label: "1D" },
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
];

const CHART_TYPES: { key: ChartType; label: string; icon: string }[] = [
  { key: "LINE", label: "LINE", icon: "╱" },
  { key: "CANDLESTICK", label: "CANDLE", icon: "┃" },
  { key: "MOUNTAIN", label: "MOUNTAIN", icon: "▲" },
];

/** Full catalog of supported crypto assets */
function useGlobalAssetCatalog() {
  const [allAssets, setAllAssets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/coins?limit=200")
      .then((res) => (res.ok ? res.json() : Promise.reject("FETCH_FAILED")))
      .then((data) => {
        if (cancelled) return;
        const coins: string[] = Array.isArray(data?.coins)
          ? data.coins.map((c: { symbol: string }) => c.symbol)
          : [];
        setAllAssets(coins);
      })
      .catch(() => {
        if (!cancelled) {
          setAllAssets([
            "BTC", "ETH", "XRP", "SOL", "ADA", "DOGE", "LTC", "AVAX",
            "DOT", "MATIC", "LINK", "UNI", "ATOM", "FIL", "NEAR",
            "APE", "SAND", "MANA", "AAVE", "CRV", "COMP", "MKR",
            "SHIB", "ALGO", "FTM", "HBAR",
          ]);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { allAssets, loading };
}

/**
 * Convert PricePoint[] to lightweight-charts line data format.
 * Timestamps must be in seconds (UTC) and sorted ascending.
 */
function toLineData(points: PricePoint[]) {
  const cleaned = points
    .map((p) => ({ timestamp: Number(p.timestamp), price: Number(p.price) }))
    .filter((p) => Number.isFinite(p.timestamp) && Number.isFinite(p.price) && p.price > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Deduplicate by timestamp (lightweight-charts requires unique timestamps)
  const seen = new Set<number>();
  const deduped: { time: Time; value: number }[] = [];
  for (const p of cleaned) {
    // Convert ms -> seconds if needed
    const ts = p.timestamp > 1e12 ? Math.floor(p.timestamp / 1000) : p.timestamp;
    if (!seen.has(ts)) {
      seen.add(ts);
      deduped.push({ time: ts as Time, value: p.price });
    }
  }
  return deduped;
}

export default function SuperpositionedGraph({
  priceHistories,
  currentPrices,
  availableAssets,
  aiPredictions = {},
  apiErrors = {},
  purchasePrices = {},
}: SuperpositionedGraphProps) {
  const {
    state,
    removeLayer,
    setPrimaryLayer,
    setTimeWindow,
    setPortal,
    soloAsset,
    superimposeAsset,
    setChartType,
  } = useWarRoom();

  // -- Refs for chart instances --
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesMapRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const chartTypeTrackerRef = useRef<string>(state.chartType);

  // -- Snap-to-now visibility --
  const [showSnapToNow, setShowSnapToNow] = useState(false);

  // -- Global asset search state --
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // -- Search action popup state --
  const [actionPopup, setActionPopup] = useState<{
    isOpen: boolean;
    symbol: string;
    position: { x: number; y: number };
  }>({ isOpen: false, symbol: "", position: { x: 0, y: 0 } });

  // -- Trade modal state --
  const [tradeModal, setTradeModal] = useState<{
    isOpen: boolean;
    symbol: string;
  }>({ isOpen: false, symbol: "" });

  // -- Chart type dropdown --
  const [chartTypeOpen, setChartTypeOpen] = useState(false);

  // Fetch the full catalog of coins from API
  const { allAssets: globalAssets, loading: catalogLoading } = useGlobalAssetCatalog();

  // Merge global + local assets for search (deduplicate)
  const searchableAssets = useMemo(() => {
    const merged = new Set([...globalAssets, ...availableAssets]);
    return Array.from(merged).sort();
  }, [globalAssets, availableAssets]);

  // Filter assets by search query
  const filteredAssets = useMemo(() => {
    const existingSymbols = new Set(state.layers.map((l) => l.symbol));
    const query = searchQuery.toUpperCase().trim();
    return searchableAssets
      .filter((a) => !existingSymbols.has(a))
      .filter((a) => !query || a.includes(query));
  }, [searchableAssets, state.layers, searchQuery]);

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [searchOpen]);

  // ===================================================================
  // CHART INITIALIZATION - lightweight-charts engine
  // ===================================================================
  useEffect(() => {
    if (!containerRef.current) return;

    // Dispose previous chart if it exists
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesMapRef.current.clear();
    }

    const chart = createChart(containerRef.current, {
      // -- Layout --
      layout: {
        background: { color: "#000000" },
        textColor: "#FFFFFF",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        fontSize: 11,
      },

      // -- Grid --
      grid: {
        vertLines: { color: "#1a1a1a", style: LineStyle.Dotted },
        horzLines: { color: "#1a1a1a", style: LineStyle.Dotted },
      },

      // -- Crosshair: thick white lines (border-4 aesthetic) --
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#FFFFFF",
          width: 2,
          style: LineStyle.Solid,
          labelBackgroundColor: "#000000",
        },
        horzLine: {
          color: "#FFFFFF",
          width: 2,
          style: LineStyle.Solid,
          labelBackgroundColor: "#000000",
        },
      },

      // -- Time Scale: XTB-style scroll mechanics --
      timeScale: {
        fixRightEdge: true,
        rightOffset: 12,
        minBarSpacing: 0.5,
        borderColor: "#333333",
        timeVisible: true,
        secondsVisible: false,
      },

      // -- Right Price Scale --
      rightPriceScale: {
        borderColor: "#333333",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },

      // -- Scroll / Zoom Configuration --
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: false },
      },
    });

    chartRef.current = chart;

    // -- Track visible range to show/hide snap-to-now --
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range) {
        setShowSnapToNow(false);
        return;
      }
      // If user has scrolled left (panned into history), show the snap button
      setShowSnapToNow(range.to < -5);
    });

    // -- Responsive resize --
    const container = containerRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          chart.applyOptions({ width, height });
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesMapRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chart created once

  // ===================================================================
  // DATA SYNCHRONIZATION - Update series when layers/data change
  // ===================================================================
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const currentSeriesMap = seriesMapRef.current;
    const activeLayers = state.layers.filter((l) => l.visible);
    const activeSymbols = new Set(activeLayers.map((l) => l.symbol));
    const isArea = state.chartType === "MOUNTAIN";

    // If chart type changed, remove all series and recreate
    if (chartTypeTrackerRef.current !== state.chartType) {
      chartTypeTrackerRef.current = state.chartType;
      Array.from(currentSeriesMap.entries()).forEach(([_sym, s]) => {
        chart.removeSeries(s);
      });
      currentSeriesMap.clear();
    }

    // Remove series for layers that no longer exist
    Array.from(currentSeriesMap.entries()).forEach(([sym, s]) => {
      if (!activeSymbols.has(sym)) {
        chart.removeSeries(s);
        currentSeriesMap.delete(sym);
      }
    });

    // Create or update series for each active layer
    for (const layer of activeLayers) {
      const data = toLineData(priceHistories[layer.symbol] || []);
      if (data.length < 2) continue;

      let series = currentSeriesMap.get(layer.symbol);

      if (!series) {
        if (isArea) {
          series = chart.addSeries(AreaSeries, {
            lineColor: layer.color,
            topColor: layer.color + "33",
            bottomColor: layer.color + "05",
            lineWidth: layer.isPrimary ? 3 : 2,
            lineStyle: layer.lineStyle === "dashed" ? LineStyle.Dashed : LineStyle.Solid,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 5,
            crosshairMarkerBorderColor: "#FFFFFF",
            crosshairMarkerBackgroundColor: layer.color,
            priceScaleId: layer.isPrimary ? "right" : layer.symbol,
          });
        } else {
          series = chart.addSeries(LineSeries, {
            color: layer.color,
            lineWidth: layer.isPrimary ? 3 : 2,
            lineStyle: layer.lineStyle === "dashed" ? LineStyle.Dashed : LineStyle.Solid,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 5,
            crosshairMarkerBorderColor: "#FFFFFF",
            crosshairMarkerBackgroundColor: layer.color,
            priceScaleId: layer.isPrimary ? "right" : layer.symbol,
          });
        }

        // Configure non-primary price scales to overlay (dont show separate axis)
        if (!layer.isPrimary) {
          chart.priceScale(layer.symbol).applyOptions({
            visible: false,
            scaleMargins: { top: 0.1, bottom: 0.1 },
          });
        }

        currentSeriesMap.set(layer.symbol, series);
      }

      // Set data - all layers share the same timeScale automatically
      series.setData(data);

      // Add entry price line if available
      const entryPrice = purchasePrices[layer.symbol];
      if (entryPrice && layer.isPrimary) {
        series.createPriceLine({
          price: entryPrice,
          color: "#FFD93D",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "ENTRY $" + entryPrice.toLocaleString(),
        });
      }
    }

    // Fit content to show all data
    chart.timeScale().fitContent();
  }, [state.layers, priceHistories, state.chartType, purchasePrices]);

  // ===================================================================
  // SNAP-TO-NOW - scroll back to current price
  // ===================================================================
  const handleSnapToNow = useCallback(() => {
    if (!chartRef.current) return;
    chartRef.current.timeScale().scrollToPosition(0, true);
    setShowSnapToNow(false);
  }, []);

  // ===================================================================
  // SEARCH ACTIONS
  // ===================================================================
  const handleSearchAction = useCallback((action: SearchAction, symbol: string) => {
    switch (action) {
      case "buy":
        setTradeModal({ isOpen: true, symbol });
        setSearchOpen(false);
        break;
      case "chart":
        soloAsset(symbol);
        setSearchOpen(false);
        break;
      case "merge":
        superimposeAsset(symbol);
        setSearchOpen(false);
        break;
    }
  }, [soloAsset, superimposeAsset]);

  // ===================================================================
  // TRADE EXECUTION
  // ===================================================================
  const handleTrade = useCallback(async (order: TradeOrder) => {
    try {
      if (order.side === "sell") {
        const res = await fetch("/api/user/wallets/sell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: order.symbol,
            amountCoin: order.quantity,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Sell failed");
        }

        alert("Sold " + order.quantity + " " + order.symbol);
        window.location.reload();
      } else {
        alert("Buy order for " + order.quantity + " " + order.symbol + " at $" + (order.price?.toFixed(2) || "?") + " - Wallet integration in progress.");
      }
    } catch (error) {
      console.error("[TRADE] Error:", error);
      alert(error instanceof Error ? error.message : "Trade execution failed");
    }
  }, []);

  // Determine if any layer has API error
  const hasApiError = state.layers.some((l) => apiErrors[l.symbol]);
  const layersWithNoData = state.layers.filter(
    (l) => l.visible && (!priceHistories[l.symbol] || priceHistories[l.symbol].length < 2)
  );
  const hasVisibleData = state.layers.some(
    (l) => l.visible && priceHistories[l.symbol]?.length >= 2
  );

  return (
    <div
      className={"border-4 bg-black flex flex-col relative " + (hasApiError ? "border-[#FF0000] animate-pulse" : "border-white")}
    >
      {/* === Top Bar: Asset Context === */}
      <div className="border-b-4 border-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Add Layer Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="border-4 border-white bg-black text-white px-3 py-1 text-sm font-black font-mono hover:bg-[#FF0000] hover:border-[#FF0000] transition-colors"
            title="SUPERIMPOSE NEW ASSET"
          >
            +
          </button>

          {/* Layer Tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {state.layers.map((layer) => {
              const isSuperimposed = !layer.isPrimary && state.layers.length > 1;

              return (
                <div
                  key={layer.id}
                  className={"flex items-center gap-2 border-4 px-3 py-1 min-w-[80px] cursor-pointer transition-colors select-none group " + (
                    layer.isPrimary
                      ? "border-white bg-white text-black"
                      : isSuperimposed
                        ? "text-white hover:opacity-80"
                        : apiErrors[layer.symbol]
                          ? "border-[#FF0000] text-[#FF0000]"
                          : "border-gray-600 text-gray-400 hover:border-white hover:text-white"
                  )}
                  style={{
                    borderColor: !layer.isPrimary && isSuperimposed ? layer.color : undefined,
                  }}
                  onClick={() => {
                    if (!layer.isPrimary) setPrimaryLayer(layer.id);
                  }}
                  title={layer.isPrimary ? "PRIMARY LAYER" : "CLICK TO SET " + layer.symbol + " AS PRIMARY"}
                >
                  <div
                    className="w-3 h-3 border-2"
                    style={{
                      backgroundColor: layer.visible ? layer.color : "transparent",
                      borderColor: layer.isPrimary ? "#000" : layer.color,
                    }}
                  />
                  <span className="text-[11px] font-black font-mono uppercase tracking-wider">
                    {layer.symbol}
                  </span>
                  {state.layers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(layer.id);
                      }}
                      className={"ml-1 text-[10px] font-black font-mono hover:text-[#FF0000] transition-colors " + (
                        layer.isPrimary ? "text-black/60 hover:text-[#FF0000]" : "text-gray-500"
                      )}
                      title={"REMOVE " + layer.symbol}
                    >
                      x
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-[10px] font-black font-mono text-gray-500 uppercase">
          {state.layers.filter((l) => l.visible).length} LAYERS ACTIVE
        </div>
      </div>

      {/* === Chart Container === */}
      <div className="relative flex-1 min-h-[400px]">
        {/* Chart Type Switcher: Top Right */}
        <div className="absolute top-2 right-2 z-20">
          <div className="relative">
            <button
              onClick={() => setChartTypeOpen(!chartTypeOpen)}
              className="border-4 border-white bg-black px-3 py-1 text-xs font-black font-mono uppercase tracking-widest text-white hover:bg-gray-900 transition-colors flex items-center gap-2"
            >
              <span>{CHART_TYPES.find((c) => c.key === state.chartType)?.icon}</span>
              <span>{state.chartType}</span>
              <span className="text-[8px] text-gray-500">&#9660;</span>
            </button>
            <AnimatePresence>
              {chartTypeOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full right-0 mt-1 border-4 border-white bg-black z-30"
                >
                  {CHART_TYPES.map((ct) => (
                    <button
                      key={ct.key}
                      onClick={() => {
                        setChartType(ct.key);
                        setChartTypeOpen(false);
                      }}
                      className={"w-full px-4 py-2 text-xs font-black font-mono uppercase flex items-center gap-2 transition-colors " + (
                        state.chartType === ct.key
                          ? "bg-white text-black"
                          : "text-gray-400 hover:bg-gray-900 hover:text-white"
                      )}
                    >
                      <span>{ct.icon}</span>
                      <span>{ct.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Signal Lost Overlay */}
        <AnimatePresence>
          {layersWithNoData.length > 0 && state.layers.length > 0 && !hasVisibleData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80"
            >
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="text-[#FF0000] font-black font-mono text-xl uppercase tracking-widest mb-2"
              >
                SIGNAL LOST
              </motion.div>
              <div className="text-gray-500 font-mono text-xs uppercase tracking-widest">
                RECONNECTING TO DATA FEED...
              </div>
              <div className="mt-4 text-[10px] font-mono text-gray-600">
                {layersWithNoData.map((l) => l.symbol).join(" / ")} — NO STREAM
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {state.layers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-mono text-sm uppercase z-10">
            CLICK [ + ] TO ADD ASSET DATA STREAMS...
          </div>
        )}

        {/* The lightweight-charts container */}
        <div
          ref={containerRef}
          className="w-full h-full min-h-[400px]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        />

        {/* === Snap-to-Now Button === */}
        <AnimatePresence>
          {showSnapToNow && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleSnapToNow}
              className="absolute bottom-16 right-4 z-20 border-4 border-[#FF0000] bg-black hover:bg-[#FF0000] transition-colors px-3 py-2 flex items-center gap-2 group cursor-pointer"
              title="SNAP TO CURRENT PRICE"
            >
              <span className="text-[#FF0000] group-hover:text-white font-black font-mono text-xs uppercase tracking-widest">
                NOW
              </span>
              <span className="text-[#FF0000] group-hover:text-white text-lg font-black">
                &#8594;
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Time Window Controls: Bottom Right */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 z-20">
          {TIME_WINDOWS.map((tw) => (
            <button
              key={tw.key}
              onClick={() => {
                setTimeWindow(tw.key);
                setTimeout(() => {
                  chartRef.current?.timeScale().fitContent();
                }, 100);
              }}
              className={"border-4 px-3 py-1 text-xs font-black font-mono uppercase tracking-widest transition-colors " + (
                state.timeWindow === tw.key
                  ? "border-white bg-white text-black"
                  : "border-gray-700 text-gray-500 hover:border-white hover:text-white"
              )}
            >
              {tw.label}
            </button>
          ))}
        </div>
      </div>

      {/* === GLOBAL ASSET SEARCH MODAL === */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] bg-black/70"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="border-4 border-white bg-black w-full max-w-lg font-mono"
            >
              {/* Modal Header */}
              <div className="border-b-4 border-white px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] font-black tracking-widest text-white uppercase">
                  DISCOVER ASSET — SUPERIMPOSE ON RADAR
                </span>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="text-gray-500 hover:text-[#FF0000] text-lg font-bold transition-colors"
                >
                  &#10005;
                </button>
              </div>

              {/* Search Input */}
              <div className="px-4 pt-4 pb-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  placeholder="TYPE SYMBOL... (BTC, ETH, SOL, DOGE...)"
                  className="w-full bg-black border-4 border-white text-white font-mono font-bold text-sm px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:border-[#FF0000] transition-colors uppercase tracking-wider"
                />
                <div className="text-[8px] font-mono text-gray-600 mt-1 uppercase tracking-widest">
                  {catalogLoading ? "LOADING FULL CATALOG..." : searchableAssets.length + " SUPPORTED ASSETS"}
                  {" \u2022 SCOPE: ALL EXCHANGES"}
                </div>
              </div>

              {/* Results */}
              <div className="max-h-[300px] overflow-y-auto border-t-4 border-white">
                {filteredAssets.length === 0 ? (
                  <div className="px-4 py-6 text-xs font-mono text-gray-600 uppercase text-center">
                    {searchQuery ? "NO MATCHING ASSETS FOUND" : "ALL ASSETS ARE ALREADY ON RADAR"}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-0">
                    {filteredAssets.slice(0, 60).map((asset) => (
                      <button
                        key={asset}
                        onClick={(e) => {
                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          setActionPopup({
                            isOpen: true,
                            symbol: asset,
                            position: { x: rect.right + 8, y: rect.top },
                          });
                        }}
                        className="border-b border-r border-gray-800 px-3 py-2 text-xs font-black font-mono text-gray-400 hover:bg-[#FF0000] hover:text-white hover:border-[#FF0000] transition-colors uppercase text-center"
                      >
                        {asset}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Action Popup */}
      <SearchActionPopup
        isOpen={actionPopup.isOpen}
        onClose={() => setActionPopup((prev) => ({ ...prev, isOpen: false }))}
        symbol={actionPopup.symbol}
        position={actionPopup.position}
        onAction={handleSearchAction}
      />

      {/* Trade Modal */}
      <TradeModal
        isOpen={tradeModal.isOpen}
        onClose={() => setTradeModal({ isOpen: false, symbol: "" })}
        symbol={tradeModal.symbol}
        currentPrice={currentPrices[tradeModal.symbol] || 0}
        onTrade={handleTrade}
      />
    </div>
  );
}
