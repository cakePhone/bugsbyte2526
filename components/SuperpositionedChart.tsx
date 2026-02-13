/**
 * SuperpositionedChart — TradingView-inspired layered SVG chart
 * Uses Framer Motion for smooth real-time price transitions.
 *
 * Layers (back → front):
 *  1. Grid
 *  2. AI Buy/Sell Heatmap zones
 *  3. Support / Resistance thick black strokes
 *  4. Price line (black, thick)
 *  5. Glitch overlay when Overdrive active
 *  6. Green Bean floating tracker
 */

'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUberCharge } from '@/contexts/UberChargeContext';
import type { ArbitrageOpportunity } from '@/lib/aiAnalyzer';

interface PricePoint {
  timestamp: number;
  price: number;
}

interface Props {
  symbol: string;
  priceHistory: PricePoint[];
  currentPrice: number;
  opportunity?: ArbitrageOpportunity;
  /** Mouse position relative to chart for Green Bean float */
  cursorX?: number;
}

const W = 800;
const H = 360;
const PAD = { top: 20, right: 60, bottom: 30, left: 70 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export default function SuperpositionedChart({
  symbol,
  priceHistory,
  currentPrice,
  opportunity,
  cursorX,
}: Props) {
  const { isOverdrive } = useUberCharge();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // ─── Derived data ────────────────────────────────────────
  const data = useMemo(() => {
    if (priceHistory.length < 2) return null;

    const prices = priceHistory.map((p) => p.price);
    const minP = Math.min(...prices) * 0.999;
    const maxP = Math.max(...prices) * 1.001;
    const range = maxP - minP || 1;

    // Map to SVG points
    const points = priceHistory.map((p, i) => ({
      x: PAD.left + (i / (priceHistory.length - 1)) * PLOT_W,
      y: PAD.top + PLOT_H - ((p.price - minP) / range) * PLOT_H,
      price: p.price,
      ts: p.timestamp,
    }));

    // Build SVG path
    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');

    // Area fill path
    const areaD =
      pathD +
      ` L${points[points.length - 1].x},${PAD.top + PLOT_H} L${points[0].x},${PAD.top + PLOT_H} Z`;

    // Support / Resistance from AI
    const support = opportunity?.aiVerdict.supportLevel ?? minP;
    const resistance = opportunity?.aiVerdict.resistanceLevel ?? maxP;
    const supportY = PAD.top + PLOT_H - ((support - minP) / range) * PLOT_H;
    const resistanceY = PAD.top + PLOT_H - ((resistance - minP) / range) * PLOT_H;

    // Grid lines (5 horizontal)
    const gridLines = Array.from({ length: 6 }, (_, i) => {
      const price = minP + (range / 5) * i;
      const y = PAD.top + PLOT_H - (i / 5) * PLOT_H;
      return { y, price };
    });

    // AI heatmap zones
    const heatmapZones: { x: number; w: number; type: 'BUY' | 'SELL' }[] = [];
    if (opportunity) {
      const action = opportunity.aiVerdict.action;
      if (action === 'BUY') {
        // Buy zone covers last 40% of chart
        heatmapZones.push({
          x: PAD.left + PLOT_W * 0.6,
          w: PLOT_W * 0.4,
          type: 'BUY',
        });
      } else if (action === 'SELL') {
        heatmapZones.push({
          x: PAD.left + PLOT_W * 0.6,
          w: PLOT_W * 0.4,
          type: 'SELL',
        });
      }
    }

    return { points, pathD, areaD, minP, maxP, range, supportY, resistanceY, support, resistance, gridLines, heatmapZones };
  }, [priceHistory, opportunity]);

  if (!data) {
    return (
      <div className="border-4 border-black bg-white p-8 text-center font-mono uppercase">
        <span className="text-lg font-black">AWAITING PRICE DATA FOR {symbol}…</span>
      </div>
    );
  }

  const greenBean = opportunity?.greenBean;

  return (
    <div className="border-4 border-black bg-white relative overflow-hidden">
      {/* Chart header */}
      <div className="flex items-center justify-between border-b-4 border-black px-4 py-2 bg-white">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black font-mono uppercase">{symbol}/USD</span>
          <span className="text-xs font-bold border-2 border-black px-2 py-0.5 font-mono">
            SUPERPOSITION
          </span>
        </div>
        <motion.span
          className="text-2xl font-black font-mono"
          key={currentPrice}
          initial={{ opacity: 0.5, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </motion.span>
      </div>

      {/* SVG Chart */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ display: 'block' }}
        onMouseMove={(e) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;
          const x = ((e.clientX - rect.left) / rect.width) * W;
          const idx = Math.round(
            ((x - PAD.left) / PLOT_W) * (data.points.length - 1)
          );
          if (idx >= 0 && idx < data.points.length) setHoveredIdx(idx);
        }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {/* ── Layer 0: Background */}
        <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} fill="#FAFAFA" />

        {/* ── Layer 1: Grid Lines */}
        {data.gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={g.y}
              x2={PAD.left + PLOT_W}
              y2={g.y}
              stroke="#E5E5E5"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={g.y + 4}
              textAnchor="end"
              className="text-[10px]"
              fill="#999"
              fontFamily="monospace"
            >
              ${g.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </text>
          </g>
        ))}

        {/* ── Layer 2: AI Buy/Sell Heatmap (behind price) */}
        {data.heatmapZones.map((zone, i) => (
          <motion.rect
            key={i}
            x={zone.x}
            y={PAD.top}
            width={zone.w}
            height={PLOT_H}
            fill={zone.type === 'BUY' ? 'rgba(0,0,0,0.04)' : 'rgba(255,0,0,0.06)'}
            initial={{ opacity: 0 }}
            animate={{
              opacity: isOverdrive ? [0.15, 0.25, 0.15] : 0.6,
            }}
            transition={isOverdrive ? { repeat: Infinity, duration: 0.15 } : { duration: 0.5 }}
          />
        ))}
        {data.heatmapZones.map((zone, i) => (
          <text
            key={`label-${i}`}
            x={zone.x + zone.w / 2}
            y={PAD.top + 20}
            textAnchor="middle"
            fill={zone.type === 'BUY' ? '#000' : '#FF0000'}
            fontFamily="monospace"
            fontWeight="900"
            fontSize="11"
            opacity={0.5}
          >
            AI {zone.type} ZONE
          </text>
        ))}

        {/* ── Layer 3: Support / Resistance lines (thick black strokes) */}
        <line
          x1={PAD.left}
          y1={data.supportY}
          x2={PAD.left + PLOT_W}
          y2={data.supportY}
          stroke="#000"
          strokeWidth={3}
          strokeDasharray="12 6"
        />
        <text
          x={PAD.left + PLOT_W + 4}
          y={data.supportY + 4}
          fill="#000"
          fontFamily="monospace"
          fontWeight="900"
          fontSize="10"
        >
          S: ${data.support.toLocaleString()}
        </text>

        <line
          x1={PAD.left}
          y1={data.resistanceY}
          x2={PAD.left + PLOT_W}
          y2={data.resistanceY}
          stroke="#FF0000"
          strokeWidth={3}
          strokeDasharray="12 6"
        />
        <text
          x={PAD.left + PLOT_W + 4}
          y={data.resistanceY + 4}
          fill="#FF0000"
          fontFamily="monospace"
          fontWeight="900"
          fontSize="10"
        >
          R: ${data.resistance.toLocaleString()}
        </text>

        {/* ── Layer 4: Area fill */}
        <path d={data.areaD} fill="rgba(0,0,0,0.03)" />

        {/* ── Layer 4: Price line (thick black) */}
        <motion.path
          d={data.pathD}
          fill="none"
          stroke="#000"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />

        {/* ── Layer 5: Glitch overlay (Overdrive) */}
        {isOverdrive && (
          <>
            <motion.rect
              x={PAD.left}
              y={PAD.top}
              width={PLOT_W}
              height={PLOT_H}
              fill="rgba(255,0,0,0.08)"
              animate={{ opacity: [0.05, 0.12, 0.05, 0.18, 0.05] }}
              transition={{ repeat: Infinity, duration: 0.2 }}
            />
            {/* Glitch lines */}
            {[0.2, 0.45, 0.7].map((pct) => (
              <motion.line
                key={pct}
                x1={PAD.left}
                y1={PAD.top + PLOT_H * pct}
                x2={PAD.left + PLOT_W}
                y2={PAD.top + PLOT_H * pct}
                stroke="#FF0000"
                strokeWidth={1}
                animate={{
                  y1: [PAD.top + PLOT_H * pct - 2, PAD.top + PLOT_H * pct + 2],
                  y2: [PAD.top + PLOT_H * pct + 2, PAD.top + PLOT_H * pct - 2],
                  opacity: [0, 0.6, 0],
                }}
                transition={{ repeat: Infinity, duration: 0.3, delay: pct * 0.1 }}
              />
            ))}
          </>
        )}

        {/* ── Crosshair on hover */}
        {hoveredIdx !== null && data.points[hoveredIdx] && (
          <g>
            <line
              x1={data.points[hoveredIdx].x}
              y1={PAD.top}
              x2={data.points[hoveredIdx].x}
              y2={PAD.top + PLOT_H}
              stroke="#000"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <line
              x1={PAD.left}
              y1={data.points[hoveredIdx].y}
              x2={PAD.left + PLOT_W}
              y2={data.points[hoveredIdx].y}
              stroke="#000"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <circle
              cx={data.points[hoveredIdx].x}
              cy={data.points[hoveredIdx].y}
              r={5}
              fill="#000"
              stroke="#fff"
              strokeWidth={2}
            />
            {/* Price tooltip */}
            <rect
              x={data.points[hoveredIdx].x + 8}
              y={data.points[hoveredIdx].y - 20}
              width={90}
              height={22}
              fill="#000"
            />
            <text
              x={data.points[hoveredIdx].x + 12}
              y={data.points[hoveredIdx].y - 5}
              fill="#FFF"
              fontFamily="monospace"
              fontWeight="900"
              fontSize="11"
            >
              ${data.points[hoveredIdx].price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </text>
          </g>
        )}
      </svg>

      {/* ── Layer 6: Green Bean floating box */}
      <AnimatePresence>
        {greenBean && (
          <motion.div
            className="absolute border-4 border-black bg-red-600 text-white px-3 py-2 font-mono text-xs font-black z-20 pointer-events-none"
            style={{
              top: '50%',
              right: 16,
              transform: 'translateY(-50%)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: isOverdrive ? [0, -3, 0, 3, 0] : 0,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={isOverdrive ? { repeat: Infinity, duration: 0.2 } : { duration: 0.3 }}
          >
            <div className="uppercase text-[10px] opacity-80">GREEN BEAN ☕</div>
            <div className="text-lg">{greenBean.exchange}</div>
            <div>${greenBean.ask.toLocaleString()}</div>
            <div className="text-[10px] mt-1 opacity-70">
              PROFIT: +{opportunity?.potentialProfitPct.toFixed(3)}%
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
