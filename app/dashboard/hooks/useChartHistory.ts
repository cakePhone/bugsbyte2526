"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ChartTimeframe,
  ChartTimeframeOption,
  DisplayCurrency,
  PricePoint,
} from "@/components/dashboard/types";
import usePollingTask from "./usePollingTask";

const CHART_TIMEFRAMES: ChartTimeframeOption[] = [
  { key: "1M", label: "1m", days: 1 },
  { key: "5M", label: "5m", days: 1 },
  { key: "30MIN", label: "30min", days: 1 },
  { key: "1H", label: "1H", days: 1, hoursWindow: 1 },
  { key: "24H", label: "24H", days: 1, hoursWindow: 24 },
  { key: "7D", label: "7D", days: 7 },
  { key: "30D", label: "30D", days: 30 },
  { key: "1Y", label: "1Y", days: 365 },
];

const TIMEFRAME_TO_BINANCE: Record<
  ChartTimeframe,
  { interval: string; limit: number }
> = {
  "1M": { interval: "1m", limit: 120 },
  "5M": { interval: "5m", limit: 120 },
  "30MIN": { interval: "30m", limit: 120 },
  "1H": { interval: "1h", limit: 120 },
  "24H": { interval: "15m", limit: 96 },
  "7D": { interval: "1h", limit: 168 },
  "30D": { interval: "4h", limit: 180 },
  "1Y": { interval: "1d", limit: 365 },
};

const TIMEFRAME_TO_WINDOW_MS: Record<ChartTimeframe, number> = {
  "1M": 1 * 60 * 1000,
  "5M": 5 * 60 * 1000,
  "30MIN": 30 * 60 * 1000,
  "1H": 1 * 60 * 60 * 1000,
  "24H": 24 * 60 * 60 * 1000,
  "7D": 7 * 24 * 60 * 60 * 1000,
  "30D": 30 * 24 * 60 * 60 * 1000,
  "1Y": 365 * 24 * 60 * 60 * 1000,
};

// Known crypto symbols - Alpha Vantage treats others as stocks
const CRYPTO_SYMBOLS = new Set([
  "BTC",
  "ETH",
  "XRP",
  "SOL",
  "ADA",
  "DOGE",
  "LTC",
  "AVAX",
  "DOT",
  "MATIC",
  "LINK",
  "UNI",
  "ATOM",
  "FIL",
  "NEAR",
  "APE",
  "SAND",
  "MANA",
  "AAVE",
  "CRV",
  "COMP",
  "MKR",
  "SHIB",
  "ALGO",
  "FTM",
  "HBAR",
  "BNB",
  "XLM",
  "TRX",
  "USDT",
  "USDC",
  "DAI",
  "BUSD",
]);

function isCryptoSymbol(symbol: string): boolean {
  return CRYPTO_SYMBOLS.has(symbol.toUpperCase());
}

function applyTimeframeWindow(
  points: PricePoint[],
  timeframe: ChartTimeframe,
): PricePoint[] {
  const now = Date.now();
  const windowMs = TIMEFRAME_TO_WINDOW_MS[timeframe];
  if (!windowMs || points.length === 0) return points;

  const cutoff = now - windowMs;
  const clipped = points.filter((point) => point.timestamp >= cutoff);

  if (clipped.length >= 2) return clipped;

  return points.slice(-Math.min(points.length, 120));
}

// In-memory cache for timeframe data to avoid refetching when switching
const timeframeCacheRef: { current: Record<string, { data: PricePoint[]; fetchedAt: number }> } = { current: {} };
const CACHE_TTL_MS = 60_000; // Cache valid for 1 minute

