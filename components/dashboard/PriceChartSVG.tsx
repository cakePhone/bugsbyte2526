"use client";

import type { ChartTimeframe, DisplayCurrency, PricePoint } from "./types";

export default function PriceChartSVG({
  histories,
  selectedSymbols,
  timeframe,
}: {
  histories: Record<string, PricePoint[]>;
  selectedSymbols: string[];
  timeframe: ChartTimeframe;
  currency: DisplayCurrency;
}) {
  const series = selectedSymbols
    .map((symbol) => {
      const cleaned = (histories[symbol] || [])
        .map((point) => ({
          timestamp: Number(point.timestamp),
          price: Number(point.price),
        }))
        .filter(
          (point) =>
            Number.isFinite(point.timestamp) &&
            Number.isFinite(point.price) &&
            point.price > 0,
        )
        .sort((a, b) => a.timestamp - b.timestamp);

      const deduped = cleaned.filter(
        (point, index, arr) =>
          index === arr.length - 1 ||
          point.timestamp !== arr[index + 1].timestamp,
      );

      return { symbol, points: deduped };
    })
    .filter((entry) => entry.points.length >= 2);

  if (series.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
        SELECT COINS TO OVERLAY HISTORICAL VALUES...
      </div>
    );
  }

  const w = 700;
  const h = 250;
  const pad = 20;

  const normalizedSeries = series.map(({ symbol, points }) => {
    const baseline = points[0]?.price || 1;
    const normalizedPoints = points.map((point) => ({
      timestamp: point.timestamp,
      value: ((point.price - baseline) / baseline) * 100,
      price: point.price,
    }));
    return { symbol, points, normalizedPoints };
  });

  const allNormalized = normalizedSeries.flatMap((entry) =>
    entry.normalizedPoints.map((point) => point.value),
  );
  const minPctRaw = Math.min(...allNormalized);
  const maxPctRaw = Math.max(...allNormalized);
  const minPct = Math.min(minPctRaw, -0.1);
  const maxPct = Math.max(maxPctRaw, 0.1);
  const range = maxPct - minPct || 1;

  const allPoints = normalizedSeries.flatMap((entry) => entry.points);
  const startTs = Math.min(...allPoints.map((p) => p.timestamp));
  const endTs = Math.max(...allPoints.map((p) => p.timestamp));
  const tsRange = endTs - startTs || 1;

  const palette: Record<string, string> = {
    BTC: "#FFFFFF",
    ETH: "#C9A832",
    XRP: "#DD0000",
    SOL: "#00FFA3",
    ADA: "#6EA8FF",
    DOGE: "#D7B85C",
    LTC: "#B5B5B5",
  };

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
    >
      {[0.25, 0.5, 0.75].map((pct) => {
        const y = pad + pct * (h - 2 * pad);
        return (
          <line
            key={pct}
            x1={pad}
            y1={y}
            x2={w - pad}
            y2={y}
            stroke="#222"
            strokeWidth={1}
          />
        );
      })}

      {normalizedSeries.map(({ symbol, points, normalizedPoints }) => {
        const linePoints = normalizedPoints.map((p) => {
          const x = pad + ((p.timestamp - startTs) / tsRange) * (w - 2 * pad);
          const y = pad + (1 - (p.value - minPct) / range) * (h - 2 * pad);
          return `${x},${y}`;
        });

        const latest = points.at(-1)?.price ?? 0;
        const first = points[0]?.price ?? latest;
        const deltaPct = first > 0 ? ((latest - first) / first) * 100 : 0;
        const y = pad + (1 - (deltaPct - minPct) / range) * (h - 2 * pad);
        const color = palette[symbol] || "#AAAAAA";

        return (
          <g key={symbol}>
            <polyline
              points={linePoints.join(" ")}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
            <text
              x={w - pad - 4}
              y={y - 6}
              textAnchor="end"
              className="text-[9px] font-bold"
              fill={color}
            >
              {symbol} {deltaPct >= 0 ? "+" : ""}
              {deltaPct.toFixed(2)}%
            </text>
          </g>
        );
      })}

      <text x={5} y={pad} className="text-[8px]" fill="#555">
        +{maxPct.toFixed(2)}%
      </text>
      <text x={5} y={h - pad + 12} className="text-[8px]" fill="#555">
        {minPct.toFixed(2)}%
      </text>

      <text x={5} y={h / 2} className="text-[8px]" fill="#555">
        0.00%
      </text>

      <text
        x={w - pad}
        y={h - 4}
        textAnchor="end"
        className="text-[9px]"
        fill="#777"
      >
        {timeframe} • {selectedSymbols.join(" / ")}
      </text>
    </svg>
  );
}
