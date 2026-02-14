"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { DisplayCurrency } from "@/components/dashboard/types";
import type { RiskProfile } from "@/components/onboarding/TheInterrogation";
import { useCoinPrices } from "@/contexts/CoinPricesContext";
import usePollingTask from "./usePollingTask";

interface WalletValuationEntry {
  symbol: string;
  amount: number;
  unitPrice: number;
  currentValue: number;
  currency: "USDT" | "EUR";
}

const DEFAULT_CHART_COINS = ["BTC", "ETH", "XRP"] as const;

const DEFAULT_PROFILE: RiskProfile = {
  risk_tolerance: "MODERATE",
  investment_horizon: "SWING",
  focus_sectors: ["CRYPTO"],
  geopolitical_sensitivity: "AWARE",
};

function normalizeHoldings(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object") return {};

  return Object.entries(input as Record<string, unknown>).reduce(
    (acc, [symbol, amount]) => {
      const key = String(symbol || "").toUpperCase();
      const value = Number(amount);
      if (!key || !Number.isFinite(value) || value <= 0) return acc;
      acc[key] = value;
      return acc;
    },
    {} as Record<string, number>,
  );
}

function toDisplayCurrency(input: string): DisplayCurrency {
  return input === "EUR" ? "EUR" : "USD";
}

function getInitialRiskProfile(): RiskProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;

  try {
    const stored = localStorage.getItem("geisha_risk_profile");
    if (!stored) return DEFAULT_PROFILE;
    return JSON.parse(stored) as RiskProfile;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export default function useDashboardData(router: AppRouterInstance) {
  const [profile] = useState<RiskProfile>(() => getInitialRiskProfile());
  const [authChecked, setAuthChecked] = useState(false);
  const [displayCurrency, setDisplayCurrency] =
    useState<DisplayCurrency>("USD");
  const [holdings, setHoldings] = useState<Record<string, number>>({});
  const [balanceUsdt, setBalanceUsdt] = useState<number>(0);
  const [holdingValuesUsdt, setHoldingValuesUsdt] = useState<
    Record<string, number>
  >({});
  const [holdingValuesDisplay, setHoldingValuesDisplay] = useState<
    Record<string, number>
  >({});
  const [availableCoins, setAvailableCoins] = useState<string[]>(
    DEFAULT_CHART_COINS.map((coin) => String(coin)),
  );
  const [selectedChartSymbols, setSelectedChartSymbols] = useState<string[]>(
    DEFAULT_CHART_COINS.slice(0, 2),
  );

  const { priceMaps, ensureSymbols } = useCoinPrices();
  const prices = priceMaps[displayCurrency];

  const loadUserData = useCallback(async () => {
    const dataRes = await fetch("/api/user/data", { cache: "no-store" });
    if (!dataRes.ok) return;

    const { wallet, walletValuations, valuationCurrency } =
      await dataRes.json();

    const nextCurrency = toDisplayCurrency(String(valuationCurrency || "USDT"));
    setDisplayCurrency(nextCurrency);
    setHoldings(normalizeHoldings(wallet?.holdings ?? wallet?.assets));
    setBalanceUsdt(Number(wallet?.balanceUsdt || 0));

    if (!Array.isArray(walletValuations)) {
      setHoldingValuesUsdt({});
      setHoldingValuesDisplay({});
      return;
    }

    const valuationEntries = walletValuations as WalletValuationEntry[];

    const serverValues = valuationEntries.reduce(
      (acc, entry) => {
        const symbol = String(entry.symbol || "").toUpperCase();
        if (symbol === "USDT") return acc;
        const value = Number(entry.currentValue || 0);
        if (!Number.isFinite(value) || value < 0) return acc;
        acc[symbol] = value;
        return acc;
      },
      {} as Record<string, number>,
    );

    const displayValues = valuationEntries.reduce(
      (acc, entry) => {
        const symbol = String(entry.symbol || "").toUpperCase();
        if (symbol === "USDT" || symbol === "USD" || symbol === "EUR") {
          return acc;
        }
        const value = Number(entry.currentValue || 0);
        if (!Number.isFinite(value) || value < 0) return acc;
        acc[symbol] = value;
        return acc;
      },
      {} as Record<string, number>,
    );

    setHoldingValuesUsdt(serverValues);
    setHoldingValuesDisplay(displayValues);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/");
          return;
        }
        const { user } = await res.json();
        if (!user) {
          router.push("/");
          return;
        }

        await loadUserData();
        setAuthChecked(true);
      } catch {
        router.push("/");
      }
    })();
  }, [loadUserData, router]);

  usePollingTask(
    useCallback(() => loadUserData(), [loadUserData]),
    5000,
    authChecked,
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/coins?limit=25", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const symbols = Array.isArray(data?.coins)
          ? data.coins
              .map((coin: { symbol?: string }) =>
                String(coin.symbol || "").toUpperCase(),
              )
              .filter(Boolean)
          : [];
        if (symbols.length === 0) return;

        const ordered = [
          ...DEFAULT_CHART_COINS,
          ...symbols.filter(
            (s) =>
              !DEFAULT_CHART_COINS.includes(
                s as (typeof DEFAULT_CHART_COINS)[number],
              ),
          ),
        ];

        const unique = Array.from(new Set(ordered));
        setAvailableCoins(unique);
        setSelectedChartSymbols((prev) => {
          const next = prev.filter((symbol) => unique.includes(symbol));
          return next.length > 0 ? next : unique.slice(0, 2);
        });
      } catch {
        // keep defaults
      }
    })();
  }, []);

  useEffect(() => {
    ensureSymbols(
      [...selectedChartSymbols, ...Object.keys(holdings), ...availableCoins],
      displayCurrency,
    );
  }, [
    availableCoins,
    displayCurrency,
    ensureSymbols,
    holdings,
    selectedChartSymbols,
  ]);

  const toggleChartSymbol = useCallback((symbol: string) => {
    setSelectedChartSymbols((prev) => {
      if (prev.includes(symbol)) {
        return prev.length === 1
          ? prev
          : prev.filter((item) => item !== symbol);
      }
      return [...prev, symbol];
    });
  }, []);

  return {
    profile,
    authChecked,
    displayCurrency,
    holdings,
    balanceUsdt,
    holdingValuesUsdt,
    holdingValuesDisplay,
    availableCoins,
    selectedChartSymbols,
    prices,
    loadUserData,
    setSelectedChartSymbols,
    toggleChartSymbol,
  };
}
