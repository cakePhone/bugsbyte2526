/**
 * News Analysis API Route
 * Geisha Gains • Coffee Driven Development
 *
 * Takes a NewsArticle + User RiskProfile + User Wallet Holdings
 * Feeds them into NVIDIA NIM (Llama-3) for brutalist financial analysis.
 * Returns: threat_level, action, sentiment, affected_assets, reasoning
 */

import { NextResponse } from 'next/server';
import type { NewsArticle } from '@/lib/newsService';
import { fetchLiveNews } from '@/lib/newsService';

export interface NewsAnalysis {
  id: string;
  headline: string;
  original: NewsArticle;
  global_score: number;        // 1-10
  portfolio_threat: number;    // 1-10
  sentiment: 'BULLISH' | 'BEARISH' | 'LETHAL';
  action: 'BUY' | 'SELL' | 'HODL' | 'REBALANCE';
  reasoning: string;
  affected_assets: string[];
  threat_level: number;        // same as portfolio_threat for convenience
  summary: string;
  timestamp: string;
}

interface AnalyzeRequest {
  riskProfile?: {
    risk_tolerance: string;
    investment_horizon: string;
    focus_sectors: string[];
    geopolitical_sensitivity: string;
  };
  holdings?: Record<string, number>;
}

// ── Main GET: fetch news + analyze all ─────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const riskTolerance = searchParams.get('risk_tolerance') || 'MODERATE';
    const sensitivity = searchParams.get('geopolitical_sensitivity') || 'AWARE';
    const focusSectors = searchParams.get('focus_sectors')?.split(',') || ['CRYPTO'];
    const holdings = searchParams.get('holdings') || '';

    const riskProfile = {
      risk_tolerance: riskTolerance,
      investment_horizon: searchParams.get('investment_horizon') || 'SWING',
      focus_sectors: focusSectors,
      geopolitical_sensitivity: sensitivity,
    };

    const holdingsMap: Record<string, number> = {};
    if (holdings) {
      holdings.split(',').forEach((h) => {
        const [sym, amt] = h.split(':');
        if (sym && amt) holdingsMap[sym] = parseFloat(amt);
      });
    }

    const news = await fetchLiveNews(8);
    const analyses: NewsAnalysis[] = [];

    for (const article of news) {
      const analysis = await analyzeArticle(article, riskProfile, holdingsMap);
      analyses.push(analysis);
    }

    // Sort by threat level descending
    analyses.sort((a, b) => b.threat_level - a.threat_level);

    return NextResponse.json({
      analyses,
      meta: {
        count: analyses.length,
        profile: riskProfile,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error('News analysis error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

// ── POST: analyze specific article ─────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { article, riskProfile, holdings } = body;

    if (!article) {
      return NextResponse.json({ error: 'Missing article' }, { status: 400 });
    }

    const analysis = await analyzeArticle(
      article,
      riskProfile || { risk_tolerance: 'MODERATE', investment_horizon: 'SWING', focus_sectors: ['CRYPTO'], geopolitical_sensitivity: 'AWARE' },
      holdings || {}
    );

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('News analysis error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

// ── NVIDIA NIM Analysis ─────────────────────────────────────

async function analyzeArticle(
  article: NewsArticle,
  riskProfile: AnalyzeRequest['riskProfile'],
  holdings: Record<string, number>
): Promise<NewsAnalysis> {
  const NIM_ENDPOINT = process.env.NVIDIA_NIM_ENDPOINT || '';
  const NIM_KEY = process.env.NVIDIA_API_KEY || '';

  if (NIM_ENDPOINT && NIM_KEY) {
    try {
      const holdingsStr = Object.entries(holdings)
        .map(([s, a]) => `${s}: ${a}`)
        .join(', ') || 'USDT: 10000';

      const systemPrompt = `You are a Cold, Brutalist Financial Analyst. Analyze this news article based on the user's specific Risk Profile and Holdings.
User Profile: { risk: '${riskProfile?.risk_tolerance}', horizon: '${riskProfile?.investment_horizon}', focus: ${JSON.stringify(riskProfile?.focus_sectors)}, sensitivity: '${riskProfile?.geopolitical_sensitivity}' }
Holdings: { ${holdingsStr} }
News: '${article.headline}'
Content: '${article.full_content}'
Task:
- Global Score (1-10): Importance to general market.
- Portfolio Threat (1-10): Specific danger to user's held assets.
- Sentiment: (BULLISH / BEARISH / LETHAL).
- Action: (BUY / SELL / HODL / REBALANCE).
- Reasoning: A single, uppercase sentence. Short and cold.
- Summary: A single, uppercase sentence summarizing the threat.
- Affected Assets: Array of ticker symbols affected.

Return ONLY valid JSON with this structure:
{"headline":"SHORT HEADLINE","global_score":7,"portfolio_threat":8,"sentiment":"BEARISH","action":"SELL","reasoning":"REGULATORS ARE HUNTING YOUR STABLES.","summary":"LIQUIDITY CRUNCH IMMINENT.","affected_assets":["BTC","ETH"]}`;

      const res = await fetch(NIM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${NIM_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta/llama-3-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analyze this article now. Return only JSON.` },
          ],
          temperature: 0.6,
          max_tokens: 400,
          stream: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || '';
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);

        return {
          id: article.id,
          headline: parsed.headline || article.headline,
          original: article,
          global_score: clamp(parsed.global_score, 1, 10),
          portfolio_threat: clamp(parsed.portfolio_threat, 1, 10),
          sentiment: parsed.sentiment || 'BEARISH',
          action: parsed.action || 'HODL',
          reasoning: parsed.reasoning || 'NO INTEL.',
          affected_assets: parsed.affected_assets || article.symbols,
          threat_level: clamp(parsed.portfolio_threat, 1, 10),
          summary: parsed.summary || parsed.reasoning || 'SITUATION UNCLEAR.',
          timestamp: article.timestamp,
        };
      }
    } catch (e) {
      console.error('NIM analysis failed for article, using mock:', e);
    }
  }

  // ── Mock analysis ─────────────────────────────────────
  return mockAnalyze(article, riskProfile, holdings);
}

function mockAnalyze(
  article: NewsArticle,
  riskProfile: AnalyzeRequest['riskProfile'],
  holdings: Record<string, number>
): NewsAnalysis {
  const isNegative = article.sentiment_hint === 'negative';
  const isPositive = article.sentiment_hint === 'positive';
  const isParanoid = riskProfile?.geopolitical_sensitivity === 'PARANOID';
  const isAggressive = riskProfile?.risk_tolerance === 'AGGRESSIVE';

  // Check if user holds affected assets
  const heldAffected = article.symbols.filter((s) => (holdings[s] || 0) > 0);
  const hasExposure = heldAffected.length > 0;

  // Determine scores
  let globalScore = 5;
  let portfolioThreat = 3;

  if (article.category === 'REGULATION') globalScore += 2;
  if (article.category === 'SECURITY') globalScore += 3;
  if (article.category === 'MACRO') globalScore += 1;
  if (isNegative) { globalScore += 1; portfolioThreat += 2; }
  if (isPositive) { globalScore -= 1; portfolioThreat -= 1; }
  if (hasExposure) portfolioThreat += 3;
  if (isParanoid) portfolioThreat += 1;

  globalScore = clamp(globalScore + Math.floor(Math.random() * 2), 1, 10);
  portfolioThreat = clamp(portfolioThreat + Math.floor(Math.random() * 2), 1, 10);

  // Determine sentiment
  let sentiment: NewsAnalysis['sentiment'] = 'BULLISH';
  if (isNegative && portfolioThreat > 7) sentiment = 'LETHAL';
  else if (isNegative) sentiment = 'BEARISH';

  // Determine action
  let action: NewsAnalysis['action'] = 'HODL';
  if (sentiment === 'LETHAL') action = 'SELL';
  else if (sentiment === 'BEARISH' && portfolioThreat > 6) action = hasExposure ? 'SELL' : 'REBALANCE';
  else if (sentiment === 'BULLISH' && isAggressive) action = 'BUY';
  else if (sentiment === 'BULLISH') action = 'HODL';

  // Reasoning
  const reasonings: Record<string, string[]> = {
    SELL: [
      'LIQUIDATE EXPOSED POSITIONS IMMEDIATELY.',
      'THE STORM IS HERE. EXIT NOW.',
      'YOUR PORTFOLIO IS IN THE BLAST RADIUS.',
      'EVERY SECOND OF INACTION IS A LOSS.',
    ],
    BUY: [
      'OPPORTUNITY DETECTED. LOAD UP.',
      'THE MARKET REWARDS THE BOLD.',
      'FAVORABLE CONDITIONS. EXECUTE.',
      'THIS IS YOUR WINDOW. TAKE IT.',
    ],
    HODL: [
      'HOLD STEADY. WAIT FOR CLARITY.',
      'NO ACTION REQUIRED. MAINTAIN POSITION.',
      'THE NOISE IS LOUD. YOUR POSITION IS FINE.',
      'PATIENCE IS THE SUPERIOR STRATEGY.',
    ],
    REBALANCE: [
      'SHIFT EXPOSURE TO SAFETY.',
      'REDISTRIBUTE. REDUCE CONCENTRATION RISK.',
      'REBALANCE NOW BEFORE THE WINDOW CLOSES.',
    ],
  };

  const reasoning = reasonings[action][Math.floor(Math.random() * reasonings[action].length)];
  const summary = isNegative
    ? `THREAT DETECTED: ${article.category}. ${article.symbols.join(', ')} AT RISK.`
    : `${article.category} EVENT: FAVORABLE FOR ${article.symbols.join(', ')}.`;

  return {
    id: article.id,
    headline: article.headline.length > 50 ? article.headline.slice(0, 50) + '...' : article.headline,
    original: article,
    global_score: globalScore,
    portfolio_threat: portfolioThreat,
    sentiment,
    action,
    reasoning,
    affected_assets: article.symbols,
    threat_level: portfolioThreat,
    summary,
    timestamp: article.timestamp,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
