"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWarRoom } from "@/contexts/WarRoomContext";

/**
 * TACTICAL FOOTER — Bottom Bar (V4)
 * 
 * World Time Clock: LOCALIZED inverted dropdown tray
 * (vertical column directly above clock button, not full horizontal bar)
 * News Ticker (marquee)
 * System Status: NIM_LATENCY | UPHOLD_API
 */

interface TacticalFooterProps {
  newsHeadlines?: string[];
}

const DEFAULT_HEADLINES = [
  "MARKET ALERT: BTC VOLATILITY INDEX ELEVATED",
  "NIM AI: ANALYZING 47 NEWS SOURCES",
  "UPHOLD API: LATENCY NOMINAL",
  "GEOPOLITICAL: MONITORING 12 ACTIVE REGIONS",
  "COFFEE DRIVEN DEVELOPMENT — BUGSBYTE 2026",
  "THREAT RADAR: ALL SYSTEMS OPERATIONAL",
  "PORTFOLIO: REAL-TIME SYNC ACTIVE",
];

interface WorldClock {
  label: string;
  tz: string;
}

const WORLD_CLOCKS: WorldClock[] = [
  { label: "LON", tz: "Europe/London" },
  { label: "NYC", tz: "America/New_York" },
  { label: "TOK", tz: "Asia/Tokyo" },
];

const PRIMARY_CLOCK: WorldClock = { label: "WAR ROOM (UTC)", tz: "UTC" };

function formatCityTime(tz: string): string {
  try {
    return new Date().toLocaleTimeString("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--:--";
  }
}

export default function TacticalFooter({ newsHeadlines = DEFAULT_HEADLINES }: TacticalFooterProps) {
  const { state } = useWarRoom();
  const [times, setTimes] = useState<Record<string, string>>({});
  const [clockOpen, setClockOpen] = useState(false);
  const clockButtonRef = useRef<HTMLButtonElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);

  // Update world clocks every second when open, every 60s when closed
  useEffect(() => {
    const updateClocks = () => {
      const next: Record<string, string> = {};
      [...WORLD_CLOCKS, PRIMARY_CLOCK].forEach((clock) => {
        next[clock.label] = formatCityTime(clock.tz);
      });
      setTimes(next);
    };
    updateClocks();
    const interval = setInterval(updateClocks, clockOpen ? 1_000 : 60_000);
    return () => clearInterval(interval);
  }, [clockOpen]);

  // Close tray on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        trayRef.current && 
        !trayRef.current.contains(e.target as Node) &&
        clockButtonRef.current &&
        !clockButtonRef.current.contains(e.target as Node)
      ) {
        setClockOpen(false);
      }
    };
    if (clockOpen) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [clockOpen]);

  const getStatusColor = (status: typeof state.upholdApiStatus) => {
    switch (status) {
      case "ACTIVE": return "text-green-400";
      case "DEGRADED": return "text-[#D4AF37]";
      case "OFFLINE": return "text-[#FF0000]";
    }
  };

  // Double the headlines for seamless loop
  const tickerContent = [...newsHeadlines, ...newsHeadlines];

  return (
    <footer className="border-t-4 border-white bg-black fixed bottom-0 left-0 right-0 z-40">
      <div className="flex items-center h-10 relative">
        {/* World Clock Toggle - Left (with LOCALIZED dropdown above) */}
        <div className="relative">
          {/* LOCALIZED Dropdown Tray — Vertical column directly above clock button */}
          <AnimatePresence>
            {clockOpen && (
              <motion.div
                ref={trayRef}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 mb-0 border-4 border-white border-b-0 bg-black z-50 min-w-[180px]"
              >
                <div className="px-3 py-2 border-b-2 border-gray-800">
                  <span className="text-[7px] font-black font-mono text-gray-500 uppercase tracking-widest">
                    GLOBAL TIME SYNC
                  </span>
                </div>
                {WORLD_CLOCKS.map((clock) => (
                  <div
                    key={clock.label}
                    className="flex items-center justify-between px-3 py-2 border-b border-gray-900"
                  >
                    <span className="text-[9px] font-black font-mono text-gray-400 uppercase tracking-widest">
                      {clock.label}
                    </span>
                    <span className="text-sm font-black font-mono text-white tracking-wider">
                      {times[clock.label] || "--:--:--"}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            ref={clockButtonRef}
            onClick={() => setClockOpen((v) => !v)}
            className={`border-r-4 border-white h-10 flex items-center px-4 bg-black shrink-0 hover:bg-gray-900 transition-colors ${
              clockOpen ? "bg-gray-900" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: clockOpen ? 180 : 0 }}
                transition={{ duration: 0.15 }}
                className="text-[10px] text-gray-500"
              >
                ▲
              </motion.span>
              <span className="text-[8px] font-mono font-black text-gray-500 uppercase">
                {PRIMARY_CLOCK.label}:
              </span>
              <span className="text-[10px] font-black font-mono text-white tracking-wider">
                {times[PRIMARY_CLOCK.label] || "--:--:--"}
              </span>
            </div>
          </button>
        </div>

        {/* News Ticker - Center (Marquee) */}
        <div className="flex-1 h-full overflow-hidden relative">
          <motion.div
            className="flex items-center h-full whitespace-nowrap absolute"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {tickerContent.map((headline, index) => (
              <span
                key={`${headline}-${index}`}
                className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-widest px-8"
              >
                <span className="text-[#FF0000] mr-2">▶</span>
                {headline}
              </span>
            ))}
          </motion.div>
        </div>

        {/* System Status - Right */}
        <div className="border-l-4 border-white h-full flex items-center px-4 bg-black shrink-0">
          <div className="flex items-center gap-4">
            {/* NIM Latency */}
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-mono text-gray-600 uppercase">NIM_LATENCY:</span>
              <span className={`text-[10px] font-black font-mono ${
                state.nimLatency < 50 ? "text-green-400" :
                state.nimLatency < 200 ? "text-[#D4AF37]" :
                "text-[#FF0000]"
              }`}>
                {state.nimLatency}ms
              </span>
            </div>

            {/* Separator */}
            <span className="text-gray-700">|</span>

            {/* Uphold API Status */}
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-mono text-gray-600 uppercase">UPHOLD_API:</span>
              <span className={`text-[10px] font-black font-mono ${getStatusColor(state.upholdApiStatus)}`}>
                {state.upholdApiStatus}
              </span>
            </div>

            {/* Live Indicator */}
            <motion.div
              className="w-2 h-2 bg-green-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
