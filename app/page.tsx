/**
 * Home Page — The Interrogation (Onboarding)
 * Geisha Gains • Coffee Driven Development
 *
 * Profiles the user's trading psychology before entering the War Room.
 * Stores RiskProfile in localStorage, then redirects to /dashboard.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import TheInterrogation from '@/components/onboarding/TheInterrogation';
import type { RiskProfile } from '@/components/onboarding/TheInterrogation';

export default function Home() {
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  // Check if user already has a profile
  useEffect(() => {
    try {
      const stored = localStorage.getItem('geisha_risk_profile');
      if (stored) {
        setHasProfile(true);
        // Use setTimeout to prevent hydration issues
        setTimeout(() => router.push('/dashboard'), 100);
      } else {
        setHasProfile(false);
      }
    } catch {
      setHasProfile(false);
    }
  }, []); // Empty deps - run only once on mount

  const handleComplete = useCallback(
    (profile: RiskProfile) => {
      // Store in localStorage
      localStorage.setItem('geisha_risk_profile', JSON.stringify(profile));

      // Navigate to War Room
      setTimeout(() => router.push('/dashboard'), 100);
    },
    [router]
  );

  // Loading state
  if (hasProfile === null) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-gray-600 font-mono text-sm animate-pulse">
          INITIALIZING SYSTEM...
        </div>
      </div>
    );
  }

  // Already has profile — redirecting
  if (hasProfile) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-gray-600 font-mono text-sm">
          PROFILE DETECTED. ENTERING WAR ROOM...
        </div>
      </div>
    );
  }

  // Show The Interrogation
  return <TheInterrogation onComplete={handleComplete} />;
}
