"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useWarRoom } from "@/contexts/WarRoomContext";

/**
 * COMMAND HEADER — Top Navigation Bar
 * 
 * Brutalist design: 4px borders, monospace, no rounded corners.
 * Search bar center with auto-complete suggestion tray.
 * Selecting asset solos it on graph + syncs exchange bar.
 */

interface CommandHeaderProps {
  scanCount?: number;
  isScanning?: boolean;
  availableAssets?: string[];
}

export default function CommandHeader({ scanCount = 0, isScanning = false, availableAssets = [] }: CommandHeaderProps) {
  const router = useRouter();
  const { state, setSearchQuery, soloAsset } = useWarRoom();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);

  // Close tray on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        trayRef.current &&
        !trayRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filter suggestions from available assets
  const suggestions = useMemo(() => {
    const query = state.searchQuery.toUpperCase().trim();
    if (!query) return [];
    return availableAssets
      .filter((a) => a.toUpperCase().includes(query))
      .slice(0, 12);
  }, [state.searchQuery, availableAssets]);

  const showTray = isFocused && state.searchQuery.length > 0 && suggestions.length > 0;

  const handleSelectAsset = useCallback((symbol: string) => {
    soloAsset(symbol);
    setSearchQuery("");
    setIsFocused(false);
  }, [soloAsset, setSearchQuery]);

  return (
    <header className="border-b-4 border-white bg-black sticky top-0 z-50">
      <div className="flex items-center h-14">
        {/* Logo - Left */}
        <div className="border-r-4 border-white h-full flex items-center px-4">
          <h1 className="text-lg font-black uppercase tracking-tighter text-white whitespace-nowrap">
            ☕ GEISHA GAINS
          </h1>
        </div>

        {/* Search Bar - Center (Flexible Width) + Auto-Complete Tray */}
        <div className="flex-1 h-full border-r-4 border-white flex items-center px-4">
          <div className="relative w-full max-w-2xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={state.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              placeholder="SEARCH ASSETS / SOLO ON GRAPH..."
              className="w-full bg-black border-4 border-white text-white font-mono font-bold text-sm px-4 py-2 placeholder:text-gray-600 focus:outline-none focus:border-[#FF0000] transition-colors uppercase tracking-wider"
            />
            {state.searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setIsFocused(false); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#FF0000] font-bold"
              >
                ✕
              </button>
            )}

            {/* Auto-Complete Suggestion Tray */}
            <AnimatePresence>
              {showTray && (
                <motion.div
                  ref={trayRef}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.1 }}
                  className="absolute top-full left-0 right-0 z-[60] border-4 border-white border-t-0 bg-black max-h-[300px] overflow-y-auto"
                >
                  <div className="px-3 py-1 border-b-2 border-gray-800">
                    <span className="text-[8px] font-black font-mono text-gray-500 uppercase tracking-widest">
                      {suggestions.length} MATCHES — CLICK TO SOLO
                    </span>
                  </div>
                  {suggestions.map((asset) => (
                    <button
                      key={asset}
                      onClick={() => handleSelectAsset(asset)}
                      className="w-full text-left px-4 py-2 text-sm font-black font-mono text-gray-300 uppercase tracking-wider hover:bg-[#FF0000] hover:text-white transition-colors border-b border-gray-900 flex items-center justify-between"
                    >
                      <span>{asset}</span>
                      <span className="text-[8px] text-gray-600 font-mono">SOLO →</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="border-r-4 border-white h-full flex items-center px-4">
          <div className="flex items-center gap-2">
            <motion.div
              className={`w-2 h-2 ${isScanning ? "bg-[#FF0000]" : "bg-green-400"}`}
              animate={isScanning ? { scale: [1, 1.4, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.3 }}
            />
            <span className="text-[10px] font-black font-mono text-gray-300 uppercase">
              {scanCount} SCANS
            </span>
          </div>
        </div>

        {/* Navigation Nodes - Right */}
        <nav className="flex items-center h-full">
          <button
            onClick={() => router.push("/settings")}
            className="h-full border-r-4 border-white px-4 text-xs font-black font-mono uppercase tracking-widest text-white hover:bg-[#FF0000] hover:text-white transition-colors"
          >
            [ BASE OF OPERATIONS ]
          </button>
          <button
            onClick={() => router.push("/news")}
            className="h-full px-4 text-xs font-black font-mono uppercase tracking-widest text-white hover:bg-[#FF0000] hover:text-white transition-colors"
          >
            [ NEWS ]
          </button>
        </nav>
      </div>
    </header>
  );
}
