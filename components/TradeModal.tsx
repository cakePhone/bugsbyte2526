"use client";

import { useState, useEffect, useCallback } from "react";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice?: number;
  onTrade?: (order: TradeOrder) => void;
}

export interface TradeOrder {
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  quantity: number;
  price?: number; // For limit orders
}

export function TradeModal({
  isOpen,
  onClose,
  symbol,
  currentPrice = 0,
  onTrade,
}: TradeModalProps) {
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [quantity, setQuantity] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number>(currentPrice);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Update limit price when current price changes
  useEffect(() => {
    if (currentPrice > 0) {
      setLimitPrice(currentPrice);
    }
  }, [currentPrice]);

  // Center modal on open
  useEffect(() => {
    if (isOpen) {
      setPosition({
        x: window.innerWidth / 2 - 150,
        y: window.innerHeight / 2 - 150,
      });
    }
  }, [isOpen]);

  // Dragging handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, input")) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(0.01, prev + delta));
  };

  const handleTrade = (side: "buy" | "sell") => {
    const order: TradeOrder = {
      symbol,
      side,
      type: orderType,
      quantity,
      price: orderType === "limit" ? limitPrice : currentPrice,
    };
    onTrade?.(order);
    onClose();
  };

  // Price spread simulation (bid/ask)
  const spread = currentPrice * 0.0005; // 0.05% spread
  const bidPrice = currentPrice - spread;
  const askPrice = currentPrice + spread;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop - click to close */}
      <div
        className="absolute inset-0 bg-black/40 pointer-events-auto"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: position.x,
          top: position.y,
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="bg-black border-4 border-white shadow-[8px_8px_0_0_#000] w-[300px]">
          {/* Header */}
          <div className="border-b-4 border-white p-3 flex items-center justify-between bg-zinc-900">
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-lg tracking-tight">
                {symbol}
              </span>
              <span className="text-emerald-400 font-mono text-sm">
                ${currentPrice.toFixed(2)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-red-400 font-black text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Order Type Tabs */}
          <div className="flex border-b-4 border-white">
            <button
              onClick={() => setOrderType("market")}
              className={`flex-1 py-2 font-black text-sm transition-colors ${
                orderType === "market"
                  ? "bg-white text-black"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              MARKET
            </button>
            <button
              onClick={() => setOrderType("limit")}
              className={`flex-1 py-2 font-black text-sm border-l-4 border-white transition-colors ${
                orderType === "limit"
                  ? "bg-white text-black"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              LIMIT
            </button>
          </div>

          {/* Quantity Input */}
          <div className="p-4 border-b-4 border-white bg-zinc-950">
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2 block">
              Volume
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuantityChange(-1)}
                className="w-10 h-10 bg-zinc-800 border-2 border-zinc-600 text-white font-black text-lg hover:bg-zinc-700 active:translate-y-px"
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0.01, Number(e.target.value)))}
                className="flex-1 h-10 bg-black border-2 border-zinc-600 text-center text-white font-mono text-lg focus:border-white outline-none"
                step="0.01"
                min="0.01"
              />
              <button
                onClick={() => handleQuantityChange(1)}
                className="w-10 h-10 bg-zinc-800 border-2 border-zinc-600 text-white font-black text-lg hover:bg-zinc-700 active:translate-y-px"
              >
                +
              </button>
            </div>

            {/* Limit Price (only for limit orders) */}
            {orderType === "limit" && (
              <div className="mt-4">
                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2 block">
                  Limit Price
                </label>
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(Number(e.target.value))}
                  className="w-full h-10 bg-black border-2 border-zinc-600 text-center text-white font-mono text-lg focus:border-white outline-none"
                  step="0.01"
                  min="0"
                />
              </div>
            )}
          </div>

          {/* Trade Buttons */}
          <div className="grid grid-cols-2">
            {/* Sell Button */}
            <button
              onClick={() => handleTrade("sell")}
              className="p-4 bg-red-600 hover:bg-red-500 active:bg-red-700 border-r-2 border-white transition-colors group"
            >
              <div className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">
                Sell
              </div>
              <div className="text-white font-black text-xl font-mono group-hover:scale-105 transition-transform">
                {bidPrice.toFixed(2)}
              </div>
            </button>

            {/* Buy Button */}
            <button
              onClick={() => handleTrade("buy")}
              className="p-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 border-l-2 border-white transition-colors group"
            >
              <div className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">
                Buy
              </div>
              <div className="text-white font-black text-xl font-mono group-hover:scale-105 transition-transform">
                {askPrice.toFixed(2)}
              </div>
            </button>
          </div>

          {/* Order Summary */}
          <div className="p-3 bg-zinc-900 border-t-4 border-white">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500 font-bold">Est. Value:</span>
              <span className="text-white font-mono">
                ${(quantity * currentPrice).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TradeModal;
