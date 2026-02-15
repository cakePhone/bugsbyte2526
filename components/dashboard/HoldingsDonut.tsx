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
  BTC: "#FFFFFF",
  ETH: "#666666",
  SOL: "#FF0000",
};
const OTHER_COLOR = "#00FF00";

function getSliceColor(name: string): string {
  return ASSET_COLORS[name] ?? OTHER_COLOR;
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

// ─── Custom label with polylines ─────────────────────────────────────

const RADIAN = Math.PI / 180;

/* eslint-disable @typescript-eslint/no-explicit-any */
function renderLabel(props: any) {
  const {
    cx,
    cy,
    midAngle,
    outerRadius,
    name,
    pct,
  } = props;

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);

  // Point on the outer edge
  const sx = cx + outerRadius * cos;
  const sy = cy + outerRadius * sin;

  // Extension point
  const mx = cx + (outerRadius + 14) * cos;
  const my = cy + (outerRadius + 14) * sin;

  // End of horizontal leg
  const ex = mx + (cos >= 0 ? 1 : -1) * 16;
  const ey = my;

  const anchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      {/* Polyline from slice → label */}
      <polyline
        points={`${sx},${sy} ${mx},${my} ${ex},${ey}`}
        fill="none"
        stroke="#555"
        strokeWidth={1}
      />
      {/* Symbol */}
      <text
        x={ex + (cos >= 0 ? 4 : -4)}
        y={ey - 4}
        textAnchor={anchor}
        fill="#FFFFFF"
        style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: 900 }}
      >
        {name}
      </text>
      {/* Percentage */}
      <text
        x={ex + (cos >= 0 ? 4 : -4)}
        y={ey + 8}
        textAnchor={anchor}
        fill="#888"
        style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8 }}
      >
        {pct}%
      </text>
    </g>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={5}
            stroke="#000000"
            strokeWidth={2}
            isAnimationActive={true}
            animationDuration={300}
            animationEasing="ease"
            label={renderLabel}
            labelLine={false}
          >
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={getSliceColor(entry.name)} />
            ))}
          </Pie>

          {/* Center label — rendered as custom SVG text */}
          <text
            x="50%"
            y="47%"
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
    </div>
  );
}
