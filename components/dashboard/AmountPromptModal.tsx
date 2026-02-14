"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface AmountPromptModalProps {
  isOpen: boolean;
  title: string;
  symbol: string;
  unitLabel: string;
  defaultValue?: number;
  maxValue?: number;
  accent?: "buy" | "sell";
  onClose: () => void;
  onConfirm: (amount: number) => void;
}

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toFixed(value < 1 ? 6 : 2);
}

export default function AmountPromptModal({
  isOpen,
  title,
  symbol,
  unitLabel,
  defaultValue = 0,
  maxValue,
  accent = "buy",
  onClose,
  onConfirm,
}: AmountPromptModalProps) {
  const [value, setValue] = useState<string>("0");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    const initial =
      Number.isFinite(defaultValue) && defaultValue > 0 ? defaultValue : 0;
    setValue(initial ? String(initial) : "");
    setError("");
  }, [defaultValue, isOpen]);

  const accentClasses = useMemo(
    () =>
      accent === "sell"
        ? {
            border: "border-[#FF3B3B]",
            text: "text-[#FF3B3B]",
            button: "hover:bg-[#FF3B3B]",
          }
        : {
            border: "border-[#00FF88]",
            text: "text-[#00FF88]",
            button: "hover:bg-[#00FF88]",
          },
    [accent],
  );

  const handleConfirm = () => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("ENTER A VALID POSITIVE AMOUNT");
      return;
    }

    if (
      typeof maxValue === "number" &&
      Number.isFinite(maxValue) &&
      parsed > maxValue
    ) {
      setError(`AMOUNT EXCEEDS MAX (${formatAmount(maxValue)} ${symbol})`);
      return;
    }

    onConfirm(parsed);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.12 }}
            className="w-full max-w-md border-4 border-white bg-black"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b-4 border-white px-4 py-3 flex items-center justify-between">
              <h4 className="text-xs font-black font-mono uppercase tracking-widest text-white">
                {title}
              </h4>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white text-sm font-black"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                TOKEN
              </div>
              <div
                className={`text-lg font-black font-mono uppercase ${accentClasses.text}`}
              >
                {symbol}
              </div>

              {typeof maxValue === "number" && Number.isFinite(maxValue) && (
                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                  MAX: {formatAmount(maxValue)} {symbol}
                </div>
              )}

              <div>
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">
                  AMOUNT ({unitLabel})
                </label>
                <input
                  autoFocus
                  type="number"
                  min="0"
                  step="any"
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value);
                    if (error) setError("");
                  }}
                  className={`w-full bg-black border-4 px-3 py-2 text-white font-black font-mono focus:outline-none ${accentClasses.border}`}
                  placeholder="0"
                />
              </div>

              {error && (
                <div className="text-[10px] font-black font-mono text-[#FF3B3B] uppercase tracking-widest">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 border-4 border-gray-700 text-gray-300 px-3 py-2 text-xs font-black font-mono uppercase tracking-widest hover:border-white hover:text-white transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirm}
                  className={`flex-1 border-4 border-white text-white px-3 py-2 text-xs font-black font-mono uppercase tracking-widest transition-colors ${accentClasses.button} hover:text-black`}
                >
                  CONFIRM
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
