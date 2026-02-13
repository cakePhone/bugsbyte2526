/**
 * OrderEntry — Coinbase-simple trade execution panel
 * Large bold inputs, zero fluff, single red Execute button.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useUberCharge } from '@/contexts/UberChargeContext';

interface Props {
  symbols: string[];
  currentPrices: Record<string, number>;
  bestExchanges: Record<string, string>;
  onExecute: (order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    amount: number;
    exchange: string;
  }) => void;
  disabled?: boolean;
}

export default function OrderEntry({
  symbols,
  currentPrices,
  bestExchanges,
  onExecute,
  disabled,
}: Props) {
  const { isOverdrive } = useUberCharge();
  const [symbol, setSymbol] = useState(symbols[0] || 'BTC');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState('');

  const price = currentPrices[symbol] || 0;
  const total = price * (parseFloat(amount) || 0);
  const exchange = bestExchanges[symbol] || 'UPHOLD';

  const handleSubmit = () => {
    const qty = parseFloat(amount);
    if (!qty || qty <= 0) return;
    onExecute({ symbol, side, amount: qty, exchange });
    setAmount('');
  };

  return (
    <div className="border-4 border-black bg-white">
      {/* Header */}
      <div className="border-b-4 border-black px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-black font-mono uppercase">ORDER ENTRY</h2>
        <span className="text-[10px] font-mono font-bold border-2 border-black px-2 py-0.5">
          INSTANT
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Symbol selector */}
        <div>
          <label className="text-[10px] font-mono font-black uppercase text-gray-500 block mb-1">
            ASSET
          </label>
          <div className="flex gap-2">
            {symbols.map((s) => (
              <button
                key={s}
                onClick={() => setSymbol(s)}
                className={`flex-1 border-4 border-black py-2 font-black font-mono text-sm uppercase transition-colors ${
                  symbol === s
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Side toggle */}
        <div>
          <label className="text-[10px] font-mono font-black uppercase text-gray-500 block mb-1">
            SIDE
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setSide('BUY')}
              className={`flex-1 border-4 border-black py-3 font-black font-mono text-lg uppercase transition-colors ${
                side === 'BUY'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              BUY
            </button>
            <button
              onClick={() => setSide('SELL')}
              className={`flex-1 border-4 border-black py-3 font-black font-mono text-lg uppercase transition-colors ${
                side === 'SELL'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              SELL
            </button>
          </div>
        </div>

        {/* Amount input — big, bold, Coinbase-style */}
        <div>
          <label className="text-[10px] font-mono font-black uppercase text-gray-500 block mb-1">
            AMOUNT ({symbol})
          </label>
          <input
            type="number"
            step="any"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full border-4 border-black p-4 text-3xl font-black font-mono text-center bg-white focus:outline-none focus:border-red-600 transition-colors placeholder:text-gray-300"
          />
        </div>

        {/* Price info */}
        <div className="border-4 border-black p-3 bg-gray-50 space-y-1">
          <div className="flex justify-between font-mono text-sm">
            <span className="text-gray-500 font-bold">PRICE</span>
            <span className="font-black">${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between font-mono text-sm">
            <span className="text-gray-500 font-bold">EXCHANGE</span>
            <span className="font-black">{exchange}</span>
          </div>
          <div className="flex justify-between font-mono text-sm border-t-2 border-black pt-1">
            <span className="text-gray-500 font-bold">TOTAL</span>
            <span className="font-black text-lg">
              ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Execute button */}
        <motion.button
          onClick={handleSubmit}
          disabled={disabled || !parseFloat(amount)}
          className={`w-full border-4 border-black p-5 font-black font-mono text-2xl uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            isOverdrive
              ? 'bg-red-600 text-white animate-jitter'
              : 'bg-black text-white hover:bg-red-600 hover:text-white'
          }`}
          whileHover={!disabled ? { scale: 1.02 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
        >
          {isOverdrive ? '⚡ OVERDRIVE EXECUTE ⚡' : `EXECUTE ${side}`}
        </motion.button>
      </div>
    </div>
  );
}
