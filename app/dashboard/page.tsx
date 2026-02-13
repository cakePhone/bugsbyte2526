/**
 * THE WAR ROOM — Main Trading Dashboard
 * Geisha Gains • Coffee Driven Development
 *
 * Integrates: TheBulletin, ThreatRadar, ActionOverlay
 * Real-time news analysis powered by NVIDIA NIM (Llama-3)
 * Filtered through user's RiskProfile from The Interrogation
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TheBulletin from '@/components/dashboard/TheBulletin';
import ThreatRadar from '@/components/dashboard/ThreatRadar';
import ActionOverlay, { FatalEventLine } from '@/components/dashboard/ActionOverlay';
import type { NewsAnalysis } from '@/app/api/news/analyze/route';
import type { RiskProfile } from '@/components/onboarding/TheInterrogation';

// ── Types ─────────────────────────────────────────────────
interface PricePoint { timestamp: number; price: number }

// ── Mock prices (simulated from Uphold-style data) ───────
function generateMockPrice(symbol: string): number {
  const bases: Record<string, number> = { BTC: 97000, ETH: 3600, XRP: 2.5, USDT: 1 };
  const base = bases[symbol] || 100;
  return base * (1 + (Math.random() - 0.5) * 0.01);
}

// ── Dashboard ─────────────────────────────────────────────
export default function WarRoom() {
  // Profile from localStorage (set by The Interrogation)
  const [profile, setProfile] = useState<RiskProfile | null>(null);
  const [analyses, setAnalyses] = useState<NewsAnalysis[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanCount, setScanCount] = useState(0);

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(10000);
  const [holdings, setHoldings] = useState<Record<string, number>>({ BTC: 0.1, ETH: 2.0 });
  const [trades, setTrades] = useState<Array<{
    symbol: string; side: 'BUY' | 'SELL'; amount: number; price: number; ts: number;
  }>>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [priceHistories, setPriceHistories] = useState<Record<string, PricePoint[]>>({});

  // Fatal events
  const [fatalEvents, setFatalEvents] = useState<Array<{ timestamp: number; headline: string }>>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const priceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load profile from localStorage ──────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem('geisha_risk_profile');
      if (stored) setProfile(JSON.parse(stored));
      else {
        // Default profile if none exists
        setProfile({
          risk_tolerance: 'MODERATE',
          investment_horizon: 'SWING',
          focus_sectors: ['CRYPTO'],
          geopolitical_sensitivity: 'AWARE',
        });
      }
    } catch {
      setProfile({
        risk_tolerance: 'MODERATE',
        investment_horizon: 'SWING',
        focus_sectors: ['CRYPTO'],
        geopolitical_sensitivity: 'AWARE',
      });
    }
  }, []);

  // ── Price ticker ────────────────────────────────────────
  useEffect(() => {
    const updatePrices = () => {
      const newPrices: Record<string, number> = {};
      ['BTC', 'ETH', 'XRP'].forEach((sym) => {
        newPrices[sym] = generateMockPrice(sym);
      });
      setPrices(newPrices);

      // Update histories
      setPriceHistories((prev) => {
        const updated = { ...prev };
        Object.entries(newPrices).forEach(([sym, price]) => {
          updated[sym] = [...(updated[sym] || []).slice(-60), { timestamp: Date.now(), price }];
        });
        return updated;
      });
    };

    updatePrices();
    priceRef.current = setInterval(updatePrices, 3000);
    return () => { if (priceRef.current) clearInterval(priceRef.current); };
  }, []);

  // ── Poll news analysis API ─────────────────────────────
  const fetchAnalysis = useCallback(async () => {
    if (!profile) return;
    try {
      setIsLoading(true);
      const holdingsParam = Object.entries(holdings)
        .map(([s, a]) => `${s}:${a}`)
        .join(',');

      const params = new URLSearchParams({
        risk_tolerance: profile.risk_tolerance,
        investment_horizon: profile.investment_horizon,
        focus_sectors: profile.focus_sectors.join(','),
        geopolitical_sensitivity: profile.geopolitical_sensitivity,
        holdings: holdingsParam,
      });

      const res = await fetch(`/api/news/analyze?${params}`);
      if (!res.ok) throw new Error('Analysis failed');

      const data = await res.json();
      setAnalyses(data.analyses || []);
      setScanCount((c) => c + 1);

      // Track fatal events for the chart
      const fatalItems = (data.analyses || []).filter(
        (a: NewsAnalysis) => a.portfolio_threat > 8 && (a.sentiment === 'BEARISH' || a.sentiment === 'LETHAL')
      );
      if (fatalItems.length > 0) {
        setFatalEvents((prev) => [
          ...prev.slice(-5),
          ...fatalItems.map((f: NewsAnalysis) => ({
            timestamp: Date.now(),
            headline: f.original.headline,
          })),
        ]);
      }
    } catch (e) {
      console.error('News analysis error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [profile, holdings]);

  useEffect(() => {
    if (!profile) return;
    fetchAnalysis();
    tickRef.current = setInterval(fetchAnalysis, 30000); // Every 30s
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [fetchAnalysis, profile]);

  // ── Quick Sell Handler ──────────────────────────────────
  const handleQuickSell = useCallback((symbol: string) => {
    const amount = holdings[symbol] || 0;
    if (amount === 0) return;

    const price = prices[symbol] || 0;
    const total = price * amount;

    setWalletBalance((b) => b + total);
    setHoldings((h) => {
      const updated = { ...h };
      delete updated[symbol];
      return updated;
    });
    setTrades((t) => [
      { symbol, side: 'SELL', amount, price, ts: Date.now() },
      ...t.slice(0, 49),
    ]);
  }, [holdings, prices]);

  // ── Dismiss Alert ───────────────────────────────────────
  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlerts((prev) => {
      const next = new Set(Array.from(prev));
      next.add(id);
      return next;
    });
  }, []);

  // ── Derived Data ────────────────────────────────────────
  const totalHoldingsValue = Object.entries(holdings).reduce(
    (acc, [sym, amt]) => acc + amt * (prices[sym] || 0), 0
  );
  const totalValue = walletBalance + totalHoldingsValue;

  const highThreatCount = analyses.filter((a) => a.threat_level >= 8).length;
  const lethalCount = analyses.filter((a) => a.sentiment === 'LETHAL').length;

  // Active chart symbol (the one most under threat, or BTC default)
  const [activeChartSymbol, setActiveChartSymbol] = useState('BTC');

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-gray-500 font-mono text-sm">LOADING PROFILE...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white font-mono">
      {/* ═══════ HEADER ═══════ */}
      <header className="border-b-4 border-white bg-black sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter text-white">
              ☕ GEISHA GAINS
            </h1>
            <span className="text-[10px] font-bold border-2 border-white px-2 py-0.5 text-white hidden md:inline-block">
              WAR ROOM
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Threat Counter */}
            {highThreatCount > 0 && (
              <motion.div
                className="bg-[#FF0000] text-white px-3 py-1 text-xs font-bold"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              >
                {highThreatCount} HIGH THREAT{highThreatCount > 1 ? 'S' : ''}
              </motion.div>
            )}

            {/* Scan Status */}
            <div className="border-2 border-white px-3 py-1 flex items-center gap-2">
              <motion.div
                className={`w-2 h-2 ${isLoading ? 'bg-[#FF0000]' : 'bg-green-400'}`}
                animate={isLoading ? { scale: [1, 1.4, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.3 }}
              />
              <span className="text-[10px] font-bold text-gray-300">{scanCount} SCANS</span>
            </div>

            {/* Profile Badge */}
            <div className="hidden md:flex items-center gap-1">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 border ${
                profile.risk_tolerance === 'AGGRESSIVE' ? 'border-[#FF0000] text-[#FF0000]' :
                profile.risk_tolerance === 'MODERATE' ? 'border-[#D4AF37] text-[#D4AF37]' :
                'border-gray-500 text-gray-400'
              }`}>
                {profile.risk_tolerance}
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 border ${
                profile.geopolitical_sensitivity === 'PARANOID' ? 'border-[#FF0000] text-[#FF0000]' :
                'border-gray-600 text-gray-500'
              }`}>
                {profile.geopolitical_sensitivity}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════ MAIN GRID ═══════ */}
      <main className="max-w-[1600px] mx-auto p-4 space-y-4">
        {/* ── Row 1: Portfolio Summary Bar ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="PORTFOLIO VALUE" value={`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          <StatCard label="CASH (USDT)" value={`$${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          <StatCard label="THREAT LEVEL" value={highThreatCount > 0 ? `${highThreatCount} HIGH` : 'CLEAR'} alert={highThreatCount > 0} />
          <StatCard label="LETHAL EVENTS" value={lethalCount > 0 ? `${lethalCount} ACTIVE` : 'NONE'} alert={lethalCount > 0} />
        </div>

        {/* ── Row 2: Price Chart + Threat Radar ── */}
        <div className="grid grid-cols-12 gap-4">
          {/* Price Chart Area */}
          <div className="col-span-12 lg:col-span-8">
            <div className="border-4 border-white bg-black">
              {/* Chart Header — Symbol Tabs */}
              <div className="border-b-4 border-white flex">
                {['BTC', 'ETH', 'XRP'].map((sym) => (
                  <button
                    key={sym}
                    onClick={() => setActiveChartSymbol(sym)}
                    className={`flex-1 border-r-2 border-gray-800 last:border-r-0 px-4 py-3 transition-colors ${
                      activeChartSymbol === sym ? 'bg-white text-black' : 'bg-black text-white hover:bg-gray-900'
                    }`}
                  >
                    <div className="text-sm font-bold">{sym}</div>
                    <div className="text-lg font-bold">
                      ${(prices[sym] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {holdings[sym] && (
                      <div className="text-[10px] text-gray-500">
                        HOLD: {holdings[sym]?.toFixed(6)}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* SVG Price Chart */}
              <div className="relative h-[300px] p-4">
                <PriceChartSVG
                  history={priceHistories[activeChartSymbol] || []}
                  symbol={activeChartSymbol}
                />
                <FatalEventLine events={fatalEvents} />
              </div>
            </div>
          </div>

          {/* Threat Radar */}
          <div className="col-span-12 lg:col-span-4">
            <ThreatRadar
              analyses={analyses}
              sensitivity={profile.geopolitical_sensitivity}
              holdings={holdings}
            />
          </div>
        </div>

        {/* ── Row 3: News Bulletin + Article Detail + Holdings ── */}
        <div className="grid grid-cols-12 gap-4">
          {/* The Bulletin */}
          <div className="col-span-12 lg:col-span-5 max-h-[600px]">
            <TheBulletin
              analyses={analyses}
              onSelectArticle={setSelectedArticle}
              selectedId={selectedArticle?.id}
            />
          </div>

          {/* Article Detail */}
          <div className="col-span-12 lg:col-span-4">
            <ArticleDetail article={selectedArticle} profile={profile} />
          </div>

          {/* Holdings / Wallet */}
          <div className="col-span-12 lg:col-span-3">
            <HoldingsPanel
              holdings={holdings}
              prices={prices}
              walletBalance={walletBalance}
              analyses={analyses}
            />
          </div>
        </div>

        {/* ── Row 4: Trade Log ── */}
        <div className="border-4 border-white bg-black">
          <div className="border-b-4 border-white px-4 py-2 flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-widest">TRADE LOG</h2>
            <span className="text-[10px] text-gray-500">{trades.length} TRADES</span>
          </div>
          {trades.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-600 text-sm">
              NO TRADES EXECUTED — USE QUICK SELL ON LETHAL ALERTS
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-gray-800 text-[10px] font-bold uppercase text-gray-500">
                    <th className="px-4 py-2">TIME</th>
                    <th className="px-2 py-2">SIDE</th>
                    <th className="px-2 py-2">ASSET</th>
                    <th className="px-2 py-2 text-right">AMOUNT</th>
                    <th className="px-2 py-2 text-right">PRICE</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => (
                    <motion.tr
                      key={`${t.ts}-${i}`}
                      className="border-b border-gray-800 hover:bg-gray-900"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <td className="px-4 py-2 text-[10px] text-gray-500">
                        {new Date(t.ts).toLocaleTimeString()}
                      </td>
                      <td className="px-2 py-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 ${
                          t.side === 'BUY' ? 'bg-white text-black' : 'bg-[#FF0000] text-white'
                        }`}>
                          {t.side}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-bold text-sm">{t.symbol}</td>
                      <td className="px-2 py-2 text-right text-sm">{t.amount.toFixed(6)}</td>
                      <td className="px-2 py-2 text-right text-sm font-bold">
                        ${t.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t-4 border-white bg-black mt-8">
        <div className="max-w-[1600px] mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase text-gray-500">
            COFFEE DRIVEN DEVELOPMENT • BUGSBYTE 2026
          </span>
          <span className="text-[10px] uppercase text-gray-600">
            NVIDIA NIM • UPHOLD • CRYPTOPANIC
          </span>
        </div>
      </footer>

      {/* ═══════ LETHAL OVERLAY ═══════ */}
      <ActionOverlay
        analyses={analyses}
        holdings={holdings}
        onQuickSell={handleQuickSell}
        onDismiss={handleDismissAlert}
        dismissedIds={dismissedAlerts}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function StatCard({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <motion.div
      className={`border-4 bg-black p-4 ${alert ? 'border-[#FF0000]' : 'border-white'}`}
      animate={alert ? { borderColor: ['#FF0000', '#CC0000', '#FF0000'] } : {}}
      transition={alert ? { repeat: Infinity, duration: 0.8 } : {}}
    >
      <div className="text-[10px] text-gray-500 font-bold tracking-widest mb-1">{label}</div>
      <div className={`text-lg font-bold ${alert ? 'text-[#FF0000]' : 'text-white'}`}>{value}</div>
    </motion.div>
  );
}

// ── Inline SVG Price Chart ────────────────────────────────
function PriceChartSVG({ history, symbol }: { history: PricePoint[]; symbol: string }) {
  if (history.length < 2) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
        COLLECTING DATA FOR {symbol}...
      </div>
    );
  }

  const w = 700;
  const h = 250;
  const pad = 20;

  const prices = history.map((p) => p.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const points = history.map((p, i) => {
    const x = pad + (i / (history.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - (p.price - minP) / range) * (h - 2 * pad);
    return `${x},${y}`;
  });

  const lineStr = points.join(' ');
  const areaStr = `${pad},${h - pad} ${lineStr} ${pad + ((history.length - 1) / (history.length - 1)) * (w - 2 * pad)},${h - pad}`;

  const lastPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const isUp = lastPrice >= firstPrice;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {/* Grid */}
      {[0.25, 0.5, 0.75].map((pct) => {
        const y = pad + pct * (h - 2 * pad);
        return (
          <line key={pct} x1={pad} y1={y} x2={w - pad} y2={y} stroke="#222" strokeWidth={1} />
        );
      })}

      {/* Area fill */}
      <polygon points={areaStr} fill={isUp ? 'rgba(255,255,255,0.05)' : 'rgba(255,0,0,0.1)'} />

      {/* Price line */}
      <polyline
        points={lineStr}
        fill="none"
        stroke={isUp ? '#FFFFFF' : '#FF0000'}
        strokeWidth={2}
      />

      {/* Current price label */}
      <text
        x={w - pad - 5}
        y={pad + (1 - (lastPrice - minP) / range) * (h - 2 * pad) - 8}
        textAnchor="end"
        className="text-[10px] font-bold"
        fill={isUp ? '#FFFFFF' : '#FF0000'}
      >
        ${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </text>

      {/* Price range labels */}
      <text x={5} y={pad} className="text-[8px]" fill="#555">${maxP.toFixed(2)}</text>
      <text x={5} y={h - pad + 12} className="text-[8px]" fill="#555">${minP.toFixed(2)}</text>
    </svg>
  );
}

// ── Article Detail Panel ──────────────────────────────────
function ArticleDetail({ article, profile }: { article: NewsAnalysis | null; profile: RiskProfile }) {
  if (!article) {
    return (
      <div className="border-4 border-white bg-black h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-gray-600 text-4xl mb-4">◉</div>
          <p className="text-gray-600 text-sm">SELECT AN ARTICLE FROM THE BULLETIN</p>
        </div>
      </div>
    );
  }

  const isLethal = article.sentiment === 'LETHAL';
  const isSell = article.action === 'SELL';

  return (
    <motion.div
      className={`border-4 bg-black h-full flex flex-col ${
        isLethal ? 'border-[#FF0000]' : isSell ? 'border-[#FF6666]' : 'border-white'
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={article.id}
    >
      {/* Header */}
      <div className="border-b-4 border-white px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-bold text-white">INTEL REPORT</span>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 ${
            article.sentiment === 'LETHAL' ? 'bg-[#FF0000] text-white' :
            article.sentiment === 'BEARISH' ? 'bg-[#FF6666] text-white' :
            'bg-green-600 text-white'
          }`}>
            {article.sentiment}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Headline */}
        <h3 className={`text-lg font-bold leading-tight ${isLethal ? 'text-[#FF0000]' : 'text-white'}`}>
          {article.original.headline}
        </h3>

        {/* Scores Grid */}
        <div className="grid grid-cols-2 gap-2">
          <ScoreMeter label="GLOBAL SCORE" value={article.global_score} max={10} />
          <ScoreMeter label="PORTFOLIO THREAT" value={article.portfolio_threat} max={10} danger />
        </div>

        {/* Full Content */}
        <div className="border-2 border-gray-800 p-3">
          <p className="text-xs text-gray-400 leading-relaxed">{article.original.full_content}</p>
        </div>

        {/* AI Reasoning */}
        <div className="border-2 border-[#FF0000] p-3 bg-[#1a0000]">
          <div className="text-[10px] text-[#FF0000] font-bold mb-1">AI REASONING</div>
          <p className="text-sm font-bold text-white">{article.reasoning}</p>
        </div>

        {/* Action */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500 font-bold">RECOMMENDED ACTION:</span>
          <span className={`text-sm font-bold px-3 py-1 border-2 ${
            article.action === 'SELL' ? 'border-[#FF0000] text-[#FF0000]' :
            article.action === 'BUY' ? 'border-white text-white' :
            article.action === 'REBALANCE' ? 'border-[#D4AF37] text-[#D4AF37]' :
            'border-gray-600 text-gray-400'
          }`}>
            {article.action}
          </span>
        </div>

        {/* Affected Assets */}
        <div>
          <div className="text-[10px] text-gray-500 font-bold mb-2">AFFECTED ASSETS</div>
          <div className="flex gap-2 flex-wrap">
            {article.affected_assets.map((sym) => (
              <span key={sym} className="text-xs font-bold px-2 py-1 border-2 border-white text-white">
                {sym}
              </span>
            ))}
          </div>
        </div>

        {/* Source */}
        <div className="text-[10px] text-gray-600">
          SOURCE: {article.original.source} • {article.original.category} •{' '}
          {new Date(article.timestamp).toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
}

function ScoreMeter({ label, value, max, danger = false }: { label: string; value: number; max: number; danger?: boolean }) {
  const pct = (value / max) * 100;
  const isHigh = value >= 7;

  return (
    <div className="border-2 border-gray-800 p-2">
      <div className="text-[9px] text-gray-500 font-bold mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div className={`text-xl font-bold ${danger && isHigh ? 'text-[#FF0000]' : 'text-white'}`}>
          {value}
        </div>
        <div className="flex-1 h-2 bg-gray-900">
          <motion.div
            className={`h-full ${danger && isHigh ? 'bg-[#FF0000]' : pct > 70 ? 'bg-[#D4AF37]' : 'bg-white'}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[9px] text-gray-600">/{max}</span>
      </div>
    </div>
  );
}

// ── Holdings Panel ────────────────────────────────────────
function HoldingsPanel({
  holdings,
  prices,
  walletBalance,
  analyses,
}: {
  holdings: Record<string, number>;
  prices: Record<string, number>;
  walletBalance: number;
  analyses: NewsAnalysis[];
}) {
  // Determine which held assets are under threat
  const threatenedSymbols = new Set<string>();
  analyses.forEach((a) => {
    if (a.threat_level >= 7 && (a.sentiment === 'BEARISH' || a.sentiment === 'LETHAL')) {
      a.affected_assets.forEach((sym) => {
        if (holdings[sym] && holdings[sym] > 0) threatenedSymbols.add(sym);
      });
    }
  });

  const entries = Object.entries(holdings).filter(([, amt]) => amt > 0);

  return (
    <div className="border-4 border-white bg-black h-full flex flex-col">
      <div className="border-b-4 border-white px-4 py-2">
        <h2 className="text-sm font-bold tracking-widest text-white">HOLDINGS</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Cash */}
        <div className="border-b-2 border-gray-800 px-4 py-3">
          <div className="text-[10px] text-gray-500 font-bold">USDT BALANCE</div>
          <div className="text-lg font-bold text-white">
            ${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Holdings */}
        {entries.map(([sym, amt]) => {
          const price = prices[sym] || 0;
          const value = amt * price;
          const isThreatened = threatenedSymbols.has(sym);

          return (
            <motion.div
              key={sym}
              className={`border-b-2 px-4 py-3 ${
                isThreatened ? 'border-[#FF0000] bg-[#1a0000]' : 'border-gray-800'
              }`}
              animate={isThreatened ? { borderColor: ['#FF0000', '#660000', '#FF0000'] } : {}}
              transition={isThreatened ? { repeat: Infinity, duration: 0.8 } : {}}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{sym}</span>
                  {isThreatened && (
                    <motion.span
                      className="text-[9px] bg-[#FF0000] text-white px-1 py-0.5 font-bold"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                    >
                      AT RISK
                    </motion.span>
                  )}
                </div>
                <span className="text-sm font-bold">${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-500">{amt.toFixed(6)} {sym}</span>
                <span className="text-[10px] text-gray-500">
                  @ ${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </motion.div>
          );
        })}

        {entries.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-600 text-sm">
            NO HOLDINGS
          </div>
        )}
      </div>
    </div>
  );
}