export default function useChartHistory({
  authChecked,
  selectedChartSymbols,
  displayCurrency,
}: {
  authChecked: boolean;
  selectedChartSymbols: string[];
  displayCurrency: DisplayCurrency;
}) {
  const [priceHistories, setPriceHistories] = useState<
    Record<string, PricePoint[]>
  >({});
  const [activeTimeframe, setActiveTimeframe] = useState<ChartTimeframe>("24H");
  const [chartLoading, setChartLoading] = useState(false);

  const selectedSymbolsSignature = selectedChartSymbols
    .map((symbol) =>
      String(symbol || "")
        .toUpperCase()
        .trim(),
    )
    .filter(Boolean)
    .join("|");

  const stableSelectedSymbols = useMemo(
    () =>
      selectedSymbolsSignature
        ? selectedSymbolsSignature.split("|")
        : ([] as string[]),
    [selectedSymbolsSignature],
  );

  const fetchHistory = useCallback(
    async (symbol: string, timeframe: ChartTimeframe, forceRefresh = false) => {
      const tf = TIMEFRAME_TO_BINANCE[timeframe];
      if (!tf) return;

      // Check cache first (unless forcing refresh)
      const cacheKey = `${symbol}_${timeframe}`;
      const cached = timeframeCacheRef.current[cacheKey];
      if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        setPriceHistories((prev) => ({ ...prev, [symbol]: cached.data }));
        return;
      }

      let points: PricePoint[] = [];

      try {
        // PRIMARY: Yahoo Finance (fastest, works for both stocks & crypto)
        const yfParams = new URLSearchParams({
          action: "chart",
          symbol,
          timeframe,
        });
        const yfRes = await fetch(`/api/yf?${yfParams.toString()}`, {
          cache: "no-store",
        });

        if (yfRes.ok) {
          const data = await yfRes.json();
          if (Array.isArray(data?.points) && data.points.length > 0) {
            points = data.points
              .map((entry: { timestamp: number; price: number }) => ({
                timestamp: Number(entry.timestamp),
                price: Number(entry.price),
              }))
              .filter(
                (entry: PricePoint) =>
                  Number.isFinite(entry.timestamp) &&
                  Number.isFinite(entry.price) &&
                  entry.price > 0,
              );
          }
        }

        // FALLBACK 1: Binance for crypto (if Yahoo failed)
        if (points.length === 0 && isCryptoSymbol(symbol)) {
          const binanceRes = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(`${symbol}USDT`)}&interval=${encodeURIComponent(tf.interval)}&limit=${tf.limit}`,
            { cache: "no-store" },
          );

          if (binanceRes.ok) {
            const klines = (await binanceRes.json()) as Array<
              [number, string, string, string, string, string]
            >;
            points = Array.isArray(klines)
              ? klines
                  .map((kline) => ({
                    timestamp: Number(kline[0]),
                    price:
                      (Number(kline[1]) + Number(kline[4])) / 2 ||
                      Number(kline[4]),
                  }))
                  .filter(
                    (entry) =>
                      Number.isFinite(entry.timestamp) &&
                      Number.isFinite(entry.price) &&
                      entry.price > 0,
                  )
              : [];
          }
        }

        // FALLBACK 2: Internal market history API
        if (points.length === 0) {
          const params = new URLSearchParams({
            symbol,
            timeframe,
            quote: displayCurrency,
          });
          const fallbackRes = await fetch(
            `/api/market/history?${params.toString()}`,
            {
              cache: "no-store",
            },
          );
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            points = Array.isArray(data?.points)
              ? data.points.map(
                  (entry: { timestamp: number; price: number }) => ({
                    timestamp: Number(entry.timestamp),
                    price: Number(entry.price),
                  }),
                )
              : [];
          }
        }

        const windowedPoints = applyTimeframeWindow(points, timeframe);
        // Store in cache
        timeframeCacheRef.current[cacheKey] = { data: windowedPoints, fetchedAt: Date.now() };
        setPriceHistories((prev) => ({ ...prev, [symbol]: windowedPoints }));
      } catch {
        // keep previous history
      }
    },
    [displayCurrency],
  );

  const refreshHistory = useCallback(
    async (showLoading = false, forceRefresh = false) => {
      if (!authChecked || stableSelectedSymbols.length === 0) return;

      if (showLoading) setChartLoading(true);
      try {
        await Promise.all(
          stableSelectedSymbols.map((symbol) =>
            fetchHistory(symbol, activeTimeframe, forceRefresh),
          ),
        );
      } finally {
        if (showLoading) setChartLoading(false);
      }
    },
    [activeTimeframe, authChecked, fetchHistory, stableSelectedSymbols],
  );

  useEffect(() => {
    // Initial load or timeframe change - use cache if available
    refreshHistory(true, false).catch(() => undefined);
  }, [refreshHistory]);

  usePollingTask(
    useCallback(() => refreshHistory(false, true), [refreshHistory]), // Polling forces refresh
    5000,
    authChecked && stableSelectedSymbols.length > 0,
  );

  return {
    chartTimeframes: CHART_TIMEFRAMES,
    priceHistories,
    activeTimeframe,
    chartLoading,
    setActiveTimeframe,
  };
}
