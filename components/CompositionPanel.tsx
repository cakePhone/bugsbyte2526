/**
 * CompositionPanel — JustETF-inspired asset clarity breakdown
 * Stark, border-heavy table showing wallet weightage, risk levels,
 * and "Volatility Roast" (Low/Medium/High Caffeine).
 */

'use client';

import { motion } from 'framer-motion';
import { useUberCharge } from '@/contexts/UberChargeContext';

interface WalletAsset {
  symbol: string;
  amount: number;
  price: number;
  value: number;
  weight: number;       // % of portfolio
  change24h: number;
  riskLevel: 'LOW_CAFFEINE' | 'MEDIUM_CAFFEINE' | 'HIGH_CAFFEINE';
}

interface Props {
  balanceUsdt: number;
  assets: WalletAsset[];
  totalValue: number;
  totalPnL: number;
}

const RISK_COLORS: Record<string, string> = {
  LOW_CAFFEINE: 'bg-white text-black',
  MEDIUM_CAFFEINE: 'bg-black text-white',
  HIGH_CAFFEINE: 'bg-red-600 text-white',
};

const RISK_LABELS: Record<string, string> = {
  LOW_CAFFEINE: '☕ LOW',
  MEDIUM_CAFFEINE: '☕☕ MED',
  HIGH_CAFFEINE: '☕☕☕ HIGH',
};

export default function CompositionPanel({ balanceUsdt, assets, totalValue, totalPnL }: Props) {
  const { isOverdrive } = useUberCharge();

  return (
    <div className="border-4 border-black bg-white">
      {/* Header */}
      <div className="border-b-4 border-black px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-black font-mono uppercase">PORTFOLIO COMPOSITION</h2>
        <span className="text-xs font-mono font-bold border-2 border-black px-2 py-0.5">
          JUSTCOFFEE
        </span>
      </div>

      {/* Total Value */}
      <div className="border-b-4 border-black px-4 py-4 flex items-end justify-between">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase text-gray-300">
            TOTAL VALUE
          </div>
          <motion.div
            className="text-3xl font-black font-mono"
            key={totalValue}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
          >
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </motion.div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono font-bold uppercase text-gray-300">P&amp;L</div>
          <div
            className={`text-xl font-black font-mono ${
              totalPnL >= 0 ? 'text-black' : 'text-red-600'
            }`}
          >
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </div>
        </div>
      </div>

      {/* USDT row */}
      <div className="border-b-2 border-black px-4 py-2 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="font-black font-mono text-sm">USDT</span>
          <span className="text-[10px] font-mono text-gray-300">STABLECOIN</span>
        </div>
        <div className="text-right">
          <span className="font-black font-mono text-sm">
            ${balanceUsdt.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Asset table */}
      <table className="w-full text-left">
        <thead>
          <tr className="border-b-4 border-black text-[10px] font-mono font-black uppercase text-gray-300">
            <th className="px-4 py-2">ASSET</th>
            <th className="px-2 py-2 text-right">AMOUNT</th>
            <th className="px-2 py-2 text-right">VALUE</th>
            <th className="px-2 py-2 text-right">WEIGHT</th>
            <th className="px-2 py-2 text-center">ROAST</th>
          </tr>
        </thead>
        <tbody>
          {assets.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center font-mono text-gray-300 text-sm">
                NO HOLDINGS — START TRADING
              </td>
            </tr>
          ) : (
            assets.map((asset) => (
              <motion.tr
                key={asset.symbol}
                className={`border-b-2 border-black hover:bg-gray-50 ${
                  isOverdrive ? 'animate-jitter' : ''
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <td className="px-4 py-3">
                  <div className="font-black font-mono text-sm">{asset.symbol}</div>
                  <div
                    className={`text-[10px] font-mono ${
                      asset.change24h >= 0 ? 'text-black' : 'text-red-600'
                    }`}
                  >
                    {asset.change24h >= 0 ? '+' : ''}
                    {asset.change24h.toFixed(2)}%
                  </div>
                </td>
                <td className="px-2 py-3 text-right font-mono text-sm">
                  {asset.amount.toFixed(6)}
                </td>
                <td className="px-2 py-3 text-right font-mono text-sm font-bold">
                  ${asset.value.toFixed(2)}
                </td>
                <td className="px-2 py-3 text-right">
                  {/* Weight bar */}
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-3 border-2 border-black bg-gray-100 relative overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-black"
                        initial={{ width: 0 }}
                        animate={{ width: `${asset.weight}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span className="font-mono text-[10px] font-bold w-8 text-right">
                      {asset.weight.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-2 py-3 text-center">
                  <span
                    className={`text-[10px] font-black font-mono px-2 py-1 border-2 border-black inline-block ${
                      RISK_COLORS[asset.riskLevel]
                    }`}
                  >
                    {RISK_LABELS[asset.riskLevel]}
                  </span>
                </td>
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
