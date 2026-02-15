/**
 * Home Page — Brutalist Landing + Onboarding + Auth
 * Geisha Gains • Coffee Driven Development
 *
 * 16:9 full-screen landing page with brutalist aesthetic.
 * Profiles the user's trading psychology before entering the War Room.
 */

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TheInterrogation from "@/components/onboarding/TheInterrogation";
import HomePage from "@/components/home/HomePage";
import type { RiskProfile } from "@/components/onboarding/TheInterrogation";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const { user } = await res.json();
          if (user) {
            router.push("/dashboard");
            return;
          }
        }
      } catch {
        // not logged in
      }
      setChecking(false);
    })();
  }, [router]);

  // Handle onboarding completion → register
  const handleComplete = useCallback(
    async (profile: RiskProfile, auth: { email: string; password: string }) => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: auth.email,
            password: auth.password,
            riskProfile: profile,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "Registration failed.");
          return;
        }

        // Store profile locally too for quick access
        localStorage.setItem("geisha_risk_profile", JSON.stringify(profile));

        // Redirect to War Room
        router.push("/dashboard");
      } catch {
        alert("Network error. Try again.");
      }
    },
    [router],
  );

  // Handle login
  const handleLogin = useCallback(async () => {
    setLoginError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || "Login failed.");
        setSubmitting(false);
        return;
      }

      // Store risk profile locally if available
      if (data.user?.riskProfile) {
        localStorage.setItem(
          "geisha_risk_profile",
          JSON.stringify(data.user.riskProfile),
        );
      }

      // Redirect to War Room
      router.push("/dashboard");
    } catch {
      setLoginError("Network error.");
      setSubmitting(false);
    }
  }, [loginEmail, loginPassword, router]);

  // Handle navigation from landing page
  const handleAccountClick = useCallback(() => {
    setShowLanding(false);
    setShowOnboarding(true);
  }, []);

  const handleDashboardClick = useCallback(() => {
    setShowLanding(false);
    setShowLogin(true);
  }, []);

  const handleBulletinClick = useCallback(() => {
    // Future: Navigate to bulletin/news page
    alert("BULLETIN: Coming soon...");
  }, []);

  // Loading state
  if (checking) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-gray-600 font-mono text-sm animate-pulse">
          INITIALIZING SYSTEM...
        </div>
      </div>
    );
  }

  // Show Landing Page first
  if (showLanding && !showOnboarding && !showLogin) {
    return (
      <HomePage
        onAccountClick={handleAccountClick}
        onDashboardClick={handleDashboardClick}
        onBulletinClick={handleBulletinClick}
      />
    );
  }

  return (
    <>
      {showOnboarding && (
        <TheInterrogation
          onComplete={handleComplete}
          onLoginClick={() => {
            setShowOnboarding(false);
            setShowLogin(true);
          }}
        />
      )}

      {/* ── LOGIN MODAL ── */}
      <AnimatePresence>
        {showLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#121212] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md border-4 border-white bg-black text-white font-mono"
            >
              {/* Modal Header */}
              <div className="border-b-4 border-white px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-bold tracking-widest">
                  OPERATOR LOGIN
                </span>
                <button
                  onClick={() => {
                    setShowLogin(false);
                    setShowLanding(true);
                  }}
                  className="text-gray-500 hover:text-[#FF0000] text-lg font-bold transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="text-[#FF0000] text-sm mb-4">
                  {"> AUTHENTICATE TO ACCESS WAR ROOM."}
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="operator@geisha.gains"
                    className="w-full bg-black border-4 border-gray-600 text-white font-mono px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors placeholder:text-gray-700"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black border-4 border-gray-600 text-white font-mono px-4 py-3 text-sm focus:border-white focus:outline-none transition-colors placeholder:text-gray-700"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>

                {loginError && (
                  <div className="text-[#FF0000] text-xs font-bold">
                    {"> ERROR: "}
                    {loginError}
                  </div>
                )}

                <button
                  onClick={handleLogin}
                  disabled={submitting}
                  className="w-full border-4 border-white bg-black text-white px-6 py-3 text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "AUTHENTICATING..." : "> SIGN IN"}
                </button>

                <div className="text-center pt-2">
                  <button
                    onClick={() => {
                      setShowLogin(false);
                      setShowOnboarding(true);
                    }}
                    className="text-gray-500 hover:text-[#FF0000] text-xs tracking-widest transition-colors"
                  >
                    NEW OPERATOR? [ CREATE ACCOUNT ]
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
