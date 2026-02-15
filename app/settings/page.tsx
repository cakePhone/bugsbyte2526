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

type ValuationCurrency = "USDT" | "EUR";
type FontSize = "very-small" | "small" | "normal" | "big";

export default function BaseOfOperations() {
  const router = useRouter();

  // Auth
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Display Preferences
  const [fontSize, setFontSize] = useState<FontSize>("very-small");

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const [pwLoading, setPwLoading] = useState(false);

  // Strategy
  const INITIAL_STRATEGY: RiskProfile = {
    risk_tolerance: "MODERATE",
    investment_horizon: "SWING",
    focus_sectors: ["CRYPTO"],
    geopolitical_sensitivity: "AWARE",
  };

  const [strategy, setStrategy] = useState<RiskProfile>(INITIAL_STRATEGY);
  const [stratMsg, setStratMsg] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const [stratLoading, setStratLoading] = useState(false);
  const [valuationCurrency, setValuationCurrency] =
    useState<ValuationCurrency>("USDT");

  // Terminate session
  const [confirmTerminate, setConfirmTerminate] = useState(false);

  // Account Management
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [switchingAccount, setSwitchingAccount] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

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
          // Merge user's risk profile with defaults to ensure required fields exist
          setStrategy(
            (prev) =>
              ({
                ...INITIAL_STRATEGY,
                ...(user.riskProfile as Partial<RiskProfile>),
              }) as RiskProfile,
          );
        }
        if (user.preferences?.valuation_currency === "EUR") {
          setValuationCurrency("EUR");
        }
        setAuthChecked(true);

        // Load saved accounts from localStorage
        const savedAccounts = localStorage.getItem("geisha_accounts");
        if (savedAccounts) {
          try {
            setAccounts(JSON.parse(savedAccounts));
          } catch (e) {
            console.error("Failed to parse accounts:", e);
          }
        }

        // Load font size preference from localStorage
        const savedFontSize = localStorage.getItem(
          "geisha_font_size",
        ) as FontSize;
        if (savedFontSize) {
          setFontSize(savedFontSize);
          document.documentElement.setAttribute(
            "data-font-size",
            savedFontSize,
          );
        } else {
          // Set default to very-small
          document.documentElement.setAttribute("data-font-size", "very-small");
        }
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
        body: JSON.stringify({
          riskProfile: strategy,
          valuationCurrency,
        }),
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
  }, [strategy, valuationCurrency]);

  // ── Terminate Session ──────────────────────────────────
  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("geisha_risk_profile");
    router.push("/");
  }, [router]);

  // ── Font Size Management ────────────────────────────────
  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    localStorage.setItem("geisha_font_size", size);
    document.documentElement.setAttribute("data-font-size", size);
  };

  // ── Account Management ──────────────────────────────────
  const handleManageAccounts = () => {
    setShowAccountModal(true);
  };

  const handleSelectAccount = async (email: string) => {
    setSwitchingAccount(email);
    setSwitchError(null);

    // Try to login with stored credentials if available
    const storedCreds = localStorage.getItem(`creds_${email}`);
    if (!storedCreds) {
      setSwitchError(
        "No stored credentials for this account. Please login manually.",
      );
      setSwitchingAccount(null);
      return;
    }

    try {
      const { password } = JSON.parse(storedCreds);

      // Logout current user first
      await fetch("/api/auth/logout", { method: "POST" });

      // Login with new account
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user?.riskProfile) {
          localStorage.setItem(
            "geisha_risk_profile",
            JSON.stringify(data.user.riskProfile),
          );
        }
        setShowAccountModal(false);
        setSwitchingAccount(null);
        router.push("/dashboard");
        // Force a page reload to ensure fresh data
        window.location.href = "/dashboard";
      } else {
        const data = await res.json();
        setSwitchError(data.error || "Login failed. Please try again.");
        setSwitchingAccount(null);
      }
    } catch (e) {
      console.error("Auto-login failed:", e);
      setSwitchError("Failed to switch account. Please try again.");
      setSwitchingAccount(null);
    }
  };

  const handleRemoveAccount = (email: string) => {
    const updated = accounts.filter((acc) => acc !== email);
    setAccounts(updated);
    localStorage.setItem("geisha_accounts", JSON.stringify(updated));
    // Also remove stored credentials
    localStorage.removeItem(`creds_${email}`);
  };

  const handleAddOperator = async () => {
    // Log out current user and redirect to home page for registration
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("geisha_risk_profile");
    router.push("/");
  };

  // Toggle sector
  const toggleSector = (val: string) => {
    setStrategy((prev) => ({
      ...prev,
      focus_sectors: (prev.focus_sectors || []).includes(val)
        ? (prev.focus_sectors || []).filter((v) => v !== val)
        : [...(prev.focus_sectors || []), val],
    }));
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-white font-mono text-2xl font-bold animate-pulse">
            ⚙️ BASE OF OPERATIONS
          </div>
          <div className="text-gray-300 font-mono text-sm">
            LOADING CONFIGURATION...
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-white animate-ping"></div>
            <div
              className="w-2 h-2 bg-white animate-ping"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="w-2 h-2 bg-white animate-ping"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
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
        {/* ── DISPLAY PREFERENCES ── */}
        <div className="border-4 border-gray-300 bg-black">
          <div className="border-b-4 border-gray-300 px-4 py-2">
            <span className="text-xs font-bold tracking-widest text-[#DD0000]">
              DISPLAY PREFERENCES
            </span>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-xs text-gray-300 uppercase tracking-widest mb-2">
              FONT SIZE
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "very-small" as FontSize, label: "VERY SMALL" },
                { value: "small" as FontSize, label: "SMALL" },
                { value: "normal" as FontSize, label: "NORMAL" },
                { value: "big" as FontSize, label: "BIG" },
              ].map((opt) => {
                const selected = fontSize === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleFontSizeChange(opt.value)}
                    className={`border-4 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                      selected
                        ? "border-[#C9A832] bg-[#C9A832] text-black"
                        : "border-gray-300 hover:border-gray-300 text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-gray-300 mt-2">
              {">"} CURRENT:{" "}
              <span className="text-white font-bold">
                {fontSize.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* ── OPERATOR MANAGER ── */}
        <div className="border-4 border-gray-300 bg-black">
          <div className="border-b-4 border-gray-300 px-4 py-2">
            <span className="text-xs font-bold tracking-widest text-[#DD0000]">
              OPERATOR MANAGER
            </span>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-xs text-gray-300 mb-4">
              {">"} CURRENTLY LOGGED IN AS:{" "}
              <span className="text-white font-bold">{userEmail}</span>
            </div>
            <button
              onClick={handleManageAccounts}
              className="w-full border-4 border-gray-300 bg-black text-white px-4 py-3 text-sm font-bold uppercase tracking-widest hover:bg-gray-600 hover:text-white transition-colors"
            >
              {">"} MANAGE ALL ACCOUNTS ({accounts.length})
            </button>
          </div>
        </div>

        {/* ── CHANGE PASSWORD ── */}
        <div className="border-4 border-gray-300 bg-black">
          <div className="border-b-4 border-gray-300 px-4 py-2">
            <span className="text-xs font-bold tracking-widest text-[#DD0000]">
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
                className={`text-xs font-bold ${pwMsg.error ? "text-[#DD0000]" : "text-green-400"}`}
              >
                {">"} {pwMsg.text}
              </div>
            )}

            <button
              onClick={handleChangePassword}
              disabled={pwLoading}
              className="w-full border-4 border-gray-300 bg-black text-white px-4 py-3 text-sm font-bold uppercase tracking-widest hover:bg-gray-600 hover:text-white transition-colors disabled:opacity-50"
            >
              {pwLoading ? "PROCESSING..." : "> UPDATE CODES"}
            </button>
          </div>
        </div>

        {/* ── ATTACK STRATEGY ── */}
        <div className="border-4 border-gray-300 bg-black">
          <div className="border-b-4 border-gray-300 px-4 py-2">
            <span className="text-xs font-bold tracking-widest text-[#DD0000]">
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
              <div className="text-xs text-gray-300 uppercase tracking-widest mb-2">
                BATTLEGROUNDS
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FOCUS_SECTORS.map((opt) => {
                  const selected = (strategy.focus_sectors || []).includes(
                    opt.value,
                  );
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleSector(opt.value)}
                      className={`border-4 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                        selected
                          ? "border-[#DD0000] bg-[#DD0000] text-white"
                          : "border-gray-300 hover:border-gray-300 text-white"
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

            <div>
              <div className="text-xs text-gray-300 uppercase tracking-widest mb-2">
                WALLET VALUATION
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["USDT", "EUR"] as ValuationCurrency[]).map((curr) => {
                  const selected = valuationCurrency === curr;
                  return (
                    <button
                      key={curr}
                      onClick={() => setValuationCurrency(curr)}
                      className={`border-4 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                        selected
                          ? "border-[#C9A832] bg-[#C9A832] text-black"
                          : "border-gray-300 hover:border-gray-300 text-white"
                      }`}
                    >
                      {curr}
                    </button>
                  );
                })}
              </div>
            </div>

            {stratMsg && (
              <div
                className={`text-xs font-bold ${stratMsg.error ? "text-[#DD0000]" : "text-green-400"}`}
              >
                {">"} {stratMsg.text}
              </div>
            )}

            <button
              onClick={handleUpdateStrategy}
              disabled={stratLoading}
              className="w-full border-4 border-[#DD0000] bg-[#DD0000] text-white px-4 py-3 text-sm font-bold uppercase tracking-widest hover:bg-gray-600 hover:text-white hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              {stratLoading ? "RECALIBRATING..." : "> DEPLOY NEW STRATEGY"}
            </button>
          </div>
        </div>

        {/* ── TERMINATE SESSION ── */}
        <div className="border-4 border-gray-300 bg-black">
          <div className="border-b-4 border-gray-300 px-4 py-2">
            <span className="text-xs font-bold tracking-widest text-gray-300">
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
                  className="w-full border-4 border-gray-300 text-gray-300 px-4 py-3 text-sm font-bold uppercase tracking-widest hover:border-[#DD0000] hover:text-[#DD0000] transition-colors"
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
                  <div className="text-[#DD0000] text-xs font-bold">
                    {">"} CONFIRM: THIS WILL END YOUR CURRENT SESSION.
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleLogout}
                      className="flex-1 border-4 border-[#DD0000] bg-[#DD0000] text-white px-4 py-3 text-sm font-bold uppercase tracking-widest hover:bg-gray-600 hover:text-white hover:border-gray-300 transition-colors"
                    >
                      CONFIRM
                    </button>
                    <button
                      onClick={() => setConfirmTerminate(false)}
                      className="flex-1 border-4 border-gray-300 text-gray-300 px-4 py-3 text-sm font-bold uppercase tracking-widest hover:border-gray-300 hover:text-white transition-colors"
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

      {/* Account Management Modal */}
      <AnimatePresence>
        {showAccountModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => {
              setShowAccountModal(false);
              setSwitchError(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#121212] border-4 border-gray-300 p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b-4 border-gray-300 pb-4 mb-6">
                <h2 className="text-2xl font-bold text-white tracking-widest uppercase">
                  ALL ACCOUNTS
                </h2>
                <button
                  onClick={() => {
                    setShowAccountModal(false);
                    setSwitchError(null);
                  }}
                  className="text-gray-300 hover:text-white text-2xl font-bold transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Error Message */}
              {switchError && (
                <div className="mb-4 border-2 border-[#DD0000] bg-black p-3">
                  <div className="text-[#DD0000] text-xs font-bold">
                    {">"} ERROR: {switchError}
                  </div>
                </div>
              )}

              {/* Accounts List */}
              <div className="space-y-4">
                {accounts.length > 0 ? (
                  <>
                    <div className="text-xs text-gray-300 uppercase tracking-widest mb-3">
                      SAVED ACCOUNTS ({accounts.length})
                    </div>
                    {accounts.map((email) => (
                      <div
                        key={email}
                        className="border-2 border-gray-300 bg-black p-4 flex items-center justify-between hover:border-white transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-[#DD0000]"></div>
                          <span className="text-white font-mono text-sm">
                            {email}
                            {email === userEmail && (
                              <span className="text-xs text-[#DD0000] ml-2">
                                (CURRENT)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {email !== userEmail && (
                            <button
                              onClick={() => handleSelectAccount(email)}
                              disabled={switchingAccount === email}
                              className="border-2 border-gray-300 text-gray-300 px-3 py-1 text-xs font-bold tracking-widest hover:border-white hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {switchingAccount === email
                                ? "SWITCHING..."
                                : "SWITCH TO"}
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveAccount(email)}
                            disabled={switchingAccount === email}
                            className="border-2 border-[#DD0000] text-[#DD0000] px-3 py-1 text-xs font-bold tracking-widest hover:bg-[#DD0000] hover:text-white transition-colors disabled:opacity-50"
                          >
                            REMOVE
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="border-2 border-gray-300 bg-black p-8 text-center">
                    <div className="text-gray-300 text-sm font-mono">
                      NO SAVED ACCOUNTS
                    </div>
                    <div className="text-xs text-gray-300 mt-2">
                      Only the current account is available
                    </div>
                  </div>
                )}
              </div>

              {/* Add Operator Button */}
              <button
                onClick={handleAddOperator}
                className="w-full mt-6 border-4 border-[#DD0000] bg-[#121212] text-[#DD0000] px-6 py-4 font-bold text-sm tracking-widest hover:bg-[#DD0000] hover:text-white transition-all"
              >
                + ADD OPERATOR
              </button>

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowAccountModal(false);
                  setSwitchError(null);
                }}
                className="w-full mt-3 border-2 border-gray-300 bg-transparent text-gray-300 px-6 py-3 font-bold text-xs tracking-widest hover:border-white hover:text-white transition-all"
              >
                CLOSE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
      <label className="block text-xs text-gray-300 mb-1 uppercase tracking-widest">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full bg-black border-4 border-gray-300 text-white font-mono px-4 py-3 text-sm focus:border-gray-300 focus:outline-none transition-colors"
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
      <div className="text-xs text-gray-300 uppercase tracking-widest mb-2">
        {label}
      </div>
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`w-full text-left border-4 px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
              selected === opt.value
                ? "border-[#DD0000] bg-[#DD0000] text-white"
                : "border-gray-300 hover:border-gray-300 text-white"
            }`}
          >
            {opt.label}
            {opt.desc && (
              <span className="text-gray-300 ml-2 font-normal">
                — {opt.desc}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
