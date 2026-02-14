/**
 * THE INTERROGATION — User Profiling Protocol
 * Geisha Gains • Coffee Driven Development
 *
 * A minimalist, terminal-style onboarding flow that captures
 * the user's trading psychology before entering the War Room.
 * Final step: account creation (email + password).
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Risk Profile Types ────────────────────────────────────
export interface RiskProfile {
  risk_tolerance: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  investment_horizon: "SCALP" | "SWING" | "POSITION";
  focus_sectors: string[];
  geopolitical_sensitivity: "IGNORE" | "AWARE" | "PARANOID";
}

interface InterrogationProps {
  onComplete: (
    profile: RiskProfile,
    auth: { email: string; password: string },
  ) => void;
  onLoginClick: () => void;
}

// ── Typewriter Hook ───────────────────────────────────────
function useTypewriter(text: string, speed = 40) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(iv);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);

  return { displayed, done };
}

// ── Question Data ─────────────────────────────────────────
const QUESTIONS = [
  {
    id: "risk_tolerance",
    prompt: "DEFINE YOUR RISK THRESHOLD.",
    options: [
      {
        value: "CONSERVATIVE",
        label: "CONSERVATIVE",
        desc: "Preserve Capital",
      },
      { value: "MODERATE", label: "MODERATE", desc: "Balanced Growth" },
      { value: "AGGRESSIVE", label: "AGGRESSIVE", desc: "Maximum Alpha" },
    ],
    multi: false,
  },
  {
    id: "investment_horizon",
    prompt: "DEFINE YOUR TIMELINE.",
    options: [
      { value: "SCALP", label: "SCALP", desc: "Intraday" },
      { value: "SWING", label: "SWING", desc: "Multi-day" },
      { value: "POSITION", label: "POSITION", desc: "Long-term" },
    ],
    multi: false,
  },
  {
    id: "focus_sectors",
    prompt: "SELECT BATTLEGROUNDS.",
    options: [
      { value: "CRYPTO", label: "₿ CRYPTO", desc: "" },
      { value: "STOCKS", label: "📈 STOCKS", desc: "" },
      { value: "FOREX", label: "💱 FOREX", desc: "" },
      { value: "COMMODITIES", label: "🛢️ COMMODITIES", desc: "" },
    ],
    multi: true,
  },
  {
    id: "geopolitical_sensitivity",
    prompt: "MACRO SENSITIVITY LEVEL.",
    options: [
      { value: "IGNORE", label: "PRICE ACTION ONLY", desc: "Ignore News" },
      { value: "AWARE", label: "MACRO AWARE", desc: "Major Events" },
      { value: "PARANOID", label: "PARANOID", desc: "Track Everything" },
    ],
    multi: false,
  },
] as const;

// ── Main Component ────────────────────────────────────────
export default function TheInterrogation({
  onComplete,
  onLoginClick,
}: InterrogationProps) {
  const [step, setStep] = useState(-1); // -1 = intro, 0..3 = questions, 4 = sign-up
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [multiSelection, setMultiSelection] = useState<string[]>([]);

  // Sign-up state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupError, setSignupError] = useState("");

  const isIntro = step === -1;
  const isSignup = step === QUESTIONS.length;
  const isDone = step > QUESTIONS.length;
  const currentQ = !isIntro && !isSignup && !isDone ? QUESTIONS[step] : null;

  const introText =
    "> INITIATING PROFILING PROTOCOL...\n> SYSTEM REQUIRES YOUR TRADING PARAMETERS.\n> ANSWER TRUTHFULLY. THE MARKET DOES NOT FORGIVE.";
  const { displayed: introDisplayed, done: introDone } = useTypewriter(
    isIntro ? introText : "",
    25,
  );

  const questionText = currentQ?.prompt ?? "";
  const { displayed: qDisplayed, done: qDone } = useTypewriter(
    currentQ ? `> ${questionText}` : "",
    30,
  );

  // Start interrogation
  const begin = useCallback(() => setStep(0), []);

  // Handle single-select
  const selectOption = useCallback(
    (value: string) => {
      if (!currentQ) return;
      if (currentQ.multi) {
        setMultiSelection((prev) =>
          prev.includes(value)
            ? prev.filter((v) => v !== value)
            : [...prev, value],
        );
      } else {
        setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
        setStep((s) => s + 1);
      }
    },
    [currentQ],
  );

  // Confirm multi-select
  const confirmMulti = useCallback(() => {
    if (!currentQ || multiSelection.length === 0) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: multiSelection }));
    setMultiSelection([]);
    setStep((s) => s + 1);
  }, [currentQ, multiSelection]);

  // Submit sign-up
  const submitSignup = useCallback(() => {
    setSignupError("");
    if (!email.trim()) {
      setSignupError("EMAIL REQUIRED.");
      return;
    }
    if (password.length < 6) {
      setSignupError("PASSWORD MUST BE >= 6 CHARACTERS.");
      return;
    }
    if (password !== confirmPassword) {
      setSignupError("PASSWORDS DO NOT MATCH.");
      return;
    }

    const profile: RiskProfile = {
      risk_tolerance: answers.risk_tolerance as RiskProfile["risk_tolerance"],
      investment_horizon:
        answers.investment_horizon as RiskProfile["investment_horizon"],
      focus_sectors: answers.focus_sectors as string[],
      geopolitical_sensitivity:
        answers.geopolitical_sensitivity as RiskProfile["geopolitical_sensitivity"],
    };

    setStep((s) => s + 1); // move to "done" spinner
    onComplete(profile, { email, password });
  }, [email, password, confirmPassword, answers, onComplete]);

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-2xl border-4 border-white bg-black text-white font-mono"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Terminal Header */}
        <div className="border-b-4 border-white px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-bold tracking-widest">
            GEISHA GAINS // THE INTERROGATION
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onLoginClick}
              className="text-xs font-bold tracking-widest text-gray-400 hover:text-white transition-colors uppercase"
            >
              LOG IN
            </button>
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-[#FF0000]" />
              <div className="w-3 h-3 bg-white" />
              <div className="w-3 h-3 border-2 border-white" />
            </div>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-6 min-h-[400px] flex flex-col">
          <AnimatePresence mode="wait">
            {/* ── INTRO ── */}
            {isIntro && (
              <motion.div
                key="intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col justify-between"
              >
                <pre className="text-sm leading-relaxed whitespace-pre-wrap text-[#FF0000]">
                  {introDisplayed}
                  <span className="animate-pulse">█</span>
                </pre>
                {introDone && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={begin}
                    className="mt-8 self-start border-4 border-white bg-black text-white px-6 py-3 text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
                  >
                    {">"} BEGIN INTERROGATION
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* ── QUESTION ── */}
            {currentQ && (
              <motion.div
                key={`q-${step}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col"
              >
                {/* Progress */}
                <div className="flex items-center gap-2 mb-6">
                  {QUESTIONS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 ${
                        i < step
                          ? "bg-[#FF0000]"
                          : i === step
                            ? "bg-white"
                            : "bg-gray-700"
                      }`}
                    />
                  ))}
                </div>

                {/* Question Text */}
                <div className="text-lg font-bold mb-6 min-h-[2rem]">
                  <span className="text-[#FF0000]">
                    [{String(step + 1).padStart(2, "0")}]
                  </span>{" "}
                  <span>{qDisplayed}</span>
                  {!qDone && <span className="animate-pulse">█</span>}
                </div>

                {/* Options */}
                {qDone && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    {currentQ.options.map((opt, i) => {
                      const isSelected = currentQ.multi
                        ? multiSelection.includes(opt.value)
                        : false;

                      return (
                        <motion.button
                          key={opt.value}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          onClick={() => selectOption(opt.value)}
                          className={`w-full text-left border-4 px-4 py-3 text-sm font-bold uppercase tracking-wide transition-all ${
                            isSelected
                              ? "border-[#FF0000] bg-[#FF0000] text-white"
                              : "border-gray-600 hover:border-white bg-black text-white"
                          }`}
                        >
                          <span className="text-gray-500 mr-3">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {opt.label}
                          {opt.desc && (
                            <span className="text-gray-400 ml-2 text-xs font-normal">
                              — {opt.desc}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}

                    {/* Confirm for multi-select */}
                    {currentQ.multi && multiSelection.length > 0 && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={confirmMulti}
                        className="mt-4 border-4 border-[#FF0000] bg-[#FF0000] text-white px-6 py-3 text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-colors"
                      >
                        CONFIRM SELECTION ({multiSelection.length})
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── SIGN UP ── */}
            {isSignup && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col"
              >
                {/* Progress — all question bars filled */}
                <div className="flex items-center gap-2 mb-6">
                  {QUESTIONS.map((_, i) => (
                    <div key={i} className="h-1 flex-1 bg-[#FF0000]" />
                  ))}
                  <div className="h-1 flex-1 bg-white" />
                </div>

                <div className="text-lg font-bold mb-6">
                  <span className="text-[#FF0000]">[05]</span>{" "}
                  {"> CREATE YOUR IDENTITY."}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operator@geisha.gains"
                      className="w-full bg-black border-4 border-gray-600 text-white font-mono px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors placeholder:text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black border-4 border-gray-600 text-white font-mono px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors placeholder:text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black border-4 border-gray-600 text-white font-mono px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors placeholder:text-gray-700"
                    />
                  </div>

                  {signupError && (
                    <div className="text-[#FF0000] text-xs font-bold">
                      {"> ERROR: "}
                      {signupError}
                    </div>
                  )}

                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={submitSignup}
                    className="mt-2 w-full border-4 border-[#FF0000] bg-[#FF0000] text-white px-6 py-3 text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-colors"
                  >
                    {">"} DEPLOY OPERATOR
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── DONE ── */}
            {isDone && (
              <motion.div
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center"
              >
                <div className="text-[#FF0000] text-4xl font-bold mb-4">
                  ■■■
                </div>
                <pre className="text-sm text-[#FF0000] mb-4">
                  {"> PROFILING COMPLETE."}
                  {"\n"}
                  {"> INITIALIZING WAR ROOM..."}
                </pre>
                <motion.div
                  className="w-8 h-8 border-4 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.6,
                    ease: "linear",
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Terminal Footer */}
        <div className="border-t-4 border-white px-4 py-2 flex items-center justify-between text-xs text-gray-500">
          <span>COFFEE DRIVEN DEVELOPMENT</span>
          <span>
            STEP {Math.max(0, step + 1)}/{QUESTIONS.length + 1}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
