"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";

export type SearchAction = "buy" | "chart" | "merge";

interface SearchActionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  position: { x: number; y: number };
  onAction: (action: SearchAction, symbol: string) => void;
}

export function SearchActionPopup({
  isOpen,
  onClose,
  symbol,
  position,
  onAction,
}: SearchActionPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      // Delay to prevent immediate close on the opening click
      setTimeout(() => {
        window.addEventListener("click", handleClickOutside);
      }, 100);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Adjust position to stay in viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 150),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          transition={{ duration: 0.1 }}
          className="fixed z-[60]"
          style={{
            left: adjustedPosition.x,
            top: adjustedPosition.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-black border-4 border-white font-mono shadow-[4px_4px_0_0_#000] min-w-[160px]">
            {/* Header */}
            <div className="border-b-2 border-white px-3 py-1.5 bg-zinc-900">
              <span className="text-[10px] font-black text-white uppercase tracking-wider">
                {symbol}
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-col">
              {/* BUY */}
              <button
                onClick={() => {
                  onAction("buy", symbol);
                  onClose();
                }}
                className="flex items-center gap-2 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-emerald-400 hover:bg-emerald-600 hover:text-white border-b border-zinc-800 transition-colors text-left"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-emerald-600/20 border border-emerald-600 text-[10px]">
                  $
                </span>
                BUY / SELL
              </button>

              {/* OPEN CHART */}
              <button
                onClick={() => {
                  onAction("chart", symbol);
                  onClose();
                }}
                className="flex items-center gap-2 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-blue-400 hover:bg-blue-600 hover:text-white border-b border-zinc-800 transition-colors text-left"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-blue-600/20 border border-blue-600 text-[10px]">
                  ◈
                </span>
                OPEN CHART
              </button>

              {/* MERGE */}
              <button
                onClick={() => {
                  onAction("merge", symbol);
                  onClose();
                }}
                className="flex items-center gap-2 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-purple-400 hover:bg-purple-600 hover:text-white transition-colors text-left"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-purple-600/20 border border-purple-600 text-[10px]">
                  ⊕
                </span>
                MERGE
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SearchActionPopup;
