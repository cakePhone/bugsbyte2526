"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWarRoom } from "@/contexts/WarRoomContext";
import { formatMoney } from "./formatting";
import type { DisplayCurrency } from "./types";
import AmountPromptModal from "./AmountPromptModal";

/**
 * TACTICAL HOLDINGS — Left Sidebar Panel (V4)
 *
 * 25% viewport width. Displays user assets from Prisma.
 * Clicking row slides out ACTION TRAY with BUY/SELL/PLAN commands.
 * Endangered assets pulse RED when threat level is high.
 */

interface TacticalHoldingsProps {
  holdings: Record<string, number>;
  balanceUsdt?: number;
  prices: Record<string, number>;
  holdingValuesUsdt: Record<string, number>;
  holdingValuesDisplay: Record<string, number>;
  currency: DisplayCurrency;
  threatenedSymbols?: Set<string>;
  priceChanges24h?: Record<string, number>;
  onAssetClick?: (symbol: string) => void;
  onPlanRequest?: (symbol: string) => void;
  onSellRequest?: (symbol: string, amount: number) => void;
}

export default function TacticalHoldings({
  holdings,
  balanceUsdt = 0,
  prices,
  holdingValuesUsdt,
  holdingValuesDisplay,
  currency,
  threatenedSymbols = new Set(),
  priceChanges24h = {},
  onAssetClick,
  onPlanRequest,
  onSellRequest,
}: TacticalHoldingsProps) {
  const { state, soloAsset, setBuyMode } = useWarRoom();
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [sellModal, setSellModal] = useState<{
    isOpen: boolean;
    symbol: string;
    maxAmount: number;
  }>({ isOpen: false, symbol: "", maxAmount: 0 });
  const trayRef = useRef<HTMLDivElement>(null);

  const entries = Object.entries(holdings).filter(([, amt]) => amt > 0);

  const totalValue = entries.reduce((acc, [sym, amt]) => {
    const serverValue =
      currency === "USD" ? holdingValuesUsdt[sym] : holdingValuesDisplay[sym];
    if (typeof serverValue === "number" && Number.isFinite(serverValue)) {
      return acc + serverValue;
    }
    const livePrice = Number(prices[sym] || 0);
    if (!Number.isFinite(livePrice) || livePrice <= 0) return acc;
    return acc + amt * livePrice;
  }, 0);

  // Filter entries based on search query
  const filteredEntries = state.searchQuery
    ? entries.filter(([sym]) =>
        sym.toLowerCase().includes(state.searchQuery.toLowerCase()),
      )
    : entries;

  // Close action tray on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (trayRef.current && !trayRef.current.contains(e.target as Node)) {
        setExpandedAsset(null);
      }
    };
    if (expandedAsset) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [expandedAsset]);

  // Handle BUY action
  const handleBuy = (sym: string) => {
    soloAsset(sym);
    setBuyMode(true, sym);
    setExpandedAsset(null);
    onAssetClick?.(sym);
  };

  // Handle SELL action
  const handleSell = (sym: string, maxAmount: number) => {
    setSellModal({
      isOpen: true,
      symbol: sym,
      maxAmount,
    });
  };

  const handleSellConfirm = (amount: number) => {
    const { symbol, maxAmount } = sellModal;
    if (!symbol) return;
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (amount > maxAmount) return;

    setSellModal({ isOpen: false, symbol: "", maxAmount: 0 });
    setExpandedAsset(null);
    onSellRequest?.(symbol, amount);
  };

  // Handle PLAN action — open Tactical Plan Modal
  const handlePlan = (sym: string) => {
    onPlanRequest?.(sym);
  };

  const [isResetting, setIsResetting] = useState(false);

  // Reset wallet to initial state
  const handleResetWallet = async () => {
    if (isResetting) return;
    if (!confirm("Reset wallet to $10,000 USDT? All holdings will be cleared.")) return;
    
    try {
      setIsResetting(true);
      const res = await fetch("/api/user/wallets/reset", {
        method: "POST",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Reset failed");
      }
      
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to reset wallet");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <aside className="w-full h-full border-r-4 border-white bg-black flex flex-col">
      {/* Header */}
      <div className="border-b-4 border-white px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-black font-mono uppercase tracking-widest text-white">
          TACTICAL HOLDINGS
        </h2>
        <button
          onClick={handleResetWallet}
          disabled={isResetting}
          className="text-[8px] font-black font-mono text-gray-500 hover:text-[#FF0000] border border-gray-700 hover:border-[#FF0000] px-2 py-1 transition-colors disabled:opacity-50"
          title="Reset wallet to $10,000 USDT"
        >
          {isResetting ? "..." : "RESET"}
        </button>
      </div>

      {/* Total Value */}
      <div className="border-b-4 border-white px-4 py-4 bg-black">
        <div className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest">
          TOTAL DEPLOYED VALUE
        </div>
        <div className="text-2xl font-black font-mono text-white mt-1">
          {formatMoney(totalValue, currency)}
        </div>
        <div className="text-[10px] font-mono text-gray-600 mt-1">
          {entries.length} ACTIVE POSITIONS
        </div>
      </div>

      {/* Free Funds (USDT Balance) */}
      <div className="border-b-4 border-white px-4 py-3 bg-black">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] font-black font-mono text-gray-500 uppercase tracking-widest">
              FREE FUNDS
            </div>
            <div className="text-lg font-black font-mono text-[#00FF88] mt-0.5">
              ${balanceUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-[8px] font-mono text-gray-600 uppercase">
            USDT
          </div>
        </div>
      </div>

      {/* Assets List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {filteredEntries.length === 0 ? (
            <div className="px-4 py-6 text-xs font-mono text-gray-600 uppercase">
              NO HOLDINGS DETECTED...
            </div>
          ) : (
            filteredEntries.map(([sym, amt]) => {
              const value =
                currency === "USD"
                  ? holdingValuesUsdt[sym]
                  : holdingValuesDisplay[sym];
              const displayValue =
                typeof value === "number" && Number.isFinite(value)
                  ? value
                  : amt * Number(prices[sym] || 0);
              const isThreatened = threatenedSymbols.has(sym);
              const change24h = priceChanges24h[sym] || 0;
              const isLayerActive = state.layers.some(
                (l) => l.symbol === sym && l.isPrimary,
              );
              const isExpanded = expandedAsset === sym;

              return (
                <motion.div
                  key={sym}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    backgroundColor: isThreatened
                      ? [
                          "rgba(255, 0, 0, 0)",
                          "rgba(255, 0, 0, 0.3)",
                          "rgba(255, 0, 0, 0)",
                        ]
                      : "transparent",
                  }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{
                    duration: 0.2,
                    backgroundColor: isThreatened
                      ? { repeat: Infinity, duration: 1.5 }
                      : {},
                  }}
                  className={`border-b-4 border-white relative ${
                    isLayerActive ? "bg-gray-900" : ""
                  }`}
                >
                  {/* Main Row - Clickable */}
                  <div
                    className="px-4 py-3 cursor-pointer hover:bg-gray-900 transition-colors"
                    onClick={() => setExpandedAsset(isExpanded ? null : sym)}
                  >
                    {/* Symbol & Amount */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black font-mono text-white uppercase">
                          {sym}
                        </span>
                        {isThreatened && (
                          <span className="text-[8px] font-black font-mono text-[#FF0000] bg-[#FF0000]/20 px-1 py-0.5 border border-[#FF0000]">
                            ENDANGERED
                          </span>
                        )}
                        {isLayerActive && (
                          <span className="text-[8px] font-black font-mono text-white bg-white/20 px-1 py-0.5 border border-white">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">
                          {amt.toFixed(amt < 1 ? 6 : 2)}
                        </span>
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          className="text-gray-500 text-[10px]"
                        >
                          ▼
                        </motion.span>
                      </div>
                    </div>

                    {/* Value */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-black font-mono text-[#D4AF37]">
                        {formatMoney(displayValue, currency)}
                      </span>
                      <span
                        className={`text-xs font-black font-mono ${
                          change24h >= 0 ? "text-green-400" : "text-[#FF0000]"
                        }`}
                      >
                        {change24h >= 0 ? "+" : ""}
                        {change24h.toFixed(2)}%
                      </span>
                    </div>

                    {/* Mini Progress Bar */}
                    <div className="mt-2 h-1 bg-gray-800 w-full">
                      <div
                        className={`h-full ${isThreatened ? "bg-[#FF0000]" : "bg-white"}`}
                        style={{
                          width: `${Math.min(100, (displayValue / totalValue) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* ACTION TRAY — Brutalist Slide-Out */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        ref={trayRef}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-white text-black border-t-4 border-black">
                          {/* Action Buttons */}
                          <div className="flex">
                            <button
                              onClick={() => handleBuy(sym)}
                              className="flex-1 border-r-4 border-black px-4 py-3 font-black font-mono text-xs uppercase tracking-widest hover:bg-[#00FF88] transition-colors"
                            >
                              [ BUY ]
                            </button>
                            <button
                              onClick={() => handleSell(sym, amt)}
                              className="flex-1 border-r-4 border-black px-4 py-3 font-black font-mono text-xs uppercase tracking-widest hover:bg-[#FF3B3B] hover:text-white transition-colors"
                            >
                              [ SELL ]
                            </button>
                            <button
                              onClick={() => handlePlan(sym)}
                              className="flex-1 px-4 py-3 font-black font-mono text-xs uppercase tracking-widest hover:bg-[#00D4FF] transition-colors"
                            >
                              [ PLAN ]
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="border-t-4 border-white px-4 py-2 bg-black">
        <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">
          TAP HOLDING TO OPEN ACTION TRAY
        </div>
      </div>

      <AmountPromptModal
        isOpen={sellModal.isOpen}
        title="SELL POSITION"
        symbol={sellModal.symbol}
        unitLabel={sellModal.symbol || "TOKEN"}
        defaultValue={sellModal.maxAmount}
        maxValue={sellModal.maxAmount}
        accent="sell"
        onClose={() =>
          setSellModal({ isOpen: false, symbol: "", maxAmount: 0 })
        }
        onConfirm={handleSellConfirm}
      />
    </aside>
  );
}
