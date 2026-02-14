/**
 * THE WAR ROOM — Main Trading Dashboard Wrapper
 */

"use client";

import { useState, useEffect } from "react";
import FixedWarRoom from "./fixed";
import DraggableWarRoom from "./draggable";

export default function WarRoom() {
  const [useDraggableLayout, setUseDraggableLayout] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check localStorage for user preference
    const saved = localStorage.getItem("dashboard-draggable");
    if (saved === "true") {
      setUseDraggableLayout(true);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-gray-500 font-mono text-sm">LOADING DASHBOARD...</div>
      </div>
    );
  }

  // Render appropriate component based on preference
  return useDraggableLayout ? <DraggableWarRoom /> : <FixedWarRoom />;
}