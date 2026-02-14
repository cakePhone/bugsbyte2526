"use client";

import { CoinPricesProvider } from "@/contexts/CoinPricesContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <CoinPricesProvider>{children}</CoinPricesProvider>;
}
