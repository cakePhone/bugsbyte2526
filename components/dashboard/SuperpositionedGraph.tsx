"use client";

import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWarRoom, type TimeWindow, type ChartType } from "@/contexts/WarRoomContext";
import type { PricePoint } from "./types";
import { SearchActionPopup, type SearchAction } from "@/components/SearchActionPopup";
import { TradeModal, type TradeOrder } from "@/components/TradeModal";

/**
 * SUPERPOSITIONED GRAPH VIEWER — V4 Main Content Engine
 * 
 * Military radar aesthetic. Multiple data transparencies stacked.
 * Purchase markers with entry price flags.
 * Chart type switcher: LINE / CANDLESTICK / MOUNTAIN
 * X-Axis Date/Time scale.
 * Left-click tab = REMOVE layer.
 */

interface SuperpositionedGraphProps {  
  priceHistories: Record<string, PricePoint[]>;
  currentPrices: Record<string, number>;
  availableAssets: string[];
  aiPredictions?: Record<string, { trend: "BULLISH" | "BEARISH" | "NEUTRAL"; confidence: number }>;
  apiErrors?: Record<string, boolean>;
  purchasePrices?: Record<string, number>; // Entry prices for holdings
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

/** Full catalog of supported crypto assets (no stocks - buy/sell only supports crypto) */
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
          // Fallback list (crypto only)
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
    addLayer,
    removeLayer,
    setPrimaryLayer,
    setTimeWindow,
    setPortal,
    soloAsset,
    superimposeAsset,
    setChartType,
  } = useWarRoom();

  const svgRef = useRef<SVGSVGElement>(null);

  // Global asset search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search action popup state
  const [actionPopup, setActionPopup] = useState<{
    isOpen: boolean;
    symbol: string;
    position: { x: number; y: number };
  }>({ isOpen: false, symbol: "", position: { x: 0, y: 0 } });

  // Trade modal state
  const [tradeModal, setTradeModal] = useState<{
    isOpen: boolean;
    symbol: string;
  }>({ isOpen: false, symbol: "" });

  // Zoom state for X-axis (time range expansion/contraction)
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%, 0.5 = 50%, 2 = 200%
  const [zoomCenter, setZoomCenter] = useState(0.5); // 0-1, where to center zoom

  // Chart type dropdown
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

  // SVG dimensions
  const width = 900;
  const height = 400;
  const padding = 40;

  // Filter layers that have price data
  const activeLayers = state.layers.filter(
    (layer) => layer.visible && priceHistories[layer.symbol]?.length >= 2
  );

  // Determine if any layer has API error
  const hasApiError = state.layers.some((l) => apiErrors[l.symbol]);
  const layersWithNoData = state.layers.filter(
    (l) => l.visible && (!priceHistories[l.symbol] || priceHistories[l.symbol].length < 2)
  );

  // Calculate normalized data for all layers
  // Each layer stores its own time bounds for proper superimposition
  const normalizedData = activeLayers.map((layer) => {
    const points = priceHistories[layer.symbol] || [];
    const cleaned = points
      .map((p) => ({ timestamp: Number(p.timestamp), price: Number(p.price) }))
      .filter((p) => Number.isFinite(p.timestamp) && Number.isFinite(p.price) && p.price > 0)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (cleaned.length < 2) return { layer, points: [], normalized: [], startTs: 0, endTs: 1, tsRange: 1 };

    const baseline = cleaned[0].price;
    const normalized = cleaned.map((p) => ({
      timestamp: p.timestamp,
      value: ((p.price - baseline) / baseline) * 100,
      price: p.price,
    }));

    // Store this layer's own time bounds
    const layerStartTs = Math.min(...cleaned.map((p) => p.timestamp));
    const layerEndTs = Math.max(...cleaned.map((p) => p.timestamp));
    const layerTsRange = layerEndTs - layerStartTs || 1;

    return { 
      layer, 
      points: cleaned, 
      normalized,
      startTs: layerStartTs,
      endTs: layerEndTs,
      tsRange: layerTsRange,
    };
  }).filter((d) => d.normalized.length >= 2);

  // Calculate global bounds
  const allNormalized = normalizedData.flatMap((d) => d.normalized.map((n) => n.value));
  const minPct = allNormalized.length > 0 ? Math.min(...allNormalized, -0.1) : -5;
  const maxPct = allNormalized.length > 0 ? Math.max(...allNormalized, 0.1) : 5;
  const range = maxPct - minPct || 1;

  // Use PRIMARY layer's time range for X-axis display (other layers normalize to fit)
  const primaryData = normalizedData.find((d) => d.layer.isPrimary) || normalizedData[0];
  const rawStartTs = primaryData?.startTs ?? Date.now() - 86400000;
  const rawEndTs = primaryData?.endTs ?? Date.now();
  const rawTsRange = rawEndTs - rawStartTs || 1;

  // Apply zoom to time range
  const zoomedTsRange = rawTsRange / zoomLevel;
  const centerTs = rawStartTs + rawTsRange * zoomCenter;
  const startTs = centerTs - zoomedTsRange / 2;
  const endTs = centerTs + zoomedTsRange / 2;
  const tsRange = endTs - startTs || 1;

  // Reset zoom on double-click
  const handleDoubleClick = useCallback(() => {
    setZoomLevel(1);
    setZoomCenter(0.5);
  }, []);

  // Handle hover for tactical portal
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || normalizedData.length === 0) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const svgX = (x / rect.width) * width;

    // Convert to data coordinates
    const dataX = startTs + ((svgX - padding) / (width - 2 * padding)) * tsRange;

    // Find closest point from each layer; show primary
    const primaryData = normalizedData.find((d) => d.layer.isPrimary) || normalizedData[0];
    if (!primaryData) return;

    const closest = primaryData.points.reduce((prev, curr) => {
      return Math.abs(curr.timestamp - dataX) < Math.abs(prev.timestamp - dataX) ? curr : prev;
    });

    const prediction = aiPredictions[primaryData.layer.symbol] || { trend: "NEUTRAL" as const, confidence: 50 };

    setPortal({
      x: e.clientX,
      y: e.clientY,
      symbol: primaryData.layer.symbol,
      currentPrice: closest.price,
      aiPrediction: prediction.trend,
      trendConfidence: prediction.confidence,
    });
  }, [normalizedData, startTs, tsRange, width, aiPredictions, setPortal]);

  const handleMouseLeave = useCallback(() => {
    setPortal(null);
  }, [setPortal]);

  // Handle search action popup selection
  const handleSearchAction = useCallback((action: SearchAction, symbol: string) => {
    switch (action) {
      case "buy":
        // Open trade modal
        setTradeModal({ isOpen: true, symbol });
        setSearchOpen(false);
        break;
      case "chart":
        // Solo (primary focus) on the asset
        soloAsset(symbol);
        setSearchOpen(false);
        break;
      case "merge":
        // Superimpose/merge the asset
        superimposeAsset(symbol);
        setSearchOpen(false);
        break;
    }
  }, [soloAsset, superimposeAsset]);

  // Handle trade order submission
  const handleTrade = useCallback(async (order: TradeOrder) => {
    try {
      if (order.side === "sell") {
        // Execute sell
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
        
        alert(`✓ Sold ${order.quantity} ${order.symbol}`);
        window.location.reload();
      } else {
        // For buy orders, show a message that wallet creation is needed
        alert(`Buy order for ${order.quantity} ${order.symbol} at $${order.price?.toFixed(2)} - Wallet integration in progress. Use Holdings panel to buy assets you already own.`);
      }
    } catch (error) {
      console.error("[TRADE] Error:", error);
      alert(error instanceof Error ? error.message : "Trade execution failed");
    }
    // For now, just log the order
  }, []);

  // Generate strict geometric polyline (no curves!)
  // Each layer uses its OWN time range for X-axis normalization (superimposition alignment)
  const generatePath = (
    normalized: { timestamp: number; value: number }[],
    layerStartTs: number,
    layerTsRange: number
  ) => {
    return normalized.map((p) => {
      // Normalize X to 0-1 using THIS layer's time range, then map to chart width
      const normalizedX = (p.timestamp - layerStartTs) / layerTsRange;
      const x = padding + normalizedX * (width - 2 * padding);
      const y = padding + (1 - (p.value - minPct) / range) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(" ");
  };

  return (
    <div className={`border-4 bg-black flex flex-col relative ${
      hasApiError ? "border-[#FF0000] animate-pulse" : "border-white"
    }`}>
      {/* Top Bar - Asset Context */}
      <div className="border-b-4 border-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Add Layer Button — Opens Global Search Modal */}
          <button
            onClick={() => setSearchOpen(true)}
            className="border-4 border-white bg-black text-white px-3 py-1 text-sm font-black font-mono hover:bg-[#FF0000] hover:border-[#FF0000] transition-colors"
            title="SUPERIMPOSE NEW ASSET"
          >
            +
          </button>

          {/* Layer Tabs — CLICK = SET PRIMARY, X = REMOVE */}
          <div className="flex items-center gap-1 flex-wrap">
            {state.layers.map((layer) => {
              const isSolo = layer.isPrimary && state.layers.length === 1;
              const isSuperimposed = !layer.isPrimary && state.layers.length > 1;
              
              return (
                <div
                  key={layer.id}
                  className={`flex items-center gap-2 border-4 px-3 py-1 min-w-[80px] cursor-pointer transition-colors select-none group ${
                    layer.isPrimary
                      ? "border-white bg-white text-black"
                      : isSuperimposed
                        ? `text-white hover:opacity-80`
                        : apiErrors[layer.symbol]
                          ? "border-[#FF0000] text-[#FF0000]"
                          : "border-gray-600 text-gray-400 hover:border-white hover:text-white"
                  }`}
                  style={{
                    borderColor: !layer.isPrimary && isSuperimposed ? layer.color : undefined,
                  }}
                  onClick={() => {
                    // Click = Make this layer PRIMARY (white solid line)
                    if (!layer.isPrimary) {
                      setPrimaryLayer(layer.id);
                    }
                  }}
                  title={layer.isPrimary ? "PRIMARY LAYER" : `CLICK TO SET ${layer.symbol} AS PRIMARY`}
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
                  {/* X button to remove layer */}
                  {state.layers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(layer.id);
                      }}
                      className={`ml-1 text-[10px] font-black font-mono hover:text-[#FF0000] transition-colors ${
                        layer.isPrimary ? "text-black/60 hover:text-[#FF0000]" : "text-gray-500"
                      }`}
                      title={`REMOVE ${layer.symbol}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-[10px] font-black font-mono text-gray-500 uppercase">
          {activeLayers.length} LAYERS ACTIVE
        </div>
      </div>

      {/* Second Row - Stacked Layer Tabs (if many layers) */}
      {state.layers.length > 4 && (
        <div className="border-b-4 border-white px-4 py-2 flex flex-wrap gap-1">
          {state.layers.slice(4).map((layer) => (
            <div
              key={`tab-${layer.id}`}
              className={`flex items-center gap-1 border-2 px-3 py-0.5 cursor-pointer transition-colors ${
                layer.isPrimary ? "border-white" : "border-gray-700 hover:border-[#FF0000]"
              }`}
              onClick={() => soloAsset(layer.symbol)}
              title={`CLICK TO SOLO ${layer.symbol}`}
            >
              <div className="w-2 h-2" style={{ backgroundColor: layer.color }} />
              <span className="text-[9px] font-mono text-gray-400 uppercase font-black">
                {layer.symbol}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* The Chart (SVG Engine) — V4 Enhanced */}
      <div className="relative flex-1 min-h-[400px] p-4">
        {/* Chart Type Switcher - Top Right */}
        <div className="absolute top-6 right-6 z-20">
          <div className="relative">
            <button
              onClick={() => setChartTypeOpen(!chartTypeOpen)}
              className="border-4 border-white bg-black px-3 py-1 text-xs font-black font-mono uppercase tracking-widest text-white hover:bg-gray-900 transition-colors flex items-center gap-2"
            >
              <span>{CHART_TYPES.find(c => c.key === state.chartType)?.icon}</span>
              <span>{state.chartType}</span>
              <span className="text-[8px] text-gray-500">▼</span>
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
                      className={`w-full px-4 py-2 text-xs font-black font-mono uppercase flex items-center gap-2 transition-colors ${
                        state.chartType === ct.key
                          ? "bg-white text-black"
                          : "text-gray-400 hover:bg-gray-900 hover:text-white"
                      }`}
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
          {layersWithNoData.length > 0 && state.layers.length > 0 && normalizedData.length === 0 && (
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

        {normalizedData.length === 0 && layersWithNoData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-gray-600 font-mono text-sm uppercase">
            CLICK [ + ] TO ADD ASSET DATA STREAMS...
          </div>
        ) : normalizedData.length > 0 ? (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onDoubleClick={handleDoubleClick}
            className="cursor-crosshair"
            shapeRendering="crispEdges"
          >
            {/* Grid Lines — Industrial aesthetic */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = padding + pct * (height - 2 * padding);
              return (
                <line
                  key={`grid-${pct}`}
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#1a1a1a"
                  strokeWidth={1}
                  strokeDasharray={pct === 0.5 ? "none" : "4,4"}
                />
              );
            })}

            {/* Vertical grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const x = padding + pct * (width - 2 * padding);
              return (
                <line
                  key={`vgrid-${pct}`}
                  x1={x}
                  y1={padding}
                  x2={x}
                  y2={height - padding}
                  stroke="#1a1a1a"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
              );
            })}

            {/* Zero Line */}
            {minPct < 0 && maxPct > 0 && (
              <line
                x1={padding}
                y1={padding + (1 - (0 - minPct) / range) * (height - 2 * padding)}
                x2={width - padding}
                y2={padding + (1 - (0 - minPct) / range) * (height - 2 * padding)}
                stroke="#333"
                strokeWidth={1}
              />
            )}

            {/* Render layers in z-index order (lowest first) */}
            {normalizedData
              .sort((a, b) => a.layer.zIndex - b.layer.zIndex)
              .map(({ layer, normalized, points, startTs: layerStartTs, tsRange: layerTsRange }) => {
                const path = generatePath(normalized, layerStartTs, layerTsRange);
                const latest = points.at(-1)?.price ?? currentPrices[layer.symbol] ?? 0;
                const first = points[0]?.price ?? latest;
                const deltaPct = first > 0 ? ((latest - first) / first) * 100 : 0;
                const latestNorm = normalized.at(-1);
                const labelY = latestNorm
                  ? padding + (1 - (latestNorm.value - minPct) / range) * (height - 2 * padding)
                  : height / 2;

                // Calculate mountain fill path (for MOUNTAIN style)
                const mountainPath = state.chartType === "MOUNTAIN" ? (() => {
                  const zeroY = padding + (1 - (0 - minPct) / range) * (height - 2 * padding);
                  const points = path.split(" ");
                  if (points.length < 2) return "";
                  
                  const firstPoint = points[0].split(",");
                  const lastPoint = points[points.length - 1].split(",");
                  
                  return `${path} ${lastPoint[0]},${zeroY} ${firstPoint[0]},${zeroY} Z`;
                })() : "";

                return (
                  <g key={layer.id}>
                    {/* MOUNTAIN Style - Area fill */}
                    {state.chartType === "MOUNTAIN" && (
                      <path
                        d={mountainPath}
                        fill={layer.color}
                        fillOpacity={0.2}
                        stroke="none"
                      />
                    )}

                    {/* CANDLESTICK Style - TODO: Requires OHLC data */}
                    {state.chartType === "CANDLESTICK" && (
                      <text
                        x={width / 2}
                        y={height / 2}
                        fill="#FF0000"
                        className="text-xs font-black"
                        textAnchor="middle"
                      >
                        ⚠ CANDLESTICK REQUIRES OHLC DATA
                      </text>
                    )}

                    {/* LINE Style (default) - strict polyline, no curves */}
                    {(state.chartType === "LINE" || state.chartType === "MOUNTAIN") && (
                      <polyline
                        points={path}
                        fill="none"
                        stroke={layer.color}
                        strokeWidth={layer.lineWidth}
                        strokeDasharray={layer.lineStyle === "dashed" ? "8,4" : "none"}
                        opacity={layer.visible ? 1 : 0.3}
                        strokeLinejoin="miter"
                        strokeLinecap="butt"
                      />
                    )}

                    {/* End Label */}
                    <text
                      x={width - padding + 5}
                      y={labelY}
                      className="text-[10px] font-black"
                      fill={layer.color}
                      style={{ fontFamily: "monospace" }}
                    >
                      {layer.symbol} {deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(2)}%
                    </text>

                    {/* Latest Price Marker */}
                    {layer.isPrimary && latestNorm && (
                      <rect
                        x={width - padding - 3}
                        y={labelY - 3}
                        width={6}
                        height={6}
                        fill={layer.color}
                        stroke="#000"
                        strokeWidth={2}
                      />
                    )}
                  </g>
                );
              })}

            {/* Y-Axis Labels */}
            <text x={5} y={padding + 4} className="text-[9px]" fill="#555" style={{ fontFamily: "monospace" }}>
              +{maxPct.toFixed(1)}%
            </text>
            <text x={5} y={height - padding + 4} className="text-[9px]" fill="#555" style={{ fontFamily: "monospace" }}>
              {minPct.toFixed(1)}%
            </text>

            {/* X-Axis Date/Time Labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const x = padding + pct * (width - 2 * padding);
              const timestamp = startTs + pct * tsRange;
              const date = new Date(timestamp);
              const dateStr = date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
              const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
              return (
                <text
                  key={`xaxis-${pct}`}
                  x={x}
                  y={height - padding + 16}
                  textAnchor="middle"
                  className="text-[8px]"
                  fill="#444"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  {dateStr} {timeStr}
                </text>
              );
            })}

            {/* Purchase Markers — Horizontal Dotted Lines with Entry Flags */}
            {normalizedData.map(({ layer, points }) => {
              const entryPrice = purchasePrices[layer.symbol];
              if (!entryPrice || points.length === 0) return null;
              
              const baseline = points[0].price;
              const entryNormalized = ((entryPrice - baseline) / baseline) * 100;
              const entryY = padding + (1 - (entryNormalized - minPct) / range) * (height - 2 * padding);
              
              // Only render if entry line is within visible range
              if (entryY < padding || entryY > height - padding) return null;
              
              return (
                <g key={`entry-${layer.id}`}>
                  {/* Dotted Entry Line */}
                  <line
                    x1={padding}
                    y1={entryY}
                    x2={width - padding}
                    y2={entryY}
                    stroke={layer.color}
                    strokeWidth={1}
                    strokeDasharray="4,4"
                    opacity={0.6}
                  />
                  {/* Entry Flag */}
                  <g transform={`translate(${padding - 5}, ${entryY})`}>
                    <polygon
                      points="0,-8 60,-8 65,0 60,8 0,8"
                      fill={layer.color}
                      opacity={0.9}
                    />
                    <text
                      x={5}
                      y={4}
                      className="text-[8px] font-black"
                      fill={layer.isPrimary ? "#000" : "#FFF"}
                      style={{ fontFamily: "monospace" }}
                    >
                      ENTRY: ${entryPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        ) : null}

        {/* Time Window Controls - Bottom Right */}
        <div className="absolute bottom-6 right-6 flex items-center gap-1 z-20">
          {TIME_WINDOWS.map((tw) => (
            <button
              key={tw.key}
              onClick={() => {
                setTimeWindow(tw.key);
                setZoomLevel(1); // Reset zoom when changing time window
                setZoomCenter(0.5);
              }}
              className={`border-4 px-3 py-1 text-xs font-black font-mono uppercase tracking-widest transition-colors ${
                state.timeWindow === tw.key
                  ? "border-white bg-white text-black"
                  : "border-gray-700 text-gray-500 hover:border-white hover:text-white"
              }`}
            >
              {tw.label}
            </button>
          ))}
        </div>

        {/* Zoom Indicator - Bottom Left */}
        {zoomLevel !== 1 && (
          <div className="absolute bottom-6 left-6 flex items-center gap-2 z-20">
            <div className="border-2 border-zinc-700 bg-black/90 px-2 py-1 flex items-center gap-2">
              <span className="text-[9px] font-mono text-zinc-500 uppercase">ZOOM</span>
              <span className="text-xs font-mono font-black text-white">
                {(zoomLevel * 100).toFixed(0)}%
              </span>
              <button
                onClick={handleDoubleClick}
                className="text-[8px] font-mono text-zinc-500 hover:text-[#FF0000] uppercase ml-1"
              >
                RESET
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── GLOBAL ASSET SEARCH MODAL ── */}
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
                  ✕
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
                  {catalogLoading ? "LOADING FULL CATALOG..." : `${searchableAssets.length} SUPPORTED ASSETS`}
                  {" • SCOPE: ALL EXCHANGES"}
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

      {/* Tactical Portal (Hover Info) */}
      <AnimatePresence>
        {state.portal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 pointer-events-none"
            style={{
              left: state.portal.x + 15,
              top: state.portal.y - 15,
            }}
          >
            <div className="border-4 border-white bg-black p-3 font-mono min-w-[200px]">
              <div className="text-xs font-black text-white uppercase tracking-widest border-b-2 border-white pb-1 mb-2">
                {state.portal.symbol}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">CURRENT_PRICE</span>
                  <span className="text-[#D4AF37] font-black">
                    ${state.portal.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">AI_TREND_PREDICTION</span>
                  <span className={`font-black ${
                    state.portal.aiPrediction === "BULLISH" ? "text-green-400" :
                    state.portal.aiPrediction === "BEARISH" ? "text-[#FF0000]" :
                    "text-gray-400"
                  }`}>
                    {state.portal.aiPrediction}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">CONFIDENCE</span>
                  <span className="text-white font-black">
                    {state.portal.trendConfidence}%
                  </span>
                </div>
              </div>
            </div>
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
