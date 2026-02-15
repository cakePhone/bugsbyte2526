"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type { NewsAnalysis } from "@/app/api/news/analyze/route";
import type { RiskProfile } from "@/components/onboarding/TheInterrogation";
import usePollingTask from "./usePollingTask";

export default function useNewsAnalysis({
  profile,
  holdings,
}: {
  profile: RiskProfile;
  holdings: Record<string, number>;
}) {
  const [analyses, setAnalyses] = useState<NewsAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [newsPage, setNewsPage] = useState(1);
  const [newsTotalPages, setNewsTotalPages] = useState(1);
  const [latestNewsTimestamp, setLatestNewsTimestamp] = useState<string | null>(
    null,
  );
  const [knownNewsIds, setKnownNewsIds] = useState<string[]>([]);
  const [fatalEvents, setFatalEvents] = useState<
    Array<{ timestamp: number; headline: string }>
  >([]);
  const initialFetchDone = useRef(false);

  const fetchAnalysis = useCallback(
    async (page = 1) => {
      try {
        setIsLoading(true);

        const params = new URLSearchParams({
          risk_tolerance: profile.risk_tolerance,
          investment_horizon: profile.investment_horizon,
          focus_sectors: profile.focus_sectors.join(","),
          geopolitical_sensitivity: profile.geopolitical_sensitivity,
          holdings: Object.entries(holdings)
            .map(([symbol, amount]) => `${symbol}:${amount}`)
            .join(","),
          page: String(page),
          pageSize: "10",
        });

        if (latestNewsTimestamp)
          params.set("latestTimestamp", latestNewsTimestamp);
        if (knownNewsIds.length > 0)
          params.set("knownIds", knownNewsIds.join(","));

        const res = await fetch(`/api/news/analyze?${params.toString()}`);
        if (!res.ok) throw new Error("Analysis failed");

        const data = await res.json();
        setAnalyses(data.analyses || []);
        setNewsPage(Number(data?.meta?.page || page));
        setNewsTotalPages(Number(data?.meta?.totalPages || 1));

        const apiLatest = data?.meta?.latestTimestamp;
        if (apiLatest) setLatestNewsTimestamp(String(apiLatest));

        const ids = (data.analyses || [])
          .map((item: NewsAnalysis) => String(item.id))
          .filter(Boolean);
        if (ids.length > 0) {
          setKnownNewsIds((prev) =>
            Array.from(new Set([...ids, ...prev])).slice(0, 200),
          );
        }

        const fatalItems = (data.analyses || []).filter(
          (item: NewsAnalysis) =>
            item.portfolio_threat > 8 &&
            (item.sentiment === "BEARISH" || item.sentiment === "LETHAL"),
        );
        if (fatalItems.length > 0) {
          setFatalEvents((prev) => [
            ...prev.slice(-5),
            ...fatalItems.map((item: NewsAnalysis) => ({
              timestamp: Date.now(),
              headline: item.original.headline,
            })),
          ]);
        }

        setScanCount((count) => count + 1);
      } catch {
        // ignore transient failures
      } finally {
        setIsLoading(false);
      }
    },
    [holdings, knownNewsIds, latestNewsTimestamp, profile],
  );

  // Immediate initial fetch on mount (don't wait for polling)
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchAnalysis(1);
    }
  }, [fetchAnalysis]);

  // Continue polling after initial fetch
  usePollingTask(
    useCallback(() => fetchAnalysis(newsPage), [fetchAnalysis, newsPage]),
    30000,
    scanCount > 0, // Only start polling after first fetch completes
  );

  return {
    analyses,
    isLoading,
    scanCount,
    newsPage,
    newsTotalPages,
    fatalEvents,
    setNewsPage,
  };
}
