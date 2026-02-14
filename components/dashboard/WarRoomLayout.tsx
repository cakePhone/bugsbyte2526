"use client";

import { type ReactNode } from "react";
import { WarRoomProvider } from "@/contexts/WarRoomContext";
import CommandHeader from "./CommandHeader";
import WarRoomFooter from "./WarRoomFooter";

/**
 * WAR ROOM LAYOUT — Main Dashboard Structure (V5)
 *
 * Provides the WarRoom context and renders the header/footer.
 * Children should include the sidebar, main content, etc.
 */

interface WarRoomLayoutProps {
  children: ReactNode;
  scanCount?: number;
  isScanning?: boolean;
  newsHeadlines?: string[];
  availableAssets?: string[];
}

export default function WarRoomLayout({
  children,
  scanCount = 0,
  isScanning = false,
  availableAssets = [],
}: WarRoomLayoutProps) {
  return (
    <WarRoomProvider>
      <div className="min-h-screen bg-[#121212] text-white font-mono flex flex-col">
        {/* Command Header */}
        <CommandHeader
          scanCount={scanCount}
          isScanning={isScanning}
          availableAssets={availableAssets}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex">{children}</main>

        {/* War Room Footer with World Clock */}
        <WarRoomFooter
          connectionStatus={isScanning ? "reconnecting" : "connected"}
        />
      </div>
    </WarRoomProvider>
  );
}
