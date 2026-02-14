"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * WORLD CLOCK — V5 Footer Component
 * 
 * Localized clock triggers an inverted drop-up tray.
 * Shows times for: LON, NYC, TOK, WAR ROOM (UTC)
 * Constrained to expand only in the clock area.
 */

interface WorldClockProps {
  position?: "left" | "right";
}

interface TimeZone {
  code: string;
  label: string;
  offset: number; // Hours from UTC
  color: string;
}

const TIME_ZONES: TimeZone[] = [
  { code: "WAR", label: "WAR ROOM", offset: 0, color: "#FF0000" },
  { code: "LON", label: "LONDON", offset: 0, color: "#FFFFFF" },
  { code: "NYC", label: "NEW YORK", offset: -5, color: "#4A90E2" },
  { code: "TOK", label: "TOKYO", offset: 9, color: "#FF6B6B" },
];

// Determine if DST is in effect (simplified)
function isDST(date: Date): boolean {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  return Math.max(jan, jul) !== date.getTimezoneOffset();
}

// Get time for a specific timezone
function getTimeForZone(utcTime: Date, offset: number, applyDST = true): Date {
  const time = new Date(utcTime);
  // Apply DST adjustment for relevant zones
  const dstAdjust = applyDST && isDST(time) ? 1 : 0;
  time.setHours(time.getUTCHours() + offset + dstAdjust);
  return time;
}

export default function WorldClock({ position = "right" }: WorldClockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const clockRef = useRef<HTMLDivElement>(null);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clockRef.current && !clockRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // War Room time (UTC)
  const warRoomTime = getTimeForZone(currentTime, 0, false);

  return (
    <div
      ref={clockRef}
      className={`relative inline-block ${position === "left" ? "mr-auto" : "ml-auto"}`}
    >
      {/* Clock Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-black border-2 border-zinc-700 hover:border-white transition-colors group"
      >
        {/* Pulsing indicator */}
        <span className={`w-2 h-2 ${isOpen ? "bg-[#FF0000]" : "bg-emerald-500"} animate-pulse`} />
        
        {/* Time Display */}
        <span className="text-xs font-mono font-black text-white tracking-wider">
          {formatTime(warRoomTime)}
        </span>
        
        {/* Label */}
        <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest">
          UTC
        </span>

        {/* Chevron */}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-zinc-500 text-[10px]"
        >
          ▲
        </motion.span>
      </button>

      {/* Drop-Up Tray (Constrained to clock width) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 right-0 z-50"
            style={{ minWidth: "200px" }}
          >
            <div className="bg-black border-4 border-white shadow-[4px_-4px_0_0_#000] font-mono">
              {/* Header */}
              <div className="border-b-4 border-white px-3 py-2 bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-white uppercase tracking-widest">
                    WORLD CLOCK
                  </span>
                  <span className="text-[7px] text-zinc-500">
                    {formatDate(warRoomTime)}
                  </span>
                </div>
              </div>

              {/* Time Zones */}
              <div className="divide-y divide-zinc-800">
                {TIME_ZONES.map((tz) => {
                  const zoneTime = getTimeForZone(
                    currentTime,
                    tz.offset,
                    tz.code !== "WAR" // Don't apply DST to UTC
                  );
                  const isWarRoom = tz.code === "WAR";

                  return (
                    <div
                      key={tz.code}
                      className={`px-3 py-2 flex items-center justify-between ${
                        isWarRoom ? "bg-[#FF0000]/10" : "bg-black"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2"
                          style={{ backgroundColor: tz.color }}
                        />
                        <div>
                          <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: tz.color }}>
                            {tz.code}
                          </span>
                          <span className="text-[7px] text-zinc-600 block">
                            {tz.label}
                          </span>
                        </div>
                      </div>
                      <span className={`text-sm font-mono font-black ${
                        isWarRoom ? "text-[#FF0000]" : "text-white"
                      }`}>
                        {formatTime(zoneTime)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="border-t-4 border-white px-3 py-1.5 bg-zinc-900">
                <span className="text-[6px] text-zinc-600 uppercase tracking-widest">
                  DST ADJUSTED • LIVE SYNC
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
