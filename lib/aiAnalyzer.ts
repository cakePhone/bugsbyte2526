/**
 * Geisha Gains - AI Arbitrage Analyzer
 * "Spread Hunters" Engine - BugsByte 2026
 *
 * Polls primary price feed + 2 mock exchanges, feeds spreads into NVIDIA NIM (Llama-3),
 * and identifies the "Green Bean" — the exchange with the best price.
 */

import { fetchAllPrices } from "@/lib/uphold-api";

// ─── Types ───────────────────────────────────────────────────────────
export interface ExchangeQuote {
  exchange: string;
  symbol: string;
  ask: number;
  bid: number;
  spread: number; // ask – bid
  spreadPct: number; // spread / ask × 100
  timestamp: number;
}

export interface ArbitrageOpportunity {
  symbol: string;
  greenBean: ExchangeQuote; // best (lowest) ask
  worstAsk: ExchangeQuote; // highest ask
  potentialProfitPct: number; // (worstAsk - greenBean) / greenBean × 100
  allQuotes: ExchangeQuote[];
  aiVerdict: AIVerdict;
}

export interface AIVerdict {
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reasoning: string;
  bestExchange: string;
  riskLevel: "LOW_CAFFEINE" | "MEDIUM_CAFFEINE" | "HIGH_CAFFEINE";
  supportLevel: number;
  resistanceLevel: number;
}

export interface AnalyzerSnapshot {
  opportunities: ArbitrageOpportunity[];
  sentiment: { bulls: number; bears: number };
  timestamp: number;
}

// ─── Exchange Price Fetchers ─────────────────────────────────────────

const FALLBACK_SYMBOLS = ["BTC", "ETH", "XRP", "SOL", "ADA"];

/** Fetch from primary shared feed */
async function fetchUphold(symbol: string): Promise<ExchangeQuote> {
  try {
    const market = await fetchAllPrices([symbol]);
    const current = market.find((entry) => entry.symbol === symbol);
    const mid = Number(current?.price || 0);
    if (!Number.isFinite(mid) || mid <= 0)
      throw new Error("Feed price unavailable");

    const spread = Math.max(mid * 0.0003, 0.5);
    const ask = mid + spread;
    const bid = Math.max(0, mid - spread);

    return {
      exchange: "PRIMARY",
      symbol,
      ask,
      bid,
      spread: ask - bid,
      spreadPct: ((ask - bid) / ask) * 100,
      timestamp: Date.now(),
    };
  } catch {
    return mockQuote("PRIMARY", symbol);
  }
}

/** Mock exchange #2 — "BrewSwap" */
function fetchBrewSwap(symbol: string, upholdAsk: number): ExchangeQuote {
  const drift = (Math.random() - 0.4) * 0.008; // slight bias higher
  const ask = upholdAsk * (1 + drift);
  const bid = ask * (1 - 0.001 - Math.random() * 0.003);
  return {
    exchange: "BREWSWAP",
    symbol,
    ask: +ask.toFixed(2),
    bid: +bid.toFixed(2),
    spread: +(ask - bid).toFixed(2),
    spreadPct: +(((ask - bid) / ask) * 100).toFixed(4),
    timestamp: Date.now(),
  };
}

/** Mock exchange #3 — "RoastFi" */
function fetchRoastFi(symbol: string, upholdAsk: number): ExchangeQuote {
  const drift = (Math.random() - 0.6) * 0.006; // slight bias lower
  const ask = upholdAsk * (1 + drift);
  const bid = ask * (1 - 0.0015 - Math.random() * 0.002);
  return {
    exchange: "ROASTFI",
    symbol,
    ask: +ask.toFixed(2),
    bid: +bid.toFixed(2),
    spread: +(ask - bid).toFixed(2),
    spreadPct: +(((ask - bid) / ask) * 100).toFixed(4),
    timestamp: Date.now(),
  };
}

function mockQuote(exchange: string, symbol: string): ExchangeQuote {
  const base: Record<string, number> = { BTC: 95000, ETH: 3500, XRP: 2.5 };
  const p = (base[symbol] || 100) * (1 + (Math.random() - 0.5) * 0.01);
  const ask = +p.toFixed(2);
  const bid = +(p * 0.998).toFixed(2);
  return {
    exchange,
    symbol,
    ask,
    bid,
    spread: +(ask - bid).toFixed(2),
    spreadPct: +(((ask - bid) / ask) * 100).toFixed(4),
    timestamp: Date.now(),
  };
}

// ─── NVIDIA NIM AI Verdict ───────────────────────────────────────────

