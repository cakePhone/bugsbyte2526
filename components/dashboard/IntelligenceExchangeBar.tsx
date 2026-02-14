"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useWarRoom } from "@/contexts/WarRoomContext";
import { useEffect, useRef, useState } from "react";
import AmountPromptModal from "./AmountPromptModal";

/**
 * INTELLIGENCE EXCHANGE BAR — V4 Exchange Comparison Cards
 *
 * AI analyzes prices from exchanges and ranks by:
 * (Price + Taxes + Withdrawal Fees)
 *
 * "Green Bean" (Rank 1) highlighted with Red corner accent.
 * BUY MODE: Shows seller nodes when triggered from Holdings.
 */

export interface ExchangeQuote {
  exchange: string;
  symbol: string;
  askPrice: number;
  bidPrice: number;
  taxRate: number; // percentage
  withdrawalFee: number; // flat fee in USD
  executionSpeed: "FAST" | "MEDIUM" | "SLOW";
  netPriceAfterTax: number;
  rank: number;
  sellerName?: string; // V4: Person-to-person seller name
}

interface IntelligenceExchangeBarProps {
  quotes: ExchangeQuote[];
  isLoading?: boolean;
  apiFailed?: boolean;
  onExecuteTrade?: (
    exchange: string,
    symbol: string,
    amountUsdt: number,
  ) => void;
}

