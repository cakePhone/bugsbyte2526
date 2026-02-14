"use client";

import { useCallback, useState } from "react";
import usePollingTask from "./usePollingTask";
import type { ArbitrageOpportunity } from "@/lib/aiAnalyzer";

export interface ArbitrageOrder {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  amount: number;
  price: number;
  totalValue: number;
  pnl: number | null;
  exchange: string | null;
  confidence: number | null;
  isOverdrive: boolean;
  timestamp: string;
}

export type ArbitrageOpportunityView = ArbitrageOpportunity & {
  execution: {
    buyExchange: string;
    sellExchange: string;
    grossSpreadPct: number;
    totalCostPct: number;
    transferCostPct: number;
    netSpreadPct: number;
    estimatedNetUsdPerUnit: number;
    shouldTrade: boolean;
  };
};

export interface OpportunityHistoryEntry {
  id: string;
  timestamp: number;
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  netSpreadPct: number;
  estimatedNetUsdPerUnit: number;
}

interface ArbitragePayload {
  timestamp: number;
  opportunities: ArbitrageOpportunityView[];
  orders: ArbitrageOrder[];
  performance: {
    cumulativePnL: number;
    orderCount: number;
  };
}

export default function useArbitrageMonitor(enabled = true) {
  const [loading, setLoading] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [opportunities, setOpportunities] = useState<
    ArbitrageOpportunityView[]
  >([]);
  const [orders, setOrders] = useState<ArbitrageOrder[]>([]);
  const [cumulativePnL, setCumulativePnL] = useState(0);
  const [opportunityHistory, setOpportunityHistory] = useState<
    OpportunityHistoryEntry[]
  >([]);

  const fetchArbitrage = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/arbitrage", { cache: "no-store" });
      if (!res.ok) return;

      const data = (await res.json()) as ArbitragePayload;
      const nextOpportunities = Array.isArray(data.opportunities)
        ? data.opportunities
        : [];

      setOpportunities(nextOpportunities);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setCumulativePnL(Number(data?.performance?.cumulativePnL || 0));
      setScanCount((count) => count + 1);

      const timestamp = Number(data.timestamp || Date.now());
      const detected = nextOpportunities
        .filter((item) => item.execution?.shouldTrade)
        .map((item) => ({
          id: `${timestamp}-${item.symbol}-${item.execution.buyExchange}-${item.execution.sellExchange}`,
          timestamp,
          symbol: item.symbol,
          buyExchange: item.execution.buyExchange,
          sellExchange: item.execution.sellExchange,
          netSpreadPct: item.execution.netSpreadPct,
          estimatedNetUsdPerUnit: item.execution.estimatedNetUsdPerUnit,
        }));

      if (detected.length > 0) {
        setOpportunityHistory((prev) => {
          const merged = [...detected, ...prev];
          const unique = Array.from(
            new Map(merged.map((entry) => [entry.id, entry])).values(),
          );
          return unique.slice(0, 5);
        });
      }
    } catch {
      // ignore transient fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  usePollingTask(fetchArbitrage, 5000, enabled);

  return {
    loading,
    scanCount,
    opportunities,
    orders,
    cumulativePnL,
    opportunityHistory,
  };
}
