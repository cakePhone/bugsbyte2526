"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

/**
 * HOLDINGS DONUT — Ratio Visualization
 *
 * Brutalist hollow donut chart showing portfolio allocation.
 * Strict high-contrast palette. JetBrains Mono labels.
 * No gradients, no curves, no easing — raw industrial step-in.
 */

// ─── Color Map ───────────────────────────────────────────────────────

const ASSET_COLORS: Record<string, string> = {
  BTC: "#F7931A",   // Bitcoin orange
  ETH: "#627EEA",   // Ethereum blue
  SOL: "#9945FF",   // Solana purple
  XRP: "#00AAE4",   // Ripple cyan
  ADA: "#0033AD",   // Cardano blue
  DOGE: "#C3A634",  // Doge gold
  DOT: "#E6007A",   // Polkadot pink
  AVAX: "#E84142",  // Avalanche red
  LINK: "#2A5ADA",  // Chainlink blue
  LTC: "#BFBBBB",   // Litecoin silver
  MATIC: "#8247E5", // Polygon purple
  USDT: "#26A17B",  // Tether green
  USDC: "#2775CA",  // USDC blue
};

// Fallback palette for assets not in the map
const FALLBACK_COLORS = ["#FF4444", "#44FF44", "#FFAA00", "#FF00FF", "#00FFFF", "#FFFF00"];

function getSliceColor(name: string, index?: number): string {
  return ASSET_COLORS[name] ?? FALLBACK_COLORS[(index ?? 0) % FALLBACK_COLORS.length];
}

// ─── Types ───────────────────────────────────────────────────────────

interface HoldingsDonutProps {
  /** map of symbol → USD value (e.g. { BTC: 5400, ETH: 2100 }) */
  holdingValues: Record<string, number>;
}

interface SliceDatum {
  name: string;
  value: number;
  pct: string;
}

// ─── Component ───────────────────────────────────────────────────────

export default function HoldingsDonut({ holdingValues }: HoldingsDonutProps) {
  const { data, total } = useMemo(() => {
    const entries = Object.entries(holdingValues)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    const sum = entries.reduce((s, [, v]) => s + v, 0);

    const slices: SliceDatum[] = entries.map(([name, value]) => ({
      name,
      value,
      pct: sum > 0 ? ((value / sum) * 100).toFixed(1) : "0",
    }));

    return { data: slices, total: sum };
  }, [holdingValues]);

  if (data.length === 0) {
    return (
      <div className="border-4 border-white bg-black p-4 text-center">
        <span className="text-[10px] text-gray-600 font-mono font-black uppercase tracking-widest">
          NO HOLDINGS DATA
        </span>
      </div>
    );
  }

  return (
    <div className="border-4 border-white bg-black py-2 px-1">
      {/* Header */}
      <div className="px-3 pb-1">
        <span className="text-[9px] font-black text-gray-500 font-mono uppercase tracking-[0.2em]">
          HOLDINGS RATIO
        </span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={65}
            paddingAngle={5}
            stroke="#000000"
            strokeWidth={2}
            isAnimationActive={true}
            animationDuration={300}
            animationEasing="ease"
            label={false}
            labelLine={false}
          >
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={getSliceColor(entry.name, idx)} />
            ))}
          </Pie>

          {/* Center label — rendered as custom SVG text */}
          <text
            x="50%"
            y="44%"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#666"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 8,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            TOTAL_VALUE
          </text>
          <text
            x="50%"
            y="57%"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#FFFFFF"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            ${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </text>
        </PieChart>
      </ResponsiveContainer>

      {/* Legend — HTML, never clips */}
      <div className="px-3 pt-1 pb-2 flex flex-wrap gap-x-4 gap-y-1 justify-center">
        {data.map((entry, idx) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 border border-white/20 shrink-0"
              style={{ backgroundColor: getSliceColor(entry.name, idx) }}
            />
            <span className="text-[9px] font-mono font-black text-white uppercase tracking-wider">
              {entry.name}
            </span>
            <span className="text-[9px] font-mono text-gray-500">
              {entry.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
