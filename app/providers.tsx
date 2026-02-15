"use client";

import { useEffect } from "react";
import { CoinPricesProvider } from "@/contexts/CoinPricesContext";

export default function Providers({ children }: { children: React.ReactNode }) {
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

  return <CoinPricesProvider>{children}</CoinPricesProvider>;
}
