/**
 * Geisha Gains - UberCharge Context
 * Coffee Driven Development - BugsByte 2026
 * 
 * Manages the "Caffeine Overdrive" state
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface UberChargeContextType {
  charge: number; // 0-100
  isOverdrive: boolean;
  overdriveTimeRemaining: number; // seconds
  addCharge: (amount: number) => void;
  activateOverdrive: () => void;
  deactivateOverdrive: () => void;
}

const UberChargeContext = createContext<UberChargeContextType | undefined>(undefined);

export function UberChargeProvider({ children }: { children: React.ReactNode }) {
  const [charge, setCharge] = useState(0);
  const [isOverdrive, setIsOverdrive] = useState(false);
  const [overdriveTimeRemaining, setOverdriveTimeRemaining] = useState(0);

  // Passive charge gain over time (1% every 5 seconds)
  useEffect(() => {
    if (isOverdrive) return; // Don't gain charge during overdrive

    const interval = setInterval(() => {
      setCharge((prev) => Math.min(100, prev + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [isOverdrive]);

  // Overdrive countdown
  useEffect(() => {
    if (!isOverdrive || overdriveTimeRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setOverdriveTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsOverdrive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOverdrive, overdriveTimeRemaining]);

  // Add charge (from successful trades)
  const addCharge = useCallback((amount: number) => {
    if (isOverdrive) return; // Can't charge during overdrive
    setCharge((prev) => Math.min(100, prev + amount));
  }, [isOverdrive]);

  // Activate Caffeine Overdrive
  const activateOverdrive = useCallback(() => {
    if (charge < 100) {
      console.warn('Cannot activate overdrive - charge not at 100%');
      return;
    }

    setIsOverdrive(true);
    setOverdriveTimeRemaining(300); // 5 minutes (300 seconds)
    setCharge(0); // Reset charge

    // Play audio cue (if available)
    try {
      const audio = new Audio('/sounds/overdrive-activate.mp3');
      audio.play().catch(() => {
        // Silent fail if audio not available
      });
    } catch (error) {
      // Silent fail
    }
  }, [charge]);

  // Deactivate Caffeine Overdrive (manual or automatic)
  const deactivateOverdrive = useCallback(() => {
    setIsOverdrive(false);
    setOverdriveTimeRemaining(0);
  }, []);

  const value: UberChargeContextType = {
    charge,
    isOverdrive,
    overdriveTimeRemaining,
    addCharge,
    activateOverdrive,
    deactivateOverdrive,
  };

  return (
    <UberChargeContext.Provider value={value}>
      {children}
    </UberChargeContext.Provider>
  );
}

/**
 * Hook to use UberCharge context
 */
export function useUberCharge() {
  const context = useContext(UberChargeContext);
  if (context === undefined) {
    throw new Error('useUberCharge must be used within UberChargeProvider');
  }
  return context;
}
