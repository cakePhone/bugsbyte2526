/**
 * SentimentGauge — XTB-style Bulls vs Bears real-time bar
 * Jitters as data streams in from the Uphold API.
 */

'use client';

import { motion } from 'framer-motion';
import { useUberCharge } from '@/contexts/UberChargeContext';

interface Props {
  bulls: number;  // 0-100
  bears: number;  // 0-100
}

export default function SentimentGauge({ bulls, bears }: Props) {
  const { isOverdrive } = useUberCharge();

  return (
    <div className="border-4 border-black bg-white">
      {/* Header */}
      <div className="border-b-4 border-black px-4 py-2 flex items-center justify-between">
        <h2 className="text-sm font-black font-mono uppercase">MARKET SENTIMENT</h2>
        <motion.div
          className="w-2 h-2 bg-red-600 rounded-full"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
      </div>

      <div className="p-4 space-y-3">
        {/* Labels row */}
        <div className="flex items-center justify-between font-mono text-xs font-black">
          <span>BULLS 🐂</span>
          <span>🐻 BEARS</span>
        </div>

        {/* Sentiment bar */}
        <div className="relative h-8 border-4 border-black bg-gray-100 overflow-hidden">
          {/* Bulls side (left, black) */}
          <motion.div
            className="absolute inset-y-0 left-0 bg-black"
            animate={{
              width: `${bulls}%`,
              ...(isOverdrive && {
                x: [0, -1, 1, -1, 0],
              }),
            }}
            transition={
              isOverdrive
                ? { duration: 0.15, repeat: Infinity }
                : { duration: 0.8, ease: 'easeInOut' }
            }
          />
          {/* Bears side (right, red) */}
          <motion.div
            className="absolute inset-y-0 right-0 bg-red-600"
            animate={{
              width: `${bears}%`,
              ...(isOverdrive && {
                x: [0, 1, -1, 1, 0],
              }),
            }}
            transition={
              isOverdrive
                ? { duration: 0.15, repeat: Infinity }
                : { duration: 0.8, ease: 'easeInOut' }
            }
          />
          {/* Center divider */}
          <div
            className="absolute inset-y-0 w-1 bg-white border-x border-black"
            style={{ left: `${bulls}%`, transform: 'translateX(-50%)' }}
          />
        </div>

        {/* Percentages */}
        <div className="flex items-center justify-between font-mono font-black">
          <motion.span
            className="text-xl"
            key={bulls}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
          >
            {bulls.toFixed(1)}%
          </motion.span>
          <span className="text-[10px] text-gray-400">AI SENTIMENT</span>
          <motion.span
            className="text-xl text-red-600"
            key={bears}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
          >
            {bears.toFixed(1)}%
          </motion.span>
        </div>
      </div>
    </div>
  );
}
