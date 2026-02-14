/**
 * THREAT RADAR — 4-Axis Visualization
 * Geisha Gains • Coffee Driven Development
 *
 * SVG Radar Chart: [Volatility, Geopolitics, Sentiment, Exposure]
 * Pulses red when PARANOID user receives high-threat news.
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import type { NewsAnalysis } from "@/app/api/news/analyze/route";

interface ThreatRadarProps {
  analyses: NewsAnalysis[];
  sensitivity: string; // 'IGNORE' | 'AWARE' | 'PARANOID'
  holdings: Record<string, number>;
}

interface RadarAxes {
  volatility: number; // 0-10
  geopolitics: number; // 0-10
  sentiment: number; // 0-10
  exposure: number; // 0-10
}

export default function ThreatRadar({
  analyses,
  sensitivity,
  holdings,
}: ThreatRadarProps) {
  const [pulse, setPulse] = useState(false);

  // ── Calculate axes from analyses ────────────────────────
  const axes = useMemo((): RadarAxes => {
    if (analyses.length === 0)
      return { volatility: 1, geopolitics: 1, sentiment: 1, exposure: 1 };

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    // Volatility: average threat level
    const volatility = Math.min(
      10,
      avg(analyses.map((a) => a.threat_level)) + Math.random(),
    );

    // Geopolitics: regulation + macro articles count * weight
    const geoItems = analyses.filter(
      (a) =>
        a.original.category === "REGULATION" || a.original.category === "MACRO",
    );
    const geopolitics = Math.min(
      10,
      (geoItems.length / analyses.length) * 10 + 2,
    );

    // Sentiment: bearish/lethal ratio
    const bearish = analyses.filter(
      (a) => a.sentiment === "BEARISH" || a.sentiment === "LETHAL",
    );
    const sentimentScore = Math.min(
      10,
      (bearish.length / analyses.length) * 10 + 1,
    );

    // Exposure: how many of user's holdings appear in affected assets
    const heldSymbols = Object.keys(holdings);
    let exposureHits = 0;
    analyses.forEach((a) => {
      a.affected_assets.forEach((sym) => {
        if (heldSymbols.includes(sym)) exposureHits++;
      });
    });
    const exposure = Math.min(
      10,
      (exposureHits / Math.max(1, analyses.length)) * 8 + 1,
    );

    return {
      volatility: +volatility.toFixed(1),
      geopolitics: +geopolitics.toFixed(1),
      sentiment: +sentimentScore.toFixed(1),
      exposure: +exposure.toFixed(1),
    };
  }, [analyses, holdings]);

  // ── Pulse on high threat for PARANOID users ─────────────
  useEffect(() => {
    const highThreat = analyses.some((a) => a.threat_level >= 8);
    if (sensitivity === "PARANOID" && highThreat) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 3000);
      return () => clearTimeout(t);
    }
  }, [analyses, sensitivity]);

  // ── SVG Radar Drawing ───────────────────────────────────
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 72;
  const labels = [
    "VOLATILITY",
    "GEOPOLITICS",
    "SENTIMENT",
    "EXPOSURE",
  ] as const;
  const values = [
    axes.volatility,
    axes.geopolitics,
    axes.sentiment,
    axes.exposure,
  ];

  // 4 axes at 90° intervals, starting from top
  const angleStep = (2 * Math.PI) / 4;
  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / 10) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  // Grid rings
  const rings = [2, 4, 6, 8, 10];

  // Data polygon points
  const dataPoints = values.map((v, i) => getPoint(i, v));
  const polygonStr = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const overallThreat = values.reduce((a, b) => a + b, 0) / 4;

  return (
    <div
      className={`border-4 bg-black h-full flex flex-col ${
        pulse
          ? "border-[#DD0000] shadow-[0_0_30px_rgba(255,0,0,0.5)]"
          : "border-gray-300"
      } transition-all duration-300`}
    >
      {/* Header */}
      <div className="border-b-4 border-gray-300 px-4 py-2 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-widest text-white">
          THREAT RADAR
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-1.5 py-0.5 ${
              overallThreat > 7
                ? "bg-[#DD0000] text-white"
                : overallThreat > 4
                  ? "bg-[#C9A832] text-black"
                  : "bg-gray-800 text-gray-300"
            }`}
          >
            AVG {overallThreat.toFixed(1)}
          </span>
          <span
            className={`text-[9px] border px-1 py-0.5 ${
              sensitivity === "PARANOID"
                ? "border-[#DD0000] text-[#DD0000]"
                : "border-gray-300 text-gray-300"
            }`}
          >
            {sensitivity}
          </span>
        </div>
      </div>

      {/* Radar SVG */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <motion.svg
          width="100%"
          height="100%"
          viewBox={`-10 -10 ${size + 20} ${size + 20}`}
          className="max-w-full max-h-full"
          preserveAspectRatio="xMidYMid meet"
          animate={pulse ? { scale: [1, 1.02, 1] } : {}}
          transition={pulse ? { repeat: Infinity, duration: 0.5 } : {}}
        >
          {/* Grid Rings */}
          {rings.map((ring) => {
            const points = [0, 1, 2, 3]
              .map((i) => getPoint(i, ring))
              .map((p) => `${p.x},${p.y}`)
              .join(" ");
            return (
              <polygon
                key={ring}
                points={points}
                fill="none"
                stroke="#333"
                strokeWidth={1}
                opacity={0.5}
              />
            );
          })}

          {/* Axis Lines */}
          {[0, 1, 2, 3].map((i) => {
            const end = getPoint(i, 10);
            return (
              <line
                key={`axis-${i}`}
                x1={cx}
                y1={cy}
                x2={end.x}
                y2={end.y}
                stroke="#444"
                strokeWidth={1}
              />
            );
          })}

          {/* Data Polygon */}
          <motion.polygon
            points={polygonStr}
            fill={pulse ? "rgba(255,0,0,0.3)" : "rgba(255,255,255,0.15)"}
            stroke={pulse ? "#DD0000" : "#FFFFFF"}
            strokeWidth={2}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Data Points */}
          {dataPoints.map((p, i) => (
            <motion.circle
              key={`dot-${i}`}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={values[i] > 7 ? "#DD0000" : "#FFFFFF"}
              stroke="#000"
              strokeWidth={1}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
            />
          ))}

          {/* Labels */}
          {[0, 1, 2, 3].map((i) => {
            const end = getPoint(i, 10.8);
            const labelAnchors = ["middle", "start", "middle", "end"] as const;
            const dx = [0, 8, 0, -8];
            const dy = [-6, 4, 13, 4];
            return (
              <text
                key={`label-${i}`}
                x={end.x + dx[i]}
                y={end.y + dy[i]}
                textAnchor={labelAnchors[i]}
                className="text-[8px] font-bold fill-gray-300"
              >
                {labels[i]} ({values[i].toFixed(1)})
              </text>
            );
          })}
        </motion.svg>
      </div>

      {/* Footer — axis breakdown */}
      <div className="border-t-4 border-gray-300 grid grid-cols-4 divide-x-2 divide-gray-800">
        {labels.map((label, i) => (
          <div key={label} className="px-2 py-2 text-center">
            <div
              className={`text-base font-bold ${values[i] > 7 ? "text-[#DD0000]" : "text-white"}`}
            >
              {values[i].toFixed(1)}
            </div>
            <div className="text-[8px] text-gray-300 tracking-wider">
              {label.slice(0, 4)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
