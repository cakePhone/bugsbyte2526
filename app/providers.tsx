"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CoinPricesProvider } from "@/contexts/CoinPricesContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Apply saved font size on initial load
  useEffect(() => {
    const savedFontSize = localStorage.getItem("geisha_font_size");
    if (savedFontSize) {
      document.documentElement.setAttribute("data-font-size", savedFontSize);
    } else {
      // Default to very-small as per user's requirement
      document.documentElement.setAttribute("data-font-size", "very-small");
    }
  }, []);

  // Prefetch all main routes IMMEDIATELY on app load
  useEffect(() => {
    const routesToPrefetch = [
      "/dashboard",
      "/news",
      "/strategy",
      "/settings",
      "/fund",
    ];

    // Prefetch routes immediately - no delay
    routesToPrefetch.forEach((route) => {
      router.prefetch(route);
    });
  }, [router]);

  // Warm up ALL API caches immediately in background
  useEffect(() => {
    const warmUpCaches = () => {
      // Warm up coins list cache
      fetch("/api/coins?limit=25", { cache: "no-store" }).catch(() => {});
      
      // Warm up market data
      fetch("/api/market/ticker?symbols=BTC,ETH,XRP,SOL,ADA&quote=USD", {
        cache: "no-store",
      }).catch(() => {});

      // Warm up news cache (this is slow, so start it early)
      fetch("/api/crypto-news?limit=10", { cache: "no-store" }).catch(() => {});

      // Warm up user data if logged in
      fetch("/api/user/data", { cache: "no-store" }).catch(() => {});
    };

    // Use requestIdleCallback for non-blocking warming, fallback to immediate
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(warmUpCaches, { timeout: 100 });
    } else {
      warmUpCaches();
    }
  }, []);

  return <CoinPricesProvider>{children}</CoinPricesProvider>;
}
