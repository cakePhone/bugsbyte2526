/**
 * BASE OF OPERATIONS — Settings
 * Geisha Gains • Coffee Driven Development
 *
 * Change password, update attack strategy, terminate session.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ── Strategy Options (mirrors TheInterrogation) ──────────
const RISK_TOLERANCE = [
  { value: "CONSERVATIVE", label: "CONSERVATIVE", desc: "Preserve Capital" },
  { value: "MODERATE", label: "MODERATE", desc: "Balanced Growth" },
  { value: "AGGRESSIVE", label: "AGGRESSIVE", desc: "Maximum Alpha" },
];

const INVESTMENT_HORIZON = [
  { value: "SCALP", label: "SCALP", desc: "Intraday" },
  { value: "SWING", label: "SWING", desc: "Multi-day" },
  { value: "POSITION", label: "POSITION", desc: "Long-term" },
];

const FOCUS_SECTORS = [
  { value: "CRYPTO", label: "₿ CRYPTO" },
  { value: "STOCKS", label: "📈 STOCKS" },
  { value: "FOREX", label: "💱 FOREX" },
  { value: "COMMODITIES", label: "🛢️ COMMODITIES" },
];

const GEO_SENSITIVITY = [
  { value: "IGNORE", label: "PRICE ACTION ONLY", desc: "Ignore News" },
  { value: "AWARE", label: "MACRO AWARE", desc: "Major Events" },
  { value: "PARANOID", label: "PARANOID", desc: "Track Everything" },
];

interface RiskProfile {
  risk_tolerance: string;
  investment_horizon: string;
  focus_sectors: string[];
  geopolitical_sensitivity: string;
}

export default function BaseOfOperations() {
  const router = useRouter();

  // Auth
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const [pwLoading, setPwLoading] = useState(false);

  // Strategy
  const [strategy, setStrategy] = useState<RiskProfile>({
    risk_tolerance: "MODERATE",
    investment_horizon: "SWING",
    focus_sectors: ["CRYPTO"],
    geopolitical_sensitivity: "AWARE",
  });
  const [stratMsg, setStratMsg] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const [stratLoading, setStratLoading] = useState(false);

  // Terminate session
  const [confirmTerminate, setConfirmTerminate] = useState(false);

  // ── Auth check + load profile ──────────────────────────
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
        setUserEmail(user.email);
        if (user.riskProfile) {
          setStrategy(user.riskProfile as RiskProfile);
        }
        setAuthChecked(true);
      } catch {
        router.push("/");
      }
    })();
  }, [router]);

  // ── Change Password ────────────────────────────────────
  const handleChangePassword = useCallback(async () => {
    setPwMsg(null);
    if (!currentPw || !newPw) {
      setPwMsg({ text: "ALL FIELDS REQUIRED.", error: true });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ text: "MIN 6 CHARACTERS.", error: true });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ text: "PASSWORDS DO NOT MATCH.", error: true });
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMsg({ text: data.error || "FAILED.", error: true });
      } else {
        setPwMsg({ text: "PASSWORD UPDATED.", error: false });
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      }
    } catch {
      setPwMsg({ text: "NETWORK ERROR.", error: true });
    }
    setPwLoading(false);
  }, [currentPw, newPw, confirmPw]);

  // ── Update Strategy ────────────────────────────────────
  const handleUpdateStrategy = useCallback(async () => {
    setStratMsg(null);
    setStratLoading(true);
    try {
      const res = await fetch("/api/auth/strategy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riskProfile: strategy }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStratMsg({ text: data.error || "FAILED.", error: true });
      } else {
        // Also update localStorage so dashboard picks it up
        localStorage.setItem("geisha_risk_profile", JSON.stringify(strategy));
        setStratMsg({ text: "STRATEGY RECALIBRATED.", error: false });
      }
    } catch {
      setStratMsg({ text: "NETWORK ERROR.", error: true });
    }
    setStratLoading(false);
  }, [strategy]);

  // ── Terminate Session ──────────────────────────────────
  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("geisha_risk_profile");
    router.push("/");
  }, [router]);

  // Toggle sector
  const toggleSector = (val: string) => {
    setStrategy((prev) => ({
      ...prev,
      focus_sectors: prev.focus_sectors.includes(val)
        ? prev.focus_sectors.filter((v) => v !== val)
        : [...prev.focus_sectors, val],
    }));
  };

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
              ☕ BASE OF OPERATIONS
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
        {/* Operator ID */}
        <div className="border-4 border-gray-700 bg-black p-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">
            OPERATOR
          </div>
          <div className="text-sm text-white">{userEmail}</div>
        </div>

        {/* ── CHANGE PASSWORD ── */}
        <div className="border-4 border-white bg-black">
          <div className="border-b-4 border-white px-4 py-2">
            <span className="text-xs font-bold tracking-widest text-[#FF0000]">
              CHANGE ACCESS CODES
            </span>
          </div>
          <div className="p-4 space-y-3">
            <InputField
              label="CURRENT PASSWORD"
              type="password"
              value={currentPw}
              onChange={setCurrentPw}
            />
            <InputField
              label="NEW PASSWORD"
              type="password"
              value={newPw}
              onChange={setNewPw}
            />
            <InputField
              label="CONFIRM NEW PASSWORD"
              type="password"
              value={confirmPw}
              onChange={setConfirmPw}
              onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
            />

            {pwMsg && (
              <div
                className={`text-xs font-bold ${pwMsg.error ? "text-[#FF0000]" : "text-green-400"}`}
              >
                {">"} {pwMsg.text}
              </div>
            )}

            <button
              onClick={handleChangePassword}
              disabled={pwLoading}
              className="w-full border-4 border-white bg-black text-white px-4 py-3 text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors disabled:opacity-50"
            >
              {pwLoading ? "PROCESSING..." : "> UPDATE CODES"}
            </button>
          </div>
        </div>

        {/* ── ATTACK STRATEGY ── */}
        <div className="border-4 border-white bg-black">
          <div className="border-b-4 border-white px-4 py-2">
            <span className="text-xs font-bold tracking-widest text-[#FF0000]">
              ATTACK STRATEGY
            </span>
          </div>
          <div className="p-4 space-y-5">
            {/* Risk Tolerance */}
            <OptionGroup
              label="RISK THRESHOLD"
              options={RISK_TOLERANCE}
              selected={strategy.risk_tolerance}
              onSelect={(v) =>
                setStrategy((s) => ({ ...s, risk_tolerance: v }))
              }
            />

            {/* Investment Horizon */}
            <OptionGroup
              label="TIMELINE"
              options={INVESTMENT_HORIZON}
              selected={strategy.investment_horizon}
              onSelect={(v) =>
                setStrategy((s) => ({ ...s, investment_horizon: v }))
              }
            />

            {/* Focus Sectors */}
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                BATTLEGROUNDS
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FOCUS_SECTORS.map((opt) => {
                  const selected = strategy.focus_sectors.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleSector(opt.value)}
                      className={`border-4 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                        selected
                          ? "border-[#FF0000] bg-[#FF0000] text-white"
                          : "border-gray-600 hover:border-white text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Geo Sensitivity */}
            <OptionGroup
              label="MACRO SENSITIVITY"
              options={GEO_SENSITIVITY}
              selected={strategy.geopolitical_sensitivity}
              onSelect={(v) =>
                setStrategy((s) => ({ ...s, geopolitical_sensitivity: v }))
              }
            />

            {stratMsg && (
              <div
                className={`text-xs font-bold ${stratMsg.error ? "text-[#FF0000]" : "text-green-400"}`}
              >
                {">"} {stratMsg.text}
              </div>
            )}

            <button
              onClick={handleUpdateStrategy}
              disabled={stratLoading}
              className="w-full border-4 border-[#FF0000] bg-[#FF0000] text-white px-4 py-3 text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-colors disabled:opacity-50"
            >
              {stratLoading ? "RECALIBRATING..." : "> DEPLOY NEW STRATEGY"}
            </button>
          </div>
        </div>

        {/* ── TERMINATE SESSION ── */}
        <div className="border-4 border-gray-700 bg-black">
          <div className="border-b-4 border-gray-700 px-4 py-2">
            <span className="text-xs font-bold tracking-widest text-gray-500">
              DANGER ZONE
            </span>
          </div>
          <div className="p-4">
            <AnimatePresence mode="wait">
              {!confirmTerminate ? (
                <motion.button
                  key="trigger"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setConfirmTerminate(true)}
                  className="w-full border-4 border-gray-600 text-gray-400 px-4 py-3 text-sm font-bold uppercase tracking-widest hover:border-[#FF0000] hover:text-[#FF0000] transition-colors"
                >
                  {">"} TERMINATE SESSION
                </motion.button>
              ) : (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="text-[#FF0000] text-xs font-bold">
                    {">"} CONFIRM: THIS WILL END YOUR CURRENT SESSION.
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleLogout}
                      className="flex-1 border-4 border-[#FF0000] bg-[#FF0000] text-white px-4 py-3 text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-colors"
                    >
                      CONFIRM
                    </button>
                    <button
                      onClick={() => setConfirmTerminate(false)}
                      className="flex-1 border-4 border-gray-600 text-gray-400 px-4 py-3 text-sm font-bold uppercase tracking-widest hover:border-white hover:text-white transition-colors"
                    >
                      ABORT
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Reusable Input ────────────────────────────────────────
function InputField({
  label,
  type = "text",
  value,
  onChange,
  onKeyDown,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full bg-black border-4 border-gray-600 text-white font-mono px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors"
      />
    </div>
  );
}

// ── Reusable Option Group ─────────────────────────────────
function OptionGroup({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: Array<{ value: string; label: string; desc?: string }>;
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">
        {label}
      </div>
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`w-full text-left border-4 px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
              selected === opt.value
                ? "border-[#FF0000] bg-[#FF0000] text-white"
                : "border-gray-600 hover:border-white text-white"
            }`}
          >
            {opt.label}
            {opt.desc && (
              <span className="text-gray-400 ml-2 font-normal">
                — {opt.desc}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
