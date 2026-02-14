"use client";

import WorldClock from "./WorldClock";

/**
 * WAR ROOM FOOTER — V5 Tactical Intelligence
 * 
 * Bottom bar with localized world clock.
 * Brutalist design with 4px borders.
 */

interface WarRoomFooterProps {
  connectionStatus?: "connected" | "reconnecting" | "disconnected";
  lastUpdate?: Date;
}

export default function WarRoomFooter({
  connectionStatus = "connected",
  lastUpdate = new Date(),
}: WarRoomFooterProps) {
  const statusColor = {
    connected: "bg-emerald-500",
    reconnecting: "bg-amber-500 animate-pulse",
    disconnected: "bg-[#FF0000]",
  }[connectionStatus];

  const statusText = {
    connected: "LIVE",
    reconnecting: "SYNC...",
    disconnected: "OFFLINE",
  }[connectionStatus];

  return (
    <footer className="h-10 border-t-4 border-white bg-black flex items-center justify-between px-4 font-mono">
      {/* Left Side - Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 ${statusColor}`} />
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">
            {statusText}
          </span>
        </div>
        
        <span className="text-[8px] text-zinc-700">|</span>
        
        <span className="text-[8px] text-zinc-600" suppressHydrationWarning>
          LAST UPDATE: {lastUpdate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>

      {/* Center - Branding */}
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <span className="text-[7px] font-black text-zinc-700 uppercase tracking-[0.3em]">
          GEISHA GAINS • WAR ROOM V5
        </span>
      </div>

      {/* Right Side - World Clock */}
      <WorldClock position="right" />
    </footer>
  );
}
