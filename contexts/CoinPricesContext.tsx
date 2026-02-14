"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type DisplayCurrency = "USD" | "EUR";

interface CoinPricesContextType {
  priceMaps: Record<DisplayCurrency, Record<string, number>>;
  ensureSymbols: (symbols: string[], quote: DisplayCurrency) => void;
  refreshNow: () => Promise<void>;
}

const CACHE_KEY = "geisha_coin_prices_cache_v1";
const REFRESH_MS = 30_000;

const CoinPricesContext = createContext<CoinPricesContextType | undefined>(
  undefined,
);

function normalizeSymbols(symbols: string[]): string[] {
  return Array.from(
    new Set(
      symbols
        .map((symbol) =>
          String(symbol || "")
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean),
    ),
  );
}

function readCachedPriceMaps(): Record<
  DisplayCurrency,
  Record<string, number>
> {
  if (typeof window === "undefined") return { USD: {}, EUR: {} };

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { USD: {}, EUR: {} };
    const parsed = JSON.parse(raw) as {
      USD?: Record<string, number>;
      EUR?: Record<string, number>;
    };

    return {
      USD: parsed?.USD && typeof parsed.USD === "object" ? parsed.USD : {},
      EUR: parsed?.EUR && typeof parsed.EUR === "object" ? parsed.EUR : {},
    };
  } catch {
    return { USD: {}, EUR: {} };
  }
}

export function CoinPricesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [priceMaps, setPriceMaps] = useState<
    Record<DisplayCurrency, Record<string, number>>
  >(() => readCachedPriceMaps());
  const [watched, setWatched] = useState<Record<DisplayCurrency, string[]>>({
    USD: [],
    EUR: [],
  });

  const refreshQuote = useCallback(
    async (quote: DisplayCurrency, symbols: string[]) => {
      const normalized = normalizeSymbols(symbols);
      if (normalized.length === 0) return;

      try {
        const params = new URLSearchParams({
          symbols: normalized.join(","),
          quote,
        });
        const res = await fetch(`/api/market/ticker?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const payload = await res.json();
        const nextMap = Object.fromEntries(
          normalized.map((symbol) => {
            const value = Number(payload?.prices?.[symbol]?.price || 0);
            return [symbol, Number.isFinite(value) && value > 0 ? value : 0];
          }),
        );

        setPriceMaps((prev) => {
          const updated = {
            ...prev,
            [quote]: {
              ...prev[quote],
              ...nextMap,
            },
          };

          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
          } catch {
            // ignore cache write failures
          }

          return updated;
        });
      } catch {
        // keep cached values on fetch failure
      }
    },
    [],
  );

  const refreshNow = useCallback(async () => {
    await Promise.all([
      refreshQuote("USD", watched.USD),
      refreshQuote("EUR", watched.EUR),
    ]);
  }, [refreshQuote, watched.EUR, watched.USD]);

  const ensureSymbols = useCallback(
    (symbols: string[], quote: DisplayCurrency) => {
      const normalized = normalizeSymbols(symbols);
      if (normalized.length === 0) return;

      setWatched((prev) => {
        const merged = normalizeSymbols([
          ...(prev[quote] || []),
          ...normalized,
        ]);
        return {
          ...prev,
          [quote]: merged,
        };
      });

      refreshQuote(quote, normalized);
    },
    [refreshQuote],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      refreshNow().catch(() => undefined);
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [refreshNow]);

  const value = useMemo(
    () => ({
      priceMaps,
      ensureSymbols,
      refreshNow,
    }),
    [ensureSymbols, priceMaps, refreshNow],
  );

  return (
    <CoinPricesContext.Provider value={value}>
      {children}
    </CoinPricesContext.Provider>
  );
}

export function useCoinPrices() {
  const context = useContext(CoinPricesContext);
  if (!context) {
    throw new Error("useCoinPrices must be used within CoinPricesProvider");
  }
  return context;
}
