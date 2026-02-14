/**
 * FUND ARMY — Add funds to wallet
 * Geisha Gains • Coffee Driven Development
 *
 * Demo page: add any arbitrary amount of USDT to the wallet.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const PRESETS = [100, 500, 1000, 5000, 10000, 50000];

export default function FundArmy() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  // ── Auth check + load balance ──────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/");
          return;
        }
        const { user } = await res.json();
        if (!user) {
          router.push("/");
          return;
        }

        const dataRes = await fetch("/api/user/data");
        if (dataRes.ok) {
          const { wallet } = await dataRes.json();
          setBalance(wallet.balanceUsdt);
        }

        setAuthChecked(true);
      } catch {
        router.push("/");
      }
    })();
  }, [router]);

  // ── Submit funding ─────────────────────────────────────
  const handleFund = useCallback(async () => {
    setMsg(null);
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setMsg({ text: "ENTER A VALID AMOUNT.", error: true });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error || "FUNDING FAILED.", error: true });
      } else {
        setBalance(data.balanceUsdt);
        setAmount("");
        setMsg({
          text: `$${parsed.toLocaleString()} DEPLOYED. NEW BALANCE: $${data.balanceUsdt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          error: false,
        });
      }
    } catch {
      setMsg({ text: "NETWORK ERROR.", error: true });
    }
    setLoading(false);
  }, [amount]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-gray-500 font-mono text-sm animate-pulse">
          LOADING...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white font-mono">
      {/* ═══════ HEADER ═══════ */}
      <header className="border-b-4 border-white bg-black sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl md:text-2xl font-bold uppercase tracking-tighter">
              💰 FUND ARMY
            </h1>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="border-2 border-white px-3 py-1 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
          >
            ← WAR ROOM
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6 pb-20">
        {/* Current Balance */}
        <div className="border-4 border-[#D4AF37] bg-black p-6 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">
            CURRENT WAR CHEST
          </div>
          <div className="text-3xl md:text-4xl font-bold text-[#D4AF37]">
            $
            {balance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-xs text-gray-600 mt-1">USDT</div>
        </div>

        {/* Fund Form */}
        <div className="border-4 border-white bg-black">
          <div className="border-b-4 border-white px-4 py-2">
            <span className="text-xs font-bold tracking-widest text-[#D4AF37]">
              DEPLOY CAPITAL
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div className="text-xs text-gray-500 mb-2">
              {">"} SELECT A PRESET OR ENTER A CUSTOM AMOUNT.
            </div>

            {/* Presets */}
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(String(preset))}
                  className={`border-4 px-3 py-3 text-sm font-bold uppercase tracking-wide transition-all ${
                    amount === String(preset)
                      ? "border-[#D4AF37] bg-[#D4AF37] text-black"
                      : "border-gray-600 hover:border-white text-white"
                  }`}
                >
                  ${preset.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">
                CUSTOM AMOUNT (USD)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFund()}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full bg-black border-4 border-gray-600 text-white font-mono px-4 py-3 text-lg focus:border-[#D4AF37] focus:outline-none transition-colors placeholder:text-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Preview */}
            {amount && parseFloat(amount) > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-4 border-gray-700 px-4 py-3 flex items-center justify-between"
              >
                <span className="text-xs text-gray-500">
                  NEW BALANCE AFTER FUNDING
                </span>
                <span className="text-sm font-bold text-[#D4AF37]">
                  $
                  {(balance + parseFloat(amount)).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </motion.div>
            )}

            {msg && (
              <div
                className={`text-xs font-bold ${msg.error ? "text-[#FF0000]" : "text-green-400"}`}
              >
                {">"} {msg.text}
              </div>
            )}

            <button
              onClick={handleFund}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="w-full border-4 border-[#D4AF37] bg-[#D4AF37] text-black px-4 py-3 text-sm font-bold uppercase tracking-widest hover:bg-white hover:border-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "DEPLOYING..." : "> DEPLOY FUNDS"}
            </button>

            <div className="text-[9px] text-gray-600 text-center">
              THIS IS A SIMULATED FUNDING MECHANISM FOR DEMONSTRATION PURPOSES
              ONLY.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
