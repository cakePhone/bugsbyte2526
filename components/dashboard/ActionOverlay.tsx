/**
 * ACTION OVERLAY — "Lethal" Alert System
 * Geisha Gains • Coffee Driven Development
 *
 * When Portfolio Threat > 8 AND Sentiment == BEARISH/LETHAL:
 * - Flashing red border on the affected asset card
 * - "QUICK SELL [ASSET]" button
 * - Red vertical line on chart with "FATAL EVENT DETECTED" label
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { NewsAnalysis } from '@/app/api/news/analyze/route';

interface ActionOverlayProps {
  analyses: NewsAnalysis[];
  holdings: Record<string, number>;
  onQuickSell: (symbol: string) => void;
  onDismiss: (id: string) => void;
  dismissedIds: Set<string>;
}

interface LethalAlert {
  analysis: NewsAnalysis;
  affectedHolding: string;
  amount: number;
}

export default function ActionOverlay({
  analyses,
  holdings,
  onQuickSell,
  onDismiss,
  dismissedIds,
}: ActionOverlayProps) {
  // Find lethal alerts: threat > 8 AND (BEARISH or LETHAL) AND user holds affected asset
  const lethalAlerts: LethalAlert[] = [];

  analyses.forEach((a) => {
    if (a.portfolio_threat > 8 && (a.sentiment === 'BEARISH' || a.sentiment === 'LETHAL')) {
      a.affected_assets.forEach((sym) => {
        const amount = holdings[sym] || 0;
        if (amount > 0 && !dismissedIds.has(`${a.id}-${sym}`)) {
          lethalAlerts.push({ analysis: a, affectedHolding: sym, amount });
        }
      });
    }
  });

  if (lethalAlerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
      <AnimatePresence>
        {lethalAlerts.slice(0, 3).map((alert) => (
          <motion.div
            key={`${alert.analysis.id}-${alert.affectedHolding}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              borderColor: ['#FF0000', '#CC0000', '#FF0000'],
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{
              borderColor: { repeat: Infinity, duration: 0.5 },
            }}
            className="border-4 border-[#FF0000] bg-black text-white p-4 shadow-[0_0_30px_rgba(255,0,0,0.4)]"
          >
            {/* Alert Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="bg-[#FF0000] text-white text-[10px] font-bold px-1.5 py-0.5">
                  LETHAL
                </span>
                <span className="text-xs font-bold text-[#FF0000]">
                  T{alert.analysis.threat_level}
                </span>
              </div>
              <button
                onClick={() => onDismiss(`${alert.analysis.id}-${alert.affectedHolding}`)}
                className="text-gray-500 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {/* Asset at Risk */}
            <div className="flex items-center gap-3 mb-3">
              <motion.div
                className="text-2xl font-bold text-[#FF0000]"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              >
                {alert.affectedHolding}
              </motion.div>
              <div className="text-xs text-gray-400">
                <div>HOLDING: {alert.amount.toFixed(6)}</div>
                <div className="mt-0.5 text-[#FF0000] font-bold">
                  {alert.analysis.reasoning}
                </div>
              </div>
            </div>

            {/* Event Info */}
            <p className="text-[10px] text-gray-500 mb-3 leading-tight">
              {alert.analysis.original.headline}
            </p>

            {/* Quick Sell Button */}
            <motion.button
              onClick={() => onQuickSell(alert.affectedHolding)}
              className="w-full border-4 border-[#FF0000] bg-[#FF0000] text-white py-2 text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-[#FF0000] transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ⚡ QUICK SELL {alert.affectedHolding}
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Fatal Event Line (for embedding in charts) ───────────
export function FatalEventLine({
  events,
  timeStart,
  timeEnd,
}: {
  events: Array<{ timestamp: number; headline: string }>;
  /** Earliest timestamp visible on the chart */
  timeStart: number;
  /** Latest timestamp visible on the chart */
  timeEnd: number;
}) {
  if (events.length === 0) return null;

  const span = timeEnd - timeStart || 1;
  // Chart uses ~2.86% padding on each side (20/700), mirror that here
  const padPct = 2.86;
  const usable = 100 - padPct * 2;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {events
        .filter((e) => e.timestamp >= timeStart && e.timestamp <= timeEnd)
        .map((event, i) => {
          const pct = padPct + ((event.timestamp - timeStart) / span) * usable;
          return (
            <motion.div
              key={`${event.timestamp}-${i}`}
              className="absolute top-0 bottom-0 flex flex-col items-center"
              style={{ left: `${pct}%` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-[2px] h-full bg-[#FF0000]" />
              <div className="absolute top-2 -translate-x-1/2 bg-[#FF0000] text-white text-[8px] font-bold px-1.5 py-0.5 whitespace-nowrap">
                FATAL EVENT DETECTED
              </div>
              <div className="absolute bottom-2 -translate-x-1/2 max-w-[120px] truncate bg-black/80 text-[#FF0000] text-[7px] font-bold px-1 py-0.5 whitespace-nowrap">
                {event.headline}
              </div>
            </motion.div>
          );
        })}
    </div>
  );
}
