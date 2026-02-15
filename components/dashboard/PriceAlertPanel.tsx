"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCoinPrices } from "@/contexts/CoinPricesContext";
import { formatMoney } from "./formatting";

/**
 * PRICE ALERT PANEL — Intelligence Notification System
 * 
 * Set price targets for any asset. Get notified when they're hit.
 * Battle-tested for the War Room.
 */

interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: "above" | "below";
  createdAt: number;
  triggeredAt?: number;
}

export default function PriceAlertPanel() {
  const { priceMaps } = useCoinPrices();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAlertSymbol, setNewAlertSymbol] = useState("");
  const [newAlertPrice, setNewAlertPrice] = useState("");
  const [newAlertDirection, setNewAlertDirection] = useState<"above" | "below">("above");
  const [triggeredAlerts, setTriggeredAlerts] = useState<Set<string>>(new Set());
  const [showTriggered, setShowTriggered] = useState(false);

  // Load alerts from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("priceAlerts");
    if (stored) {
      try {
        setAlerts(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load alerts:", e);
      }
    }
  }, []);

  // Save alerts to localStorage whenever they change
  useEffect(() => {
    if (alerts.length > 0) {
      localStorage.setItem("priceAlerts", JSON.stringify(alerts));
    }
  }, [alerts]);

  // Monitor prices and trigger alerts
  useEffect(() => {
    const currentPrices = priceMaps.USD;
    const newlyTriggered = new Set<string>();

    alerts.forEach((alert) => {
      if (alert.triggeredAt) return; // Already triggered

      const currentPrice = currentPrices[alert.symbol];
      if (!currentPrice) return;

      const shouldTrigger =
        (alert.direction === "above" && currentPrice >= alert.targetPrice) ||
        (alert.direction === "below" && currentPrice <= alert.targetPrice);

      if (shouldTrigger) {
        newlyTriggered.add(alert.id);
        
        // Update alert as triggered
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alert.id ? { ...a, triggeredAt: Date.now() } : a
          )
        );

        // Show notification (browser notification if permitted)
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification(`Price Alert: ${alert.symbol}`, {
              body: `${alert.symbol} ${alert.direction === "above" ? "rose above" : "fell below"} $${alert.targetPrice.toLocaleString()}`,
              icon: "/favicon.ico",
            });
          }
        }
      }
    });

    if (newlyTriggered.size > 0) {
      setTriggeredAlerts((prev) => new Set([...Array.from(prev), ...Array.from(newlyTriggered)]));
      // Auto-show triggered alerts for 5 seconds
      setShowTriggered(true);
      setTimeout(() => setShowTriggered(false), 5000);
    }
  }, [priceMaps.USD, alerts]);

  // Request notification permission on first interaction
  const requestNotificationPermission = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  };

  const addAlert = () => {
    const symbol = newAlertSymbol.toUpperCase().trim();
    const price = parseFloat(newAlertPrice);

    if (!symbol || isNaN(price) || price <= 0) {
      return;
    }

    const newAlert: PriceAlert = {
      id: `${symbol}-${Date.now()}`,
      symbol,
      targetPrice: price,
      direction: newAlertDirection,
      createdAt: Date.now(),
    };

    setAlerts((prev) => [...prev, newAlert]);
    setNewAlertSymbol("");
    setNewAlertPrice("");
    setShowAddModal(false);
    requestNotificationPermission();
  };

  const deleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setTriggeredAlerts((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const clearTriggered = () => {
    setAlerts((prev) => prev.filter((a) => !a.triggeredAt));
    setTriggeredAlerts(new Set());
  };

  const activeAlerts = alerts.filter((a) => !a.triggeredAt);
  const triggeredAlertsList = alerts.filter((a) => a.triggeredAt);

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowAddModal(false);
        setShowTriggered(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <>
      <div className="w-full border-4 border-gray-300 bg-black font-mono">
        {/* Header */}
        <div className="border-b-4 border-gray-300 px-3 py-1.5 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#FF0000] animate-pulse" />
            <h3 className="text-white font-bold text-sm uppercase tracking-widest">
              Price Alerts
            </h3>
            {triggeredAlertsList.length > 0 && (
              <span className="text-[#FF0000] text-xs font-bold uppercase animate-pulse">
                ({triggeredAlertsList.length} TRIGGERED)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {triggeredAlertsList.length > 0 && (
              <button
                onClick={() => setShowTriggered(!showTriggered)}
                className="border-2 border-[#FF0000] bg-[#FF0000]/10 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-[#FF0000] hover:bg-[#FF0000] hover:text-white transition-colors"
              >
                🔥 VIEW
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="border-2 border-gray-300 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-white hover:text-black transition-colors"
            >
              + ADD
            </button>
          </div>
        </div>

        {/* Active Alerts List */}
        <div className="p-2 max-h-80 overflow-y-auto custom-scrollbar">
          {activeAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p className="text-sm uppercase tracking-wide">NO ACTIVE ALERTS</p>
              <p className="text-xs mt-1">Set price targets to monitor the market</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {activeAlerts.map((alert) => {
                  const currentPrice = priceMaps.USD[alert.symbol] || 0;
                  const percentDiff = currentPrice
                    ? ((alert.targetPrice - currentPrice) / currentPrice) * 100
                    : 0;
                  const isClose = Math.abs(percentDiff) < 5;

                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className={`border-2 bg-[#1A1A1A] p-2 transition-all ${
                        isClose
                          ? "border-[#FF0000] animate-pulse"
                          : "border-gray-700 hover:border-gray-500"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-base">
                              {alert.symbol}
                            </span>
                            <span
                              className={`text-xs font-bold uppercase ${
                                alert.direction === "above"
                                  ? "text-emerald-500"
                                  : "text-[#FF0000]"
                              }`}
                            >
                              {alert.direction === "above" ? "▲ ABOVE" : "▼ BELOW"}
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-white text-lg font-mono font-bold">
                              ${alert.targetPrice.toLocaleString()}
                            </span>
                            {currentPrice > 0 && (
                              <span
                                className={`text-xs font-mono ${
                                  isClose ? "text-[#FF0000]" : "text-gray-500"
                                }`}
                              >
                                {percentDiff > 0 ? "+" : ""}
                                {percentDiff.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          {currentPrice > 0 && (
                            <div className="mt-1 text-xs text-gray-500">
                              Current: ${currentPrice.toLocaleString()}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="w-6 h-6 border-2 border-gray-700 text-gray-500 hover:border-[#FF0000] hover:text-[#FF0000] flex items-center justify-center text-xs font-bold transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="border-t-2 border-gray-800 px-3 py-1 bg-black">
          <p className="text-xs text-gray-600 uppercase tracking-wide text-center">
            {activeAlerts.length} Active • {triggeredAlertsList.length} Triggered
          </p>
        </div>
      </div>

      {/* Add Alert Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="border-4 border-gray-300 bg-black w-full max-w-md font-mono"
            >
              {/* Modal Header */}
              <div className="border-b-4 border-gray-300 px-4 py-3 flex items-center justify-between">
                <h2 className="text-white font-bold text-base uppercase tracking-widest">
                  New Price Alert
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="border-2 border-gray-300 text-white hover:bg-white hover:text-black w-7 h-7 flex items-center justify-center transition-colors font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Form */}
              <div className="p-4 space-y-4">
                {/* Symbol Input */}
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5 font-bold">
                    Symbol
                  </label>
                  <input
                    type="text"
                    placeholder="BTC, ETH, etc."
                    value={newAlertSymbol}
                    onChange={(e) => setNewAlertSymbol(e.target.value.toUpperCase())}
                    className="w-full bg-[#1A1A1A] text-white px-3 py-2.5 border-2 border-gray-700 focus:border-gray-300 focus:outline-none transition-all font-bold text-sm uppercase tracking-wider"
                  />
                </div>

                {/* Price Input */}
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5 font-bold">
                    Target Price ($)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={newAlertPrice}
                    onChange={(e) => setNewAlertPrice(e.target.value)}
                    className="w-full bg-[#1A1A1A] text-white px-3 py-2.5 border-2 border-gray-700 focus:border-gray-300 focus:outline-none transition-all font-bold text-sm font-mono"
                  />
                </div>

                {/* Direction Selector */}
                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5 font-bold">
                    Alert When Price Goes
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setNewAlertDirection("above")}
                      className={`border-2 py-3 font-bold text-sm uppercase transition-all ${
                        newAlertDirection === "above"
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                          : "border-gray-700 bg-[#1A1A1A] text-gray-500 hover:border-gray-500"
                      }`}
                    >
                      ▲ ABOVE
                    </button>
                    <button
                      onClick={() => setNewAlertDirection("below")}
                      className={`border-2 py-3 font-bold text-sm uppercase transition-all ${
                        newAlertDirection === "below"
                          ? "border-[#FF0000] bg-[#FF0000]/20 text-[#FF0000]"
                          : "border-gray-700 bg-[#1A1A1A] text-gray-500 hover:border-gray-500"
                      }`}
                    >
                      ▼ BELOW
                    </button>
                  </div>
                </div>

                {/* Current Price Display */}
                {newAlertSymbol && priceMaps.USD[newAlertSymbol] && (
                  <div className="border-2 border-gray-800 p-3 bg-[#1A1A1A]">
                    <p className="text-xs text-gray-500 uppercase mb-1">Current Price</p>
                    <p className="text-white text-xl font-mono font-bold">
                      ${priceMaps.USD[newAlertSymbol].toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={addAlert}
                  disabled={!newAlertSymbol || !newAlertPrice}
                  className="w-full border-2 border-gray-300 bg-black text-white hover:bg-white hover:text-black disabled:opacity-30 disabled:cursor-not-allowed py-3 font-bold text-sm uppercase tracking-widest transition-colors"
                >
                  Create Alert
                </button>

                <p className="text-xs text-gray-600 text-center uppercase tracking-wide">
                  ESC to cancel
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Triggered Alerts Notification */}
      <AnimatePresence>
        {showTriggered && triggeredAlertsList.length > 0 && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 right-4 z-50 border-4 border-[#FF0000] bg-black shadow-[8px_8px_0_0_#FF0000] font-mono max-w-md"
          >
            <div className="border-b-4 border-[#FF0000] px-3 py-2 bg-[#FF0000]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <span className="text-white font-bold text-sm uppercase tracking-widest">
                  Alerts Triggered
                </span>
              </div>
              <button
                onClick={() => setShowTriggered(false)}
                className="text-white hover:text-[#FF0000] font-bold text-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {triggeredAlertsList.map((alert) => (
                <div
                  key={alert.id}
                  className="border-2 border-[#FF0000] bg-[#FF0000]/10 p-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold text-base">
                        {alert.symbol}
                      </span>
                      <span className="text-[#FF0000] text-xs ml-2">
                        {alert.direction === "above" ? "▲" : "▼"} $
                        {alert.targetPrice.toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="text-gray-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  {alert.triggeredAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(alert.triggeredAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t-2 border-[#FF0000] px-3 py-2 flex justify-between">
              <button
                onClick={clearTriggered}
                className="text-xs text-gray-500 hover:text-white uppercase tracking-wide"
              >
                Clear All
              </button>
              <span className="text-xs text-gray-600 uppercase">
                Press ESC to close
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #000;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #444;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #fff;
        }
      `}</style>
    </>
  );
}
