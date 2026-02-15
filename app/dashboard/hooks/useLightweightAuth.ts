"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/**
 * Lightweight auth hook for pages that don't need full dashboard data.
 * Only checks auth and fetches minimal user profile + holdings.
 */

interface UserProfile {
  risk_tolerance: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  investment_horizon: string;
  focus_sectors: string[];
  geopolitical_sensitivity: string;
}

const DEFAULT_PROFILE: UserProfile = {
  risk_tolerance: "MODERATE",
  investment_horizon: "SWING",
  focus_sectors: ["CRYPTO"],
  geopolitical_sensitivity: "AWARE",
};

export function useLightweightAuth(router: AppRouterInstance) {
  const [authChecked, setAuthChecked] = useState(false);
  const [holdings, setHoldings] = useState<Record<string, number>>({});
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  const checkAuth = useCallback(async () => {
    try {
      const authRes = await fetch("/api/auth/me", { cache: "no-store" });
      
      if (!authRes.ok) {
        router.push("/");
        return false;
      }

      const { user } = await authRes.json();
      if (!user) {
        router.push("/");
        return false;
      }

      setAuthChecked(true);
      return true;
    } catch {
      router.push("/");
      return false;
    }
  }, [router]);

  const loadMinimalData = useCallback(async () => {
    try {
      const dataRes = await fetch("/api/user/data", { cache: "no-store" });
      
      if (dataRes.ok) {
        const { wallet } = await dataRes.json();
        const normalizedHoldings: Record<string, number> = {};
        
        const rawHoldings = wallet?.holdings ?? wallet?.assets ?? {};
        Object.entries(rawHoldings).forEach(([symbol, amount]) => {
          const key = String(symbol || "").toUpperCase();
          const value = Number(amount);
          if (key && Number.isFinite(value) && value > 0) {
            normalizedHoldings[key] = value;
          }
        });

        setHoldings(normalizedHoldings);
      }

      // Load profile from localStorage
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("geisha_risk_profile");
          if (stored) {
            const parsed = JSON.parse(stored) as UserProfile;
            setProfile(parsed);
          }
        } catch {
          // keep default
        }
      }
    } catch (error) {
      console.error("[useLightweightAuth] Data fetch error:", error);
      // Non-fatal - continue with defaults
    }
  }, []);

  useEffect(() => {
    (async () => {
      const isAuthenticated = await checkAuth();
      if (isAuthenticated) {
        // Load data in background without blocking
        loadMinimalData();
      }
    })();
  }, [checkAuth, loadMinimalData]);

  return {
    authChecked,
    holdings,
    profile,
  };
}
