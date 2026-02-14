/**
 * Geisha Gains - Price Chart Component
 * Coffee Driven Development - BugsByte 2026
 * 
 * Brutalist SVG-based price chart with superimposed buy/sell signals
 */

'use client';

import { useMemo } from 'react';

interface PricePoint {
  timestamp: number;
  price: number;
}

interface Signal {
  timestamp: number;
  type: 'BUY' | 'SELL';
  price: number;
  confidence: number;
}

interface PriceChartProps {
  symbol: string;
  priceHistory: PricePoint[];
  signals: Signal[];
  currentPrice: number;
}

export function PriceChart({ symbol, priceHistory, signals, currentPrice }: PriceChartProps) {
  const WIDTH = 800;
  const HEIGHT = 300;
  const PADDING = 40;

  const { pathData, minPrice, maxPrice, scaleX, scaleY } = useMemo(() => {
    if (priceHistory.length === 0) {
      return { pathData: '', minPrice: 0, maxPrice: 0, scaleX: () => 0, scaleY: () => 0 };
    }

    const prices = priceHistory.map((p) => p.price);
    const minPrice = Math.min(...prices) * 0.99;
    const maxPrice = Math.max(...prices) * 1.01;
    const priceRange = maxPrice - minPrice;

    const minTime = priceHistory[0].timestamp;
    const maxTime = priceHistory[priceHistory.length - 1].timestamp;
    const timeRange = maxTime - minTime;

    const scaleX = (timestamp: number) =>
      PADDING + ((timestamp - minTime) / timeRange) * (WIDTH - PADDING * 2);

    const scaleY = (price: number) =>
      HEIGHT - PADDING - ((price - minPrice) / priceRange) * (HEIGHT - PADDING * 2);

    const pathData = priceHistory
      .map((point, idx) => {
        const x = scaleX(point.timestamp);
        const y = scaleY(point.price);
        return idx === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      })
      .join(' ');

    return { pathData, minPrice, maxPrice, scaleX, scaleY };
  }, [priceHistory]);

  return (
    <div className="border-4 border-black bg-white">
      {/* Header */}
      <div className="border-b-4 border-black p-4 bg-black text-white flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase tracking-tight">
          {symbol} PRICE CHART
        </h2>
        <div className="text-right">
          <div className="text-xs font-bold">CURRENT PRICE</div>
          <div className="text-2xl font-black">${currentPrice.toFixed(2)}</div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="p-4">
        <svg
          width={WIDTH}
          height={HEIGHT}
          className="w-full h-auto border-2 border-black"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        >
          {/* Grid Lines */}
          <g className="grid">
            {[0, 1, 2, 3, 4].map((i) => {
              const y = PADDING + (i * (HEIGHT - PADDING * 2)) / 4;
              return (
                <line
                  key={`grid-h-${i}`}
                  x1={PADDING}
                  y1={y}
                  x2={WIDTH - PADDING}
                  y2={y}
                  stroke="#e5e5e5"
                  strokeWidth="1"
                />
              );
            })}
            {[0, 1, 2, 3, 4].map((i) => {
              const x = PADDING + (i * (WIDTH - PADDING * 2)) / 4;
              return (
                <line
                  key={`grid-v-${i}`}
                  x1={x}
                  y1={PADDING}
                  x2={x}
                  y2={HEIGHT - PADDING}
                  stroke="#e5e5e5"
                  strokeWidth="1"
                />
              );
            })}
          </g>

          {/* Price Line */}
          {pathData && (
            <path
              d={pathData}
              fill="none"
              stroke="black"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Buy/Sell Signal Heatmap (Superimposed) */}
          {signals.map((signal, idx) => {
            const x = scaleX(signal.timestamp);
            const y = scaleY(signal.price);
            const isBuy = signal.type === 'BUY';
            const size = 8 + (signal.confidence / 100) * 12; // Size based on confidence

            return (
              <g key={`signal-${idx}`}>
                {/* Heatmap circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={size}
                  fill={isBuy ? '#000000' : '#DD0000'}
                  opacity={0.3}
                />
                {/* Signal marker */}
                <circle
                  cx={x}
                  cy={y}
                  r={4}
                  fill={isBuy ? '#000000' : '#DD0000'}
                  stroke="white"
                  strokeWidth="2"
                />
                {/* Label */}
                <text
                  x={x}
                  y={y - 15}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill={isBuy ? '#000000' : '#DD0000'}
                >
                  {signal.type}
                </text>
              </g>
            );
          })}

          {/* Y-Axis Labels */}
          {[0, 1, 2, 3, 4].map((i) => {
            const price = maxPrice - (i * (maxPrice - minPrice)) / 4;
            const y = PADDING + (i * (HEIGHT - PADDING * 2)) / 4;
            return (
              <text
                key={`y-label-${i}`}
                x={PADDING - 10}
                y={y + 5}
                textAnchor="end"
                fontSize="12"
                fontWeight="bold"
                fill="black"
              >
                ${price.toFixed(0)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="border-t-4 border-black p-4 bg-gray-100">
        <div className="flex items-center justify-center gap-6 text-sm font-bold">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-black border-2 border-black"></div>
            <span>BUY SIGNAL</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 border-2 border-black"></div>
            <span>SELL SIGNAL</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-black"></div>
            <span>PRICE LINE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
