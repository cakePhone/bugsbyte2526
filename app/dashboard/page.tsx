/**
 * THE WAR ROOM — Main Trading Dashboard
 * Geisha Gains • Coffee Driven Development
 *
 * Integrates: TheBulletin, ThreatRadar, ActionOverlay
 * Real-time news analysis powered by NVIDIA NIM (Llama-3)
 * Filtered through user's RiskProfile from The Interrogation
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import TheBulletin from "@/components/dashboard/TheBulletin";
import ThreatRadar from "@/components/dashboard/ThreatRadar";
import ActionOverlay, {
  FatalEventLine,
} from "@/components/dashboard/ActionOverlay";
import type { NewsAnalysis } from "@/app/api/news/analyze/route";
import type { RiskProfile } from "@/components/onboarding/TheInterrogation";
import { calculateNetProfit } from "@/lib/market-aggregator/netProfit";

// ── Types ─────────────────────────────────────────────────
interface PricePoint {
  timestamp: number;
  price: number;
}

interface WalletValuationEntry {
  symbol: string;
  amount: number;
  unitPrice: number;
  currentValue: number;
  currency: "USDT" | "EUR";
}

type DisplayCurrency = "USD" | "EUR";

function toDisplayCurrency(input: string): DisplayCurrency {
  return input === "EUR" ? "EUR" : "USD";
}

function formatMoney(value: number, currency: DisplayCurrency): string {
  const symbol = currency === "EUR" ? "€" : "$";
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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

type ChartTimeframe =
  | "1M"
  | "5M"
  | "30MIN"
  | "1H"
  | "24H"
  | "7D"
  | "30D"
  | "1Y";

const AVAILABLE_CHART_COINS = ["BTC", "ETH", "XRP"] as const;

const CHART_TIMEFRAMES: Array<{
  key: ChartTimeframe;
  label: string;
  days: number;
  hoursWindow?: number;
}> = [
  { key: "1M", label: "1m", days: 1 },
  { key: "5M", label: "5m", days: 1 },
  { key: "30MIN", label: "30min", days: 1 },
  { key: "1H", label: "1H", days: 1, hoursWindow: 1 },
  { key: "24H", label: "24H", days: 1, hoursWindow: 24 },
  { key: "7D", label: "7D", days: 7 },
  { key: "30D", label: "30D", days: 30 },
  { key: "1Y", label: "1Y", days: 365 },
];

// ── Dashboard ─────────────────────────────────────────────
export default function WarRoom() {
  const router = useRouter();
  // Profile from localStorage (set by The Interrogation)
  const [profile, setProfile] = useState<RiskProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [analyses, setAnalyses] = useState<NewsAnalysis[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsAnalysis | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [scanCount, setScanCount] = useState(0);

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletBalanceDisplay, setWalletBalanceDisplay] = useState(0);
  const [displayCurrency, setDisplayCurrency] =
    useState<DisplayCurrency>("USD");
  const [holdings, setHoldings] = useState<Record<string, number>>({});
  const [trades, setTrades] = useState<
    Array<{
      symbol: string;
      side: "BUY" | "SELL";
      amount: number;
      price: number;
      ts: number;
    }>
  >([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [holdingValuesUsdt, setHoldingValuesUsdt] = useState<
    Record<string, number>
  >({});
  const [holdingValuesDisplay, setHoldingValuesDisplay] = useState<
    Record<string, number>
  >({});
  const [priceHistories, setPriceHistories] = useState<
    Record<string, PricePoint[]>
  >({});
  const [selectedChartSymbols, setSelectedChartSymbols] = useState<string[]>([
    "BTC",
    "ETH",
  ]);
  const [activeTimeframe, setActiveTimeframe] = useState<ChartTimeframe>("24H");
  const [chartLoading, setChartLoading] = useState(false);
  const [newsPage, setNewsPage] = useState(1);
  const [newsTotalPages, setNewsTotalPages] = useState(1);
  const [latestNewsTimestamp, setLatestNewsTimestamp] = useState<string | null>(
    null,
  );
  const [knownNewsIds, setKnownNewsIds] = useState<string[]>([]);

  // Fatal events
  const [fatalEvents, setFatalEvents] = useState<
    Array<{ timestamp: number; headline: string }>
  >([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set(),
  );

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const priceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const historyIngestRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userDataRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadUserData = useCallback(async () => {
    const dataRes = await fetch("/api/user/data", { cache: "no-store" });
    if (!dataRes.ok) return;

    const { wallet, transactions, walletValuations, valuationCurrency } =
      await dataRes.json();

    setWalletBalance(Number(wallet?.balanceUsdt || 0));
    const nextCurrency = toDisplayCurrency(String(valuationCurrency || "USDT"));
    setDisplayCurrency(nextCurrency);
    const nextHoldings = normalizeHoldings(wallet?.holdings ?? wallet?.assets);
    setHoldings(nextHoldings);

    setTrades(
      (transactions || []).map(
        (t: {
          symbol: string;
          side: "BUY" | "SELL";
          amount: number;
          price: number;
          ts: number;
        }) => ({
          symbol: t.symbol,
          side: t.side,
          amount: t.amount,
          price: t.price,
          ts: t.ts,
        }),
      ),
    );

    if (Array.isArray(walletValuations)) {
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

      const cashEntry = valuationEntries.find(
        (entry) => String(entry.symbol || "").toUpperCase() === nextCurrency,
      );

      setWalletBalanceDisplay(
        Number(cashEntry?.currentValue || wallet?.balanceUsdt || 0),
      );
      setHoldingValuesUsdt(serverValues);
      setHoldingValuesDisplay(displayValues);
    } else {
      setWalletBalanceDisplay(Number(wallet?.balanceUsdt || 0));
      setHoldingValuesUsdt({});
      setHoldingValuesDisplay({});
    }
  }, []);

  // ── Auth check ──────────────────────────────────────────
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

        try {
          await loadUserData();
        } catch {
          // non-fatal — keep defaults
        }

        setAuthChecked(true);
      } catch {
        router.push("/");
      }
    })();
  }, [router, loadUserData]);

  useEffect(() => {
    if (!authChecked) return;

    userDataRef.current = setInterval(() => {
      loadUserData().catch(() => undefined);
    }, 5000);

    return () => {
      if (userDataRef.current) clearInterval(userDataRef.current);
    };
  }, [authChecked, loadUserData]);

  // ── Load profile from localStorage ──────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem("geisha_risk_profile");
      if (stored) setProfile(JSON.parse(stored));
      else {
        // Default profile if none exists
        setProfile({
          risk_tolerance: "MODERATE",
          investment_horizon: "SWING",
          focus_sectors: ["CRYPTO"],
          geopolitical_sensitivity: "AWARE",
        });
      }
    } catch {
      setProfile({
        risk_tolerance: "MODERATE",
        investment_horizon: "SWING",
        focus_sectors: ["CRYPTO"],
        geopolitical_sensitivity: "AWARE",
      });
    }
  }, []);

  // ── Current price ticker (CoinGecko) ───────────────────
  useEffect(() => {
    const updatePrices = async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple&vs_currencies=usd,eur",
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        const quoteKey = displayCurrency === "EUR" ? "eur" : "usd";
        const next: Record<string, number> = {
          BTC: Number(data?.bitcoin?.[quoteKey]) || 0,
          ETH: Number(data?.ethereum?.[quoteKey]) || 0,
          XRP: Number(data?.ripple?.[quoteKey]) || 0,
        };
        setPrices(next);
      } catch {
        // keep last known prices on failure
      }
    };

    updatePrices();
    priceRef.current = setInterval(updatePrices, 30000);
    return () => {
      if (priceRef.current) clearInterval(priceRef.current);
    };
  }, [displayCurrency]);

  // ── Historical chart data (CoinLore + DB-backed API) ───
  const fetchHistory = useCallback(
    async (symbol: string, timeframe: ChartTimeframe) => {
      const tf = CHART_TIMEFRAMES.find((t) => t.key === timeframe);
      if (!tf) return;

      try {
        const params = new URLSearchParams({
          symbol,
          timeframe,
          quote: displayCurrency,
        });

        const res = await fetch(`/api/market/history?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = await res.json();
        const points: PricePoint[] = Array.isArray(data?.points)
          ? data.points.map((entry: { timestamp: number; price: number }) => ({
              timestamp: Number(entry.timestamp),
              price: Number(entry.price),
            }))
          : [];

        setPriceHistories((prev) => ({
          ...prev,
          [symbol]: points,
        }));

        const last = Number(data?.latest?.price || points.at(-1)?.price || 0);
        if (last) {
          setPrices((prev) => ({ ...prev, [symbol]: last }));
        }
      } catch {
        // keep existing history on failure
      }
    },
    [displayCurrency],
  );

  useEffect(() => {
    if (!authChecked || selectedChartSymbols.length === 0) return;

    let isMounted = true;

    const refreshHistory = async (showLoading = false) => {
      if (showLoading) setChartLoading(true);
      try {
        await Promise.all(
          selectedChartSymbols.map((symbol) =>
            fetchHistory(symbol, activeTimeframe),
          ),
        );
      } finally {
        if (showLoading && isMounted) setChartLoading(false);
      }
    };

    refreshHistory(true);
    const interval = setInterval(() => {
      refreshHistory(false);
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [authChecked, selectedChartSymbols, activeTimeframe, fetchHistory]);

  const toggleChartSymbol = useCallback((symbol: string) => {
    setSelectedChartSymbols((prev) => {
      if (prev.includes(symbol)) {
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== symbol);
      }
      return [...prev, symbol];
    });
  }, []);

  // ── Poll news analysis API ─────────────────────────────
  const fetchAnalysis = useCallback(
    async (page = 1) => {
      if (!profile) return;
      try {
        setIsLoading(true);
        const holdingsParam = Object.entries(holdings)
          .map(([s, a]) => `${s}:${a}`)
          .join(",");

        const params = new URLSearchParams({
          risk_tolerance: profile.risk_tolerance,
          investment_horizon: profile.investment_horizon,
          focus_sectors: profile.focus_sectors.join(","),
          geopolitical_sensitivity: profile.geopolitical_sensitivity,
          holdings: holdingsParam,
          page: String(page),
          pageSize: "10",
        });

        if (latestNewsTimestamp) {
          params.set("latestTimestamp", latestNewsTimestamp);
        }
        if (knownNewsIds.length > 0) {
          params.set("knownIds", knownNewsIds.join(","));
        }

        const res = await fetch(`/api/news/analyze?${params}`);
        if (!res.ok) throw new Error("Analysis failed");

        const data = await res.json();
        setAnalyses(data.analyses || []);
        setNewsPage(Number(data?.meta?.page || page));
        setNewsTotalPages(Number(data?.meta?.totalPages || 1));

        const apiLatest = data?.meta?.latestTimestamp;
        if (apiLatest) setLatestNewsTimestamp(String(apiLatest));

        const ids = (data.analyses || [])
          .map((a: NewsAnalysis) => String(a.id))
          .filter(Boolean);
        if (ids.length > 0) {
          setKnownNewsIds((prev) => {
            const merged = Array.from(new Set([...ids, ...prev]));
            return merged.slice(0, 200);
          });
        }

        setScanCount((c) => c + 1);

        // Track fatal events for the chart
        const fatalItems = (data.analyses || []).filter(
          (a: NewsAnalysis) =>
            a.portfolio_threat > 8 &&
            (a.sentiment === "BEARISH" || a.sentiment === "LETHAL"),
        );
        if (fatalItems.length > 0) {
          setFatalEvents((prev) => [
            ...prev.slice(-5),
            ...fatalItems.map((f: NewsAnalysis) => ({
              timestamp: Date.now(),
              headline: f.original.headline,
            })),
          ]);
        }
      } catch (e) {
        console.error("News analysis error:", e);
      } finally {
        setIsLoading(false);
      }
    },
    [profile, holdings, latestNewsTimestamp, knownNewsIds],
  );

  useEffect(() => {
    if (!profile) return;
    fetchAnalysis(newsPage);
    tickRef.current = setInterval(() => fetchAnalysis(newsPage), 30000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [fetchAnalysis, profile, newsPage]);

  // ── Persist market snapshots every 5s ────────────────
  const ingestAllHistory = useCallback(async () => {
    try {
      await fetch("/api/market/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: [...AVAILABLE_CHART_COINS] }),
      });
    } catch {
      // best-effort background ingestion
    }
  }, []);

  useEffect(() => {
    if (!authChecked) return;

    ingestAllHistory();
    historyIngestRef.current = setInterval(ingestAllHistory, 5000);

    return () => {
      if (historyIngestRef.current) clearInterval(historyIngestRef.current);
    };
  }, [authChecked, ingestAllHistory]);

  // ── Quick Sell Handler ──────────────────────────────────
  const handleQuickSell = useCallback(
    (symbol: string) => {
      const amount = holdings[symbol] || 0;
      if (amount === 0) return;

      const price = prices[symbol] || 0;
      const total = price * amount;

      setWalletBalance((b) => b + total);
      setHoldings((h) => {
        const updated = { ...h };
        delete updated[symbol];
        return updated;
      });
      setTrades((t) => [
        { symbol, side: "SELL", amount, price, ts: Date.now() },
        ...t.slice(0, 49),
      ]);
    },
    [holdings, prices],
  );

  // ── Dismiss Alert ───────────────────────────────────────
  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlerts((prev) => {
      const next = new Set(Array.from(prev));
      next.add(id);
      return next;
    });
  }, []);

  // ── Derived Data ────────────────────────────────────────
  const totalHoldingsValue = Object.entries(holdings).reduce(
    (acc, [sym, amt]) => {
      const serverValue =
        displayCurrency === "USD"
          ? holdingValuesUsdt[sym]
          : holdingValuesDisplay[sym];
      if (typeof serverValue === "number") return acc + serverValue;
      return acc + amt * (prices[sym] || 0);
    },
    0,
  );
  const cashValue =
    displayCurrency === "USD" ? walletBalance : walletBalanceDisplay;
  const totalValue = cashValue + totalHoldingsValue;

  const highThreatCount = analyses.filter((a) => a.threat_level >= 8).length;
  const lethalCount = analyses.filter((a) => a.sentiment === "LETHAL").length;

  if (!authChecked || !profile) {
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
      {/* ═══════ HEADER ═══════ */}
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
            {/* Threat Counter */}
            {highThreatCount > 0 && (
              <motion.div
                className="bg-[#FF0000] text-white px-3 py-1 text-xs font-bold"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              >
                {highThreatCount} HIGH THREAT{highThreatCount > 1 ? "S" : ""}
              </motion.div>
            )}

            {/* Scan Status */}
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

            {/* Profile Badge */}
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

            {/* Settings */}
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

      {/* ═══════ MAIN GRID ═══════ */}
      <main className="max-w-[1600px] mx-auto p-4 space-y-4">
        {/* ── Row 1: Portfolio Summary Bar ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="PORTFOLIO VALUE"
            value={formatMoney(totalValue, displayCurrency)}
          />
          <StatCard
            label={`CASH (${displayCurrency})`}
            value={formatMoney(cashValue, displayCurrency)}
          />
          <StatCard
            label="THREAT LEVEL"
            value={highThreatCount > 0 ? `${highThreatCount} HIGH` : "CLEAR"}
            alert={highThreatCount > 0}
          />
          <StatCard
            label="LETHAL EVENTS"
            value={lethalCount > 0 ? `${lethalCount} ACTIVE` : "NONE"}
            alert={lethalCount > 0}
          />
        </div>

        {/* ── Row 2: Price Chart + Threat Radar ── */}
        <div className="grid grid-cols-12 gap-4">
          {/* Price Chart Area */}
          <div className="col-span-12 lg:col-span-8">
            <div className="border-4 border-white bg-black">
              {/* Chart Header — Symbol Tabs */}
              <div className="border-b-4 border-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedChartSymbols.map((sym) => (
                    <span
                      key={sym}
                      className="border-2 border-white px-2 py-1 text-[10px] font-bold"
                    >
                      {sym} • {displayCurrency === "EUR" ? "€" : "$"}
                      {(prices[sym] || 0).toLocaleString(undefined, {
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
                    {AVAILABLE_CHART_COINS.map((coin) => {
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

              {/* SVG Price Chart */}
              <div className="relative h-[300px] p-4">
                <div className="mb-3 flex items-center gap-2">
                  {CHART_TIMEFRAMES.map((tf) => (
                    <button
                      key={tf.key}
                      onClick={() => setActiveTimeframe(tf.key)}
                      className={`border-2 px-2 py-1 text-[10px] font-bold tracking-widest transition-colors ${
                        activeTimeframe === tf.key
                          ? "border-white bg-white text-black"
                          : "border-gray-700 text-gray-400 hover:border-white hover:text-white"
                      }`}
                    >
                      {tf.label}
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

          {/* Threat Radar */}
          <div className="col-span-12 lg:col-span-4">
            <ThreatRadar
              analyses={analyses}
              sensitivity={profile.geopolitical_sensitivity}
              holdings={holdings}
            />
          </div>
        </div>

        {/* ── Row 3: News Bulletin + Article Detail + Holdings ── */}
        <div className="grid grid-cols-12 gap-4">
          {/* The Bulletin */}
          <div className="col-span-12 lg:col-span-5 max-h-[600px]">
            <TheBulletin
              analyses={analyses}
              onSelectArticle={setSelectedArticle}
              selectedId={selectedArticle?.id}
              page={newsPage}
              totalPages={newsTotalPages}
              onPrevPage={() => setNewsPage((p) => Math.max(1, p - 1))}
              onNextPage={() =>
                setNewsPage((p) => Math.min(newsTotalPages || 1, p + 1))
              }
            />
          </div>

          {/* Article Detail */}
          <div className="col-span-12 lg:col-span-4">
            <ArticleDetail
              article={selectedArticle}
              profile={profile}
              prices={prices}
              currency={displayCurrency}
            />
          </div>

          {/* Holdings / Wallet */}
          <div className="col-span-12 lg:col-span-3">
            <HoldingsPanel
              holdings={holdings}
              prices={prices}
              holdingValuesUsdt={holdingValuesUsdt}
              holdingValuesDisplay={holdingValuesDisplay}
              walletBalance={walletBalance}
              walletBalanceDisplay={walletBalanceDisplay}
              currency={displayCurrency}
              analyses={analyses}
            />
          </div>
        </div>

        {/* ── Row 4: Trade Log ── */}
        <div className="border-4 border-white bg-black">
          <div className="border-b-4 border-white px-4 py-2 flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-widest">TRADE LOG</h2>
            <span className="text-[10px] text-gray-500">
              {trades.length} TRADES
            </span>
          </div>
          {trades.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-600 text-sm">
              NO TRADES EXECUTED — USE QUICK SELL ON LETHAL ALERTS
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-gray-800 text-[10px] font-bold uppercase text-gray-500">
                    <th className="px-4 py-2">TIME</th>
                    <th className="px-2 py-2">SIDE</th>
                    <th className="px-2 py-2">ASSET</th>
                    <th className="px-2 py-2 text-right">AMOUNT</th>
                    <th className="px-2 py-2 text-right">PRICE</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => (
                    <motion.tr
                      key={`${t.ts}-${i}`}
                      className="border-b border-gray-800 hover:bg-gray-900"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <td className="px-4 py-2 text-[10px] text-gray-500">
                        {new Date(t.ts).toLocaleTimeString()}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 ${
                            t.side === "BUY"
                              ? "bg-white text-black"
                              : "bg-[#FF0000] text-white"
                          }`}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-bold text-sm">
                        {t.symbol}
                      </td>
                      <td className="px-2 py-2 text-right text-sm">
                        {t.amount.toFixed(6)}
                      </td>
                      <td className="px-2 py-2 text-right text-sm font-bold">
                        {displayCurrency === "EUR" ? "€" : "$"}
                        {t.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ═══════ FOOTER ═══════ */}
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

      {/* ═══════ LETHAL OVERLAY ═══════ */}
      <ActionOverlay
        analyses={analyses}
        holdings={holdings}
        onQuickSell={handleQuickSell}
        onDismiss={handleDismissAlert}
        dismissedIds={dismissedAlerts}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <motion.div
      className={`border-4 bg-black p-4 ${alert ? "border-[#FF0000]" : "border-white"}`}
      animate={alert ? { borderColor: ["#FF0000", "#CC0000", "#FF0000"] } : {}}
      transition={alert ? { repeat: Infinity, duration: 0.8 } : {}}
    >
      <div className="text-[10px] text-gray-500 font-bold tracking-widest mb-1">
        {label}
      </div>
      <div
        className={`text-lg font-bold ${alert ? "text-[#FF0000]" : "text-white"}`}
      >
        {value}
      </div>
    </motion.div>
  );
}

// ── Inline SVG Price Chart ────────────────────────────────
function PriceChartSVG({
  histories,
  selectedSymbols,
  timeframe,
  currency,
}: {
  histories: Record<string, PricePoint[]>;
  selectedSymbols: string[];
  timeframe: ChartTimeframe;
  currency: DisplayCurrency;
}) {
  const series = selectedSymbols
    .map((symbol) => ({ symbol, points: histories[symbol] || [] }))
    .filter((entry) => entry.points.length >= 2);

  if (series.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
        SELECT COINS TO OVERLAY HISTORICAL VALUES...
      </div>
    );
  }

  const w = 700;
  const h = 250;
  const pad = 20;

  const allPoints = series.flatMap((entry) => entry.points);
  const prices = allPoints.map((p) => p.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const startTs = Math.min(...allPoints.map((p) => p.timestamp));
  const endTs = Math.max(...allPoints.map((p) => p.timestamp));
  const tsRange = endTs - startTs || 1;

  const palette: Record<string, string> = {
    BTC: "#FFFFFF",
    ETH: "#D4AF37",
    XRP: "#FF0000",
  };

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
    >
      {/* Grid */}
      {[0.25, 0.5, 0.75].map((pct) => {
        const y = pad + pct * (h - 2 * pad);
        return (
          <line
            key={pct}
            x1={pad}
            y1={y}
            x2={w - pad}
            y2={y}
            stroke="#222"
            strokeWidth={1}
          />
        );
      })}

      {series.map(({ symbol, points }) => {
        const linePoints = points.map((p) => {
          const x = pad + ((p.timestamp - startTs) / tsRange) * (w - 2 * pad);
          const y = pad + (1 - (p.price - minP) / range) * (h - 2 * pad);
          return `${x},${y}`;
        });

        const latest = points.at(-1)?.price ?? 0;
        const first = points[0]?.price ?? latest;
        const y = pad + (1 - (latest - minP) / range) * (h - 2 * pad);
        const deltaPct = first > 0 ? ((latest - first) / first) * 100 : 0;
        const color = palette[symbol] || "#AAAAAA";

        return (
          <g key={symbol}>
            <polyline
              points={linePoints.join(" ")}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
            <text
              x={w - pad - 4}
              y={y - 6}
              textAnchor="end"
              className="text-[9px] font-bold"
              fill={color}
            >
              {symbol} {deltaPct >= 0 ? "+" : ""}
              {deltaPct.toFixed(2)}%
            </text>
          </g>
        );
      })}

      {/* Price range labels */}
      <text x={5} y={pad} className="text-[8px]" fill="#555">
        {currency === "EUR" ? "€" : "$"}
        {maxP.toFixed(2)}
      </text>
      <text x={5} y={h - pad + 12} className="text-[8px]" fill="#555">
        {currency === "EUR" ? "€" : "$"}
        {minP.toFixed(2)}
      </text>

      <text
        x={w - pad}
        y={h - 4}
        textAnchor="end"
        className="text-[9px]"
        fill="#777"
      >
        {timeframe} • {selectedSymbols.join(" / ")}
      </text>
    </svg>
  );
}

// ── Article Detail Panel ──────────────────────────────────
function ArticleDetail({
  article,
  profile,
  prices,
  currency,
}: {
  article: NewsAnalysis | null;
  profile: RiskProfile;
  prices: Record<string, number>;
  currency: DisplayCurrency;
}) {
  if (!article) {
    return (
      <div className="border-4 border-white bg-black h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-gray-600 text-4xl mb-4">◉</div>
          <p className="text-gray-600 text-sm">
            SELECT AN ARTICLE FROM THE BULLETIN
          </p>
        </div>
      </div>
    );
  }

  const isLethal = article.sentiment === "LETHAL";
  const isSell = article.action === "SELL";

  return (
    <motion.div
      className={`border-4 bg-black h-full flex flex-col ${
        isLethal
          ? "border-[#FF0000]"
          : isSell
            ? "border-[#FF6666]"
            : "border-white"
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={article.id}
    >
      {/* Header */}
      <div className="border-b-4 border-white px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-bold text-white">INTEL REPORT</span>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 ${
              article.sentiment === "LETHAL"
                ? "bg-[#FF0000] text-white"
                : article.sentiment === "BEARISH"
                  ? "bg-[#FF6666] text-white"
                  : "bg-green-600 text-white"
            }`}
          >
            {article.sentiment}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Headline */}
        <h3
          className={`text-lg font-bold leading-tight ${isLethal ? "text-[#FF0000]" : "text-white"}`}
        >
          {article.original.headline}
        </h3>

        {/* Scores Grid */}
        <div className="grid grid-cols-2 gap-2">
          <ScoreMeter
            label="GLOBAL SCORE"
            value={article.global_score}
            max={10}
          />
          <ScoreMeter
            label="PORTFOLIO THREAT"
            value={article.portfolio_threat}
            max={10}
            danger
          />
        </div>

        {/* Full Content */}
        <div className="border-2 border-gray-800 p-3">
          <p className="text-xs text-gray-400 leading-relaxed">
            {article.original.full_content}
          </p>
        </div>

        {/* AI Reasoning */}
        <div className="border-2 border-[#FF0000] p-3 bg-[#1a0000]">
          <div className="text-[10px] text-[#FF0000] font-bold mb-1">
            AI REASONING
          </div>
          <p className="text-sm font-bold text-white">{article.reasoning}</p>
        </div>

        {/* AI Re-evaluation */}
        <div className="border-2 border-gray-700 p-3 bg-gray-950 space-y-2">
          <div className="text-[10px] text-gray-400 font-bold mb-1">
            AI REVIEW — SOURCE RE-EVALUATION
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold px-1.5 py-0.5 border border-white text-white">
              AI SENTIMENT: {article.ai_review.revised_sentiment}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 border ${
                article.ai_review.verdict === "AGREE"
                  ? "border-green-500 text-green-400"
                  : article.ai_review.verdict === "DISAGREE"
                    ? "border-[#FF0000] text-[#FF0000]"
                    : "border-[#D4AF37] text-[#D4AF37]"
              }`}
            >
              VERDICT: {article.ai_review.verdict}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 border border-gray-600 text-gray-300">
              {article.ai_review.confidence}% CONFIDENCE
            </span>
          </div>
          <p className="text-xs text-gray-300">{article.ai_review.reasoning}</p>
        </div>

        {/* Action */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500 font-bold">
            RECOMMENDED ACTION:
          </span>
          <span
            className={`text-sm font-bold px-3 py-1 border-2 ${
              article.action === "SELL"
                ? "border-[#FF0000] text-[#FF0000]"
                : article.action === "BUY"
                  ? "border-white text-white"
                  : article.action === "REBALANCE"
                    ? "border-[#D4AF37] text-[#D4AF37]"
                    : "border-gray-600 text-gray-400"
            }`}
          >
            {article.action}
          </span>
        </div>

        {/* Affected Assets */}
        <div>
          <div className="text-[10px] text-gray-500 font-bold mb-2">
            AFFECTED ASSETS
          </div>
          <div className="flex gap-2 flex-wrap">
            {article.affected_assets.map((sym) => (
              <span
                key={sym}
                className="text-xs font-bold px-2 py-1 border-2 border-white text-white"
              >
                {sym}
              </span>
            ))}
          </div>
        </div>

        {/* Potential Net Profit */}
        {article.affected_assets.length > 0 &&
          (() => {
            const sym = article.affected_assets[0];
            const price = prices[sym];
            if (!price) return null;
            // Simulate a second-exchange price with a small drift
            const drift = (Math.random() - 0.5) * 0.008 * price;
            const altPrice = price + drift;
            const result = calculateNetProfit({
              priceA: price,
              priceB: altPrice,
            });
            return (
              <div
                className={`border-2 p-3 ${result.shouldTrade ? "border-green-600 bg-green-950" : "border-gray-700 bg-gray-950"}`}
              >
                <div
                  className="text-[10px] font-bold mb-2 uppercase"
                  style={{ color: result.shouldTrade ? "#22c55e" : "#ef4444" }}
                >
                  POTENTIAL NET PROFIT — {sym}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[9px] text-gray-500">RAW SPREAD</div>
                    <div className="text-sm font-bold text-white">
                      {currency === "EUR" ? "€" : "$"}
                      {result.rawSpread.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-gray-500">
                      {result.rawSpreadPct.toFixed(3)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500">FEES + SLIP</div>
                    <div className="text-sm font-bold text-[#FF6666]">
                      -{currency === "EUR" ? "€" : "$"}
                      {result.totalCost.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-gray-500">
                      {result.totalCostPct.toFixed(3)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500">NET P&L</div>
                    <div
                      className={`text-sm font-bold ${result.netProfit > 0 ? "text-green-400" : "text-[#FF0000]"}`}
                    >
                      {result.netProfit > 0 ? "+" : ""}
                      {currency === "EUR" ? "€" : "$"}
                      {result.netProfit.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-gray-500">
                      {result.netProfitPct.toFixed(3)}%
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 border-2 ${
                      result.shouldTrade
                        ? "border-green-500 text-green-400"
                        : "border-[#FF0000] text-[#FF0000]"
                    }`}
                  >
                    {result.shouldTrade ? "✓ TRADE VIABLE" : "✗ NOT PROFITABLE"}
                  </span>
                </div>
              </div>
            );
          })()}

        {/* Source */}
        <div className="text-[10px] text-gray-600">
          SOURCE: {article.original.source} • {article.original.category} •{" "}
          {new Date(article.timestamp).toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
}

function ScoreMeter({
  label,
  value,
  max,
  danger = false,
}: {
  label: string;
  value: number;
  max: number;
  danger?: boolean;
}) {
  const pct = (value / max) * 100;
  const isHigh = value >= 7;

  return (
    <div className="border-2 border-gray-800 p-2">
      <div className="text-[9px] text-gray-500 font-bold mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div
          className={`text-xl font-bold ${danger && isHigh ? "text-[#FF0000]" : "text-white"}`}
        >
          {value}
        </div>
        <div className="flex-1 h-2 bg-gray-900">
          <motion.div
            className={`h-full ${danger && isHigh ? "bg-[#FF0000]" : pct > 70 ? "bg-[#D4AF37]" : "bg-white"}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[9px] text-gray-600">/{max}</span>
      </div>
    </div>
  );
}

// ── Holdings Panel ────────────────────────────────────────
function HoldingsPanel({
  holdings,
  prices,
  holdingValuesUsdt,
  holdingValuesDisplay,
  walletBalance,
  walletBalanceDisplay,
  currency,
  analyses,
}: {
  holdings: Record<string, number>;
  prices: Record<string, number>;
  holdingValuesUsdt: Record<string, number>;
  holdingValuesDisplay: Record<string, number>;
  walletBalance: number;
  walletBalanceDisplay: number;
  currency: DisplayCurrency;
  analyses: NewsAnalysis[];
}) {
  // Determine which held assets are under threat
  const threatenedSymbols = new Set<string>();
  analyses.forEach((a) => {
    if (
      a.threat_level >= 7 &&
      (a.sentiment === "BEARISH" || a.sentiment === "LETHAL")
    ) {
      a.affected_assets.forEach((sym) => {
        if (holdings[sym] && holdings[sym] > 0) threatenedSymbols.add(sym);
      });
    }
  });

  const entries = Object.entries(holdings).filter(([, amt]) => amt > 0);
  const holdingsTotalValue = entries.reduce((acc, [sym, amt]) => {
    const serverValue =
      currency === "USD" ? holdingValuesUsdt[sym] : holdingValuesDisplay[sym];
    if (typeof serverValue === "number") return acc + serverValue;
    return acc + amt * (prices[sym] || 0);
  }, 0);
  const cashValue = currency === "USD" ? walletBalance : walletBalanceDisplay;
  const walletTotalValue = cashValue + holdingsTotalValue;

  return (
    <div className="border-4 border-white bg-black h-full flex flex-col">
      <div className="border-b-4 border-white px-4 py-2">
        <h2 className="text-sm font-bold tracking-widest text-white">
          HOLDINGS
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Cash */}
        <div className="border-b-2 border-gray-800 px-4 py-3">
          <div className="text-[10px] text-gray-500 font-bold">
            CASH BALANCE ({currency})
          </div>
          <div className="text-lg font-bold text-white">
            {formatMoney(cashValue, currency)}
          </div>
        </div>

        <div className="border-b-2 border-gray-800 px-4 py-3">
          <div className="text-[10px] text-gray-500 font-bold">
            TOTAL WALLET VALUE
          </div>
          <div className="text-lg font-bold text-[#D4AF37]">
            {formatMoney(walletTotalValue, currency)}
          </div>
        </div>

        {/* Holdings */}
        {entries.map(([sym, amt]) => {
          const price = prices[sym] || 0;
          const value =
            typeof (currency === "USD"
              ? holdingValuesUsdt[sym]
              : holdingValuesDisplay[sym]) === "number"
              ? currency === "USD"
                ? holdingValuesUsdt[sym]
                : holdingValuesDisplay[sym]
              : amt * price;
          const isThreatened = threatenedSymbols.has(sym);

          return (
            <motion.div
              key={sym}
              className={`border-b-2 px-4 py-3 ${
                isThreatened
                  ? "border-[#FF0000] bg-[#1a0000]"
                  : "border-gray-800"
              }`}
              animate={
                isThreatened
                  ? { borderColor: ["#FF0000", "#660000", "#FF0000"] }
                  : {}
              }
              transition={
                isThreatened ? { repeat: Infinity, duration: 0.8 } : {}
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{sym}</span>
                  {isThreatened && (
                    <motion.span
                      className="text-[9px] bg-[#FF0000] text-white px-1 py-0.5 font-bold"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                    >
                      AT RISK
                    </motion.span>
                  )}
                </div>
                <span className="text-sm font-bold">
                  {formatMoney(value, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-500">
                  {amt.toFixed(6)} {sym}
                </span>
                <span className="text-[10px] text-gray-500">
                  @ {currency === "EUR" ? "€" : "$"}
                  {price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </motion.div>
          );
        })}

        {entries.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-600 text-sm">
            NO HOLDINGS
          </div>
        )}
      </div>
    </div>
  );
}