export default function IntelligenceExchangeBar({
  quotes,
  isLoading = false,
  apiFailed = false,
  onExecuteTrade,
}: IntelligenceExchangeBarProps) {
  const { state, setBuyMode } = useWarRoom();
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed by default
  const [buyModal, setBuyModal] = useState<{
    isOpen: boolean;
    exchange: string;
    symbol: string;
  }>({ isOpen: false, exchange: "", symbol: "" });
  const isBuyMode = state.buyMode.active;
  const buySymbol = state.buyMode.symbol;

  // Auto-expand when buy mode is activated
  const prevBuyModeRef = useRef(isBuyMode);
  useEffect(() => {
    if (isBuyMode && !prevBuyModeRef.current) {
      setIsCollapsed(false);
    }
    prevBuyModeRef.current = isBuyMode;
  }, [isBuyMode]);

  // Sort quotes by net price (lowest first)
  const sortedQuotes = [...quotes].sort(
    (a, b) => a.netPriceAfterTax - b.netPriceAfterTax,
  );
  const greenBeanExchange = sortedQuotes[0]?.exchange;

  const getSpeedColor = (speed: ExchangeQuote["executionSpeed"]) => {
    switch (speed) {
      case "FAST":
        return "text-green-400";
      case "MEDIUM":
        return "text-[#D4AF37]";
      case "SLOW":
        return "text-[#FF0000]";
    }
  };

  const getSpeedLabel = (speed: ExchangeQuote["executionSpeed"]) => {
    switch (speed) {
      case "FAST":
        return "< 100ms";
      case "MEDIUM":
        return "< 500ms";
      case "SLOW":
        return "> 1s";
    }
  };

  const handleExecute = (exchange: string, symbol: string) => {
    // Always open buy modal when clicking an exchange card
    setBuyModal({ isOpen: true, exchange, symbol });
  };

  const handleBuyConfirm = (amountUsdt: number) => {
    if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) return;
    if (!buyModal.exchange || !buyModal.symbol) return;

    onExecuteTrade?.(buyModal.exchange, buyModal.symbol, amountUsdt);
    setBuyMode(false, null);
    setBuyModal({ isOpen: false, exchange: "", symbol: "" });
  };

  return (
    <div
      className={`border-4 bg-black w-full overflow-hidden ${apiFailed ? "border-[#FF0000] animate-pulse" : isBuyMode ? "border-[#00FF88]" : "border-white"}`}
    >
      {/* Header - Clickable to toggle */}
      <div
        className={`border-b-4 px-4 py-2 flex items-center justify-between cursor-pointer select-none ${isBuyMode ? "border-[#00FF88] bg-[#00FF88]/10" : "border-white"} ${!isCollapsed ? "" : "border-b-0"}`}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          {/* Collapse indicator */}
          <motion.span
            animate={{ rotate: isCollapsed ? 0 : 90 }}
            transition={{ duration: 0.2 }}
            className="text-white font-mono text-sm"
          >
            ▶
          </motion.span>
          <h3 className="text-sm font-black font-mono uppercase tracking-widest text-white">
            {isBuyMode
              ? "BUY ORDER — SELECT SELLER"
              : "INTELLIGENCE EXCHANGE BAR"}
          </h3>
          {isBuyMode && buySymbol && (
            <span className="text-[10px] font-black font-mono text-[#00FF88] bg-[#00FF88]/20 px-2 py-0.5 border border-[#00FF88]">
              {buySymbol}
            </span>
          )}
          {!isBuyMode && (
            <span className="text-[8px] font-mono text-gray-500 border border-gray-700 px-2 py-0.5">
              RANKED BY NET PRICE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isBuyMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setBuyMode(false, null);
              }}
              className="text-[10px] font-black font-mono text-[#FF0000] hover:text-white border border-[#FF0000] px-2 py-0.5 transition-colors"
            >
              CANCEL
            </button>
          )}
          {isLoading && (
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="text-[10px] font-black font-mono text-[#FF0000] uppercase"
            >
              SYNCING FEEDS...
            </motion.span>
          )}
          <span className="text-[10px] font-mono text-gray-500">
            {quotes.length} {isBuyMode ? "SELLERS" : "EXCHANGES"}
          </span>
          <span className="text-[8px] font-mono text-gray-600">
            {isCollapsed ? "[CLICK TO EXPAND]" : "[CLICK TO COLLAPSE]"}
          </span>
        </div>
      </div>

      {/* Exchange/Seller Cards - Collapsible */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t-4 border-white overflow-x-auto">
              <div className="flex min-w-max">
                {sortedQuotes.length === 0 ? (
                  <div className="px-6 py-8 text-sm font-mono text-gray-600 uppercase">
                    {isBuyMode
                      ? "NO SELLERS AVAILABLE FOR THIS ASSET..."
                      : "NO EXCHANGE DATA AVAILABLE..."}
                  </div>
                ) : (
                  sortedQuotes.map((quote, index) => {
                    const isGreenBean = quote.exchange === greenBeanExchange;
                    const rank = index + 1;

                    return (
                      <motion.div
                        key={`${quote.exchange}-${quote.symbol}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`relative border-r-4 p-4 min-w-[220px] transition-colors cursor-pointer ${
                          isBuyMode
                            ? isGreenBean
                              ? "border-[#00FF88] bg-[#00FF88]/10 hover:bg-[#00FF88]/20"
                              : "border-white hover:bg-gray-900"
                            : isGreenBean
                              ? "border-white bg-[#FF0000]/10 hover:bg-gray-900"
                              : "border-white bg-black hover:bg-gray-900"
                        }`}
                        onClick={() =>
                          handleExecute(quote.exchange, quote.symbol)
                        }
                      >
                        {/* Green Bean / Best Deal Indicator */}
                        {isGreenBean && (
                          <>
                            <div
                              className={`absolute top-0 left-0 w-0 h-0 border-l-[20px] border-t-[20px] border-r-[20px] border-b-[20px] border-r-transparent border-b-transparent ${
                                isBuyMode
                                  ? "border-l-[#00FF88] border-t-[#00FF88]"
                                  : "border-l-[#FF0000] border-t-[#FF0000]"
                              }`}
                            />
                            <span className="absolute top-0 left-0 text-[6px] font-black font-mono text-white ml-0.5 mt-0.5">
                              #1
                            </span>
                          </>
                        )}

                        {/* Rank Badge */}
                        <div className="absolute top-2 right-2">
                          <span
                            className={`text-[10px] font-black font-mono ${
                              isGreenBean
                                ? isBuyMode
                                  ? "text-[#00FF88]"
                                  : "text-[#FF0000]"
                                : "text-gray-600"
                            }`}
                          >
                            RANK {rank}
                          </span>
                        </div>

                        {/* Exchange/Seller Name */}
                        <div className="mb-3 mt-1">
                          <span className="text-lg font-black font-mono text-white uppercase tracking-wider">
                            {quote.sellerName || quote.exchange}
                          </span>
                          {isGreenBean && (
                            <span
                              className={`ml-2 text-[8px] font-black font-mono px-1 py-0.5 border ${
                                isBuyMode
                                  ? "text-[#00FF88] bg-[#00FF88]/20 border-[#00FF88]"
                                  : "text-[#FF0000] bg-[#FF0000]/20 border-[#FF0000]"
                              }`}
                            >
                              {isBuyMode ? "🎯 BEST DEAL" : "☕ GREEN BEAN"}
                            </span>
                          )}
                        </div>

                        {/* Symbol */}
                        <div className="text-[10px] font-mono text-gray-500 mb-2 uppercase">
                          {quote.symbol}
                        </div>

                        {/* Net Price After Tax */}
                        <div className="border-t-2 border-gray-800 pt-2 mb-2">
                          <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                            NET_PRICE_AFTER_TAX
                          </div>
                          <div
                            className={`text-xl font-black font-mono ${
                              isGreenBean ? "text-[#D4AF37]" : "text-white"
                            }`}
                          >
                            $
                            {quote.netPriceAfterTax.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-mono">
                            <span className="text-gray-600">ASK</span>
                            <span className="text-gray-400">
                              $
                              {quote.askPrice.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between text-[9px] font-mono">
                            <span className="text-gray-600">TAX</span>
                            <span className="text-gray-400">
                              {quote.taxRate.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-[9px] font-mono">
                            <span className="text-gray-600">WITHDRAWAL</span>
                            <span className="text-gray-400">
                              ${quote.withdrawalFee.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Execution Speed */}
                        <div className="border-t-2 border-gray-800 pt-2 mt-2">
                          <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                            EXECUTION_SPEED
                          </div>
                          <div
                            className={`text-sm font-black font-mono ${getSpeedColor(quote.executionSpeed)}`}
                          >
                            {quote.executionSpeed}{" "}
                            <span className="text-[10px] text-gray-500">
                              {getSpeedLabel(quote.executionSpeed)}
                            </span>
                          </div>
                        </div>

                        {/* Buy Mode CTA */}
                        {isBuyMode && (
                          <div className="border-t-2 border-gray-800 pt-2 mt-2">
                            <div
                              className={`text-center text-xs font-black font-mono uppercase py-1 ${
                                isGreenBean ? "text-[#00FF88]" : "text-gray-500"
                              }`}
                            >
                              CLICK TO BUY →
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AmountPromptModal
        isOpen={buyModal.isOpen}
        title="EXECUTE BUY"
        symbol={buyModal.symbol}
        unitLabel="USDT"
        defaultValue={100}
        accent="buy"
        onClose={() => setBuyModal({ isOpen: false, exchange: "", symbol: "" })}
        onConfirm={handleBuyConfirm}
      />
    </div>
  );
}

/**
 * Helper: Generate mock exchange quotes for testing
 */
export function generateMockExchangeQuotes(
  symbol: string,
  basePrice: number,
): ExchangeQuote[] {
  const exchanges = [
    {
      name: "UPHOLD",
      taxRate: 0.15,
      withdrawalFee: 1.5,
      speed: "FAST" as const,
      priceVar: 0,
    },
    {
      name: "COINBASE",
      taxRate: 0.25,
      withdrawalFee: 2.0,
      speed: "MEDIUM" as const,
      priceVar: 0.002,
    },
    {
      name: "KRAKEN",
      taxRate: 0.16,
      withdrawalFee: 1.0,
      speed: "FAST" as const,
      priceVar: -0.001,
    },
    {
      name: "BINANCE",
      taxRate: 0.1,
      withdrawalFee: 0.5,
      speed: "FAST" as const,
      priceVar: -0.003,
    },
    {
      name: "GEMINI",
      taxRate: 0.35,
      withdrawalFee: 3.0,
      speed: "SLOW" as const,
      priceVar: 0.005,
    },
  ];

  return exchanges.map((ex, index) => {
    const askPrice = basePrice * (1 + ex.priceVar + Math.random() * 0.002);
    const bidPrice = askPrice * 0.998;
    const netPriceAfterTax =
      askPrice * (1 + ex.taxRate / 100) + ex.withdrawalFee;

    return {
      exchange: ex.name,
      symbol,
      askPrice,
      bidPrice,
      taxRate: ex.taxRate,
      withdrawalFee: ex.withdrawalFee,
      executionSpeed: ex.speed,
      netPriceAfterTax,
      rank: index + 1,
    };
  });
}