async function getAIVerdict(
  symbol: string,
  quotes: ExchangeQuote[],
): Promise<AIVerdict> {
  const NIM_ENDPOINT = process.env.NVIDIA_NIM_ENDPOINT || "";
  const NIM_KEY = process.env.NVIDIA_API_KEY || "";

  const sortedByAsk = [...quotes].sort((a, b) => a.ask - b.ask);
  const best = sortedByAsk[0];
  const worst = sortedByAsk[sortedByAsk.length - 1];
  const spreadPct = ((worst.ask - best.ask) / best.ask) * 100;

  // Calculate support / resistance from bid/ask range
  const allPrices = quotes.flatMap((q) => [q.ask, q.bid]);
  const support = Math.min(...allPrices);
  const resistance = Math.max(...allPrices);

  if (NIM_ENDPOINT && NIM_KEY) {
    try {
      const prompt = `Analyze this crypto arbitrage for ${symbol}:
${quotes.map((q) => `${q.exchange}: ask=$${q.ask} bid=$${q.bid} spread=${q.spreadPct.toFixed(4)}%`).join("\n")}
Best exchange: ${best.exchange} at $${best.ask}
Spread opportunity: ${spreadPct.toFixed(4)}%
Return JSON only: {"action":"BUY|SELL|HOLD","confidence":0-100,"reasoning":"...","bestExchange":"...","riskLevel":"LOW_CAFFEINE|MEDIUM_CAFFEINE|HIGH_CAFFEINE"}`;

      const res = await fetch(NIM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${NIM_KEY}`,
        },
        body: JSON.stringify({
          model: "meta/llama-3-70b-instruct",
          messages: [
            {
              role: "system",
              content:
                "You are a crypto arbitrage analyst. Return ONLY valid JSON.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.6,
          max_tokens: 300,
          stream: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || "";
        const cleaned = raw
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        const parsed = JSON.parse(cleaned);
        return {
          ...parsed,
          bestExchange: parsed.bestExchange || best.exchange,
          supportLevel: support,
          resistanceLevel: resistance,
        };
      }
    } catch (e) {
      console.error("NIM verdict failed, using mock:", e);
    }
  }

  // ── Mock verdict ──
  let action: "BUY" | "SELL" | "HOLD";
  let confidence: number;
  let reasoning: string;
  let riskLevel: "LOW_CAFFEINE" | "MEDIUM_CAFFEINE" | "HIGH_CAFFEINE";

  if (spreadPct > 0.3) {
    action = "BUY";
    confidence = 75 + Math.floor(Math.random() * 20);
    reasoning = `${spreadPct.toFixed(3)}% cross-exchange spread detected on ${best.exchange}. Execute buy on Green Bean, sell on ${worst.exchange}.`;
    riskLevel = "HIGH_CAFFEINE";
  } else if (spreadPct > 0.1) {
    action = "BUY";
    confidence = 55 + Math.floor(Math.random() * 20);
    reasoning = `Moderate ${spreadPct.toFixed(3)}% spread. ${best.exchange} offers best entry.`;
    riskLevel = "MEDIUM_CAFFEINE";
  } else {
    action = "HOLD";
    confidence = 40 + Math.floor(Math.random() * 15);
    reasoning = `Tight ${spreadPct.toFixed(3)}% spread. No clear arbitrage edge.`;
    riskLevel = "LOW_CAFFEINE";
  }

  return {
    action,
    confidence,
    reasoning,
    bestExchange: best.exchange,
    riskLevel,
    supportLevel: +support.toFixed(2),
    resistanceLevel: +resistance.toFixed(2),
  };
}

// ─── Sentiment Calculation ───────────────────────────────────────────

function calculateSentiment(opps: ArbitrageOpportunity[]): {
  bulls: number;
  bears: number;
} {
  let buySignals = 0;
  let sellSignals = 0;

  opps.forEach((o) => {
    if (o.aiVerdict.action === "BUY") buySignals += o.aiVerdict.confidence;
    else if (o.aiVerdict.action === "SELL")
      sellSignals += o.aiVerdict.confidence;
    else {
      buySignals += o.aiVerdict.confidence * 0.3;
      sellSignals += o.aiVerdict.confidence * 0.3;
    }
  });

  const total = buySignals + sellSignals || 1;
  // Add jitter for real-time feel
  const jitter = (Math.random() - 0.5) * 6;
  const bulls = Math.min(100, Math.max(0, (buySignals / total) * 100 + jitter));
  return { bulls: +bulls.toFixed(1), bears: +(100 - bulls).toFixed(1) };
}

// ─── Main Analyzer ───────────────────────────────────────────────────

export async function runArbitrageAnalysis(): Promise<AnalyzerSnapshot> {
  const opportunities: ArbitrageOpportunity[] = [];
  const symbols = FALLBACK_SYMBOLS;

  for (const symbol of symbols) {
    // 1) Poll all 3 exchanges
    const uphold = await fetchUphold(symbol);
    const brew = fetchBrewSwap(symbol, uphold.ask);
    const roast = fetchRoastFi(symbol, uphold.ask);
    const allQuotes = [uphold, brew, roast];

    // 2) Find green bean (lowest ask) and worst
    const sorted = [...allQuotes].sort((a, b) => a.ask - b.ask);
    const greenBean = sorted[0];
    const worstAsk = sorted[sorted.length - 1];
    const profitPct = ((worstAsk.ask - greenBean.ask) / greenBean.ask) * 100;

    // 3) AI verdict
    const aiVerdict = await getAIVerdict(symbol, allQuotes);

    opportunities.push({
      symbol,
      greenBean,
      worstAsk,
      potentialProfitPct: +profitPct.toFixed(4),
      allQuotes,
      aiVerdict,
    });
  }

  const sentiment = calculateSentiment(opportunities);

  return {
    opportunities,
    sentiment,
    timestamp: Date.now(),
  };
}
