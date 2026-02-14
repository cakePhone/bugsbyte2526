"use client";

import { useCallback, useEffect, useState } from "react";
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

// Known crypto symbols - Alpha Vantage treats others as stocks
const CRYPTO_SYMBOLS = new Set([
  "BTC", "ETH", "XRP", "SOL", "ADA", "DOGE", "LTC", "AVAX",
  "DOT", "MATIC", "LINK", "UNI", "ATOM", "FIL", "NEAR",
  "APE", "SAND", "MANA", "AAVE", "CRV", "COMP", "MKR",
  "SHIB", "ALGO", "FTM", "HBAR", "BNB", "XLM", "TRX",
  "USDT", "USDC", "DAI", "BUSD"
]);

function isCryptoSymbol(symbol: string): boolean {
  return CRYPTO_SYMBOLS.has(symbol.toUpperCase());
}

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

  const fetchHistory = useCallback(
    async (symbol: string, timeframe: ChartTimeframe) => {
      const tf = TIMEFRAME_TO_BINANCE[timeframe];
      if (!tf) return;

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
            points = data.points.map(
              (entry: { timestamp: number; price: number }) => ({
                timestamp: Number(entry.timestamp),
                price: Number(entry.price),
              }),
            ).filter(
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

        setPriceHistories((prev) => ({ ...prev, [symbol]: points }));
      } catch {
        // keep previous history
      }
    },
    [displayCurrency],
  );

  const refreshHistory = useCallback(
    async (showLoading = false) => {
      if (!authChecked || selectedChartSymbols.length === 0) return;

      if (showLoading) setChartLoading(true);
      try {
        await Promise.all(
          selectedChartSymbols.map((symbol) =>
            fetchHistory(symbol, activeTimeframe),
          ),
        );
      } finally {
        if (showLoading) setChartLoading(false);
      }
    },
    [activeTimeframe, authChecked, fetchHistory, selectedChartSymbols],
  );

  useEffect(() => {
    refreshHistory(true).catch(() => undefined);
  }, [refreshHistory]);

  usePollingTask(
    useCallback(() => refreshHistory(false), [refreshHistory]),
    5000,
    authChecked && selectedChartSymbols.length > 0,
  );

  return {
    chartTimeframes: CHART_TIMEFRAMES,
    priceHistories,
    activeTimeframe,
    chartLoading,
    setActiveTimeframe,
  };
}
