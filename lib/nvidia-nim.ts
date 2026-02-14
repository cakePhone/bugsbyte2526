/**
 * Geisha Gains - NVIDIA NIM Service
 * Coffee Driven Development - BugsByte 2026
 * 
 * Connects to NVIDIA NIM API (Llama-3) for market analysis
 */

interface MarketData {
  symbol: string;
  price: number;
  change24h?: number;
  volume24h?: number;
}

interface NIMAnalysisResult {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  reasoning: string;
  symbol: string;
}

/**
 * Analyzes market data using NVIDIA NIM (Llama-3)
 */
export async function analyzeMarketWithNIM(
  marketData: MarketData[]
): Promise<NIMAnalysisResult[]> {
  const NVIDIA_NIM_ENDPOINT = process.env.NVIDIA_NIM_ENDPOINT || '';
  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';

  if (!NVIDIA_NIM_ENDPOINT || !NVIDIA_API_KEY) {
    console.warn('NVIDIA NIM not configured, using mock analysis');
    return mockNIMAnalysis(marketData);
  }

  try {
    // Construct the prompt for Llama-3
    const prompt = buildMarketAnalysisPrompt(marketData);

    const response = await fetch(NVIDIA_NIM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta/llama-3-70b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are a high-frequency crypto trading analyst. Return ONLY valid JSON with no markdown formatting.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`NVIDIA NIM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse the JSON response from the LLM
    const parsedResults = parseNIMResponse(content, marketData);
    return parsedResults;
  } catch (error) {
    console.error('NVIDIA NIM analysis failed:', error);
    return mockNIMAnalysis(marketData);
  }
}

/**
 * Build a prompt for market analysis
 */
function buildMarketAnalysisPrompt(marketData: MarketData[]): string {
  const dataStr = marketData
    .map(
      (m) =>
        `${m.symbol}: $${m.price.toFixed(2)} (24h change: ${m.change24h?.toFixed(2) || 'N/A'}%)`
    )
    .join('\n');

  return `Analyze the following cryptocurrency market data:

${dataStr}

For each symbol, determine if we should BUY, SELL, or HOLD. Consider:
- Price momentum (24h change)
- Market volatility
- Overall crypto market sentiment

Return a JSON array with this exact structure (no markdown formatting):
[
  {
    "symbol": "BTC",
    "action": "BUY|SELL|HOLD",
    "confidence": 0-100,
    "reasoning": "Brief explanation"
  }
]

Return ONLY the JSON array, no additional text.`;
}

/**
 * Parse the NIM response into structured data
 */
function parseNIMResponse(
  content: string,
  marketData: MarketData[]
): NIMAnalysisResult[] {
  try {
    // Remove markdown code blocks if present
    const cleaned = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        symbol: item.symbol,
        action: item.action,
        confidence: Math.min(100, Math.max(0, item.confidence)),
        reasoning: item.reasoning || 'No reasoning provided',
      }));
    }
  } catch (error) {
    console.error('Failed to parse NIM response:', error);
  }

  return mockNIMAnalysis(marketData);
}

/**
 * Mock analysis for demo/fallback
 */
function mockNIMAnalysis(marketData: MarketData[]): NIMAnalysisResult[] {
  return marketData.map((data) => {
    const change = data.change24h || 0;
    
    let action: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;
    let reasoning: string;

    if (change > 5) {
      action = 'BUY';
      confidence = Math.min(95, 60 + Math.abs(change) * 5);
      reasoning = `Strong upward momentum (+${change.toFixed(2)}%). Market eagerness detected.`;
    } else if (change < -5) {
      action = 'SELL';
      confidence = Math.min(95, 60 + Math.abs(change) * 5);
      reasoning = `Significant downturn (${change.toFixed(2)}%). Risk mitigation advised.`;
    } else if (change > 2) {
      action = 'BUY';
      confidence = 65 + Math.random() * 15;
      reasoning = `Positive momentum (+${change.toFixed(2)}%). Moderate buy signal.`;
    } else if (change < -2) {
      action = 'SELL';
      confidence = 60 + Math.random() * 15;
      reasoning = `Downward trend (${change.toFixed(2)}%). Consider reducing exposure.`;
    } else {
      action = 'HOLD';
      confidence = 50 + Math.random() * 20;
      reasoning = `Minimal movement (${change.toFixed(2)}%). Awaiting stronger signals.`;
    }

    return {
      symbol: data.symbol,
      action,
      confidence: Math.floor(confidence),
      reasoning,
    };
  });
}

/**
 * Quick single-asset analysis
 */
export async function quickAnalyze(
  symbol: string,
  price: number,
  change24h: number
): Promise<NIMAnalysisResult> {
  const results = await analyzeMarketWithNIM([
    { symbol, price, change24h },
  ]);
  return results[0];
}

// ============================================================================
// V5 TACTICAL INTELLIGENCE — News Analysis & Asset Evaluation
// ============================================================================

export interface NewsAnalysisRequest {
  articleTitle: string;
  articleContent: string;
  relatedSymbol: string;
  userHoldings: string[];
  riskProfile: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
}

export interface NewsAnalysisResponse {
  impact: "HIGH" | "MEDIUM" | "LOW";
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  recommendation: string;
  affectedHoldings: string[];
  confidence: number;
  reasoning: string;
}

export interface AssetEvaluationRequest {
  symbol: string;
  currentPrice: number;
  entryPrice?: number;
  percentChange24h?: number;
  percentChange7d?: number;
  userRiskProfile: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  marketContext?: string;
}

export interface AssetEvaluationResponse {
  action: "BUY" | "SELL" | "HOLD" | "WATCH";
  confidence: number;
  priceTarget?: number;
  stopLoss?: number;
  reasoning: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  timeHorizon: "SHORT" | "MEDIUM" | "LONG";
}

/**
 * Analyze news article for market impact (V5 News Bureau)
 */
export async function analyzeNewsImpact(
  request: NewsAnalysisRequest,
): Promise<NewsAnalysisResponse> {
  const NVIDIA_NIM_ENDPOINT = process.env.NVIDIA_NIM_ENDPOINT || 'https://integrate.api.nvidia.com/v1/chat/completions';
  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';

  const systemPrompt = `You are a financial market analyst AI. Analyze news articles for trading impact.
Your response must be valid JSON with these exact fields:
- impact: "HIGH", "MEDIUM", or "LOW"
- sentiment: "BULLISH", "BEARISH", or "NEUTRAL"  
- recommendation: A brief tactical recommendation (max 100 chars)
- affectedHoldings: Array of symbols from user's holdings that may be affected
- confidence: Number 0-100
- reasoning: Brief explanation (max 200 chars)`;

  const userPrompt = `Analyze this news for a ${request.riskProfile} investor holding: ${request.userHoldings.join(", ")}

SYMBOL: ${request.relatedSymbol}
TITLE: ${request.articleTitle}
CONTENT: ${request.articleContent}

Return ONLY valid JSON, no markdown.`;

  if (!NVIDIA_API_KEY) {
    return mockNewsAnalysis(request);
  }

  try {
    const response = await fetch(NVIDIA_NIM_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`NVIDIA NIM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No valid JSON");

    const analysis = JSON.parse(jsonMatch[0]) as NewsAnalysisResponse;
    
    return {
      impact: ["HIGH", "MEDIUM", "LOW"].includes(analysis.impact) ? analysis.impact : "MEDIUM",
      sentiment: ["BULLISH", "BEARISH", "NEUTRAL"].includes(analysis.sentiment) ? analysis.sentiment : "NEUTRAL",
      recommendation: String(analysis.recommendation || "Monitor position.").slice(0, 150),
      affectedHoldings: Array.isArray(analysis.affectedHoldings) 
        ? analysis.affectedHoldings.filter((h) => request.userHoldings.includes(h))
        : [],
      confidence: Math.min(100, Math.max(0, Number(analysis.confidence) || 50)),
      reasoning: String(analysis.reasoning || "").slice(0, 300),
    };
  } catch (error) {
    console.error("News analysis failed:", error);
    return mockNewsAnalysis(request);
  }
}

/**
 * Mock news analysis fallback
 */
function mockNewsAnalysis(request: NewsAnalysisRequest): NewsAnalysisResponse {
  const titleLower = request.articleTitle.toLowerCase();
  const isPositive = titleLower.includes("recover") || titleLower.includes("rise") || titleLower.includes("below expectations");
  const isNegative = titleLower.includes("fall") || titleLower.includes("drop") || titleLower.includes("crash");
  const isBreaking = titleLower.includes("breaking") || titleLower.includes("alert");

  return {
    impact: isBreaking ? "HIGH" : "MEDIUM",
    sentiment: isPositive ? "BULLISH" : isNegative ? "BEARISH" : "NEUTRAL",
    recommendation: `Based on ${request.riskProfile} profile: ${
      isBreaking ? "MONITOR CLOSELY — potential volatility." : "Continue monitoring position."
    }`,
    affectedHoldings: request.userHoldings.filter(() => Math.random() > 0.5),
    confidence: Math.floor(60 + Math.random() * 30),
    reasoning: "Analysis based on headline sentiment and market context.",
  };
}

/**
 * Evaluate asset for PLAN feature (AI tactical advisor)
 */
export async function evaluateAsset(
  request: AssetEvaluationRequest,
): Promise<AssetEvaluationResponse> {
  const NVIDIA_NIM_ENDPOINT = process.env.NVIDIA_NIM_ENDPOINT || 'https://integrate.api.nvidia.com/v1/chat/completions';
  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';

  const systemPrompt = `You are a tactical trading advisor AI. Evaluate assets and provide actionable recommendations.
Your response must be valid JSON with these exact fields:
- action: "BUY", "SELL", "HOLD", or "WATCH"
- confidence: Number 0-100
- priceTarget: Target price (number or null)
- stopLoss: Stop loss price (number or null)
- reasoning: Brief explanation (max 200 chars)
- riskLevel: "LOW", "MEDIUM", or "HIGH"
- timeHorizon: "SHORT", "MEDIUM", or "LONG"`;

  const pnl = request.entryPrice 
    ? ((request.currentPrice - request.entryPrice) / request.entryPrice * 100).toFixed(2)
    : "N/A";

  const userPrompt = `Evaluate this asset for a ${request.userRiskProfile} investor:

SYMBOL: ${request.symbol}
CURRENT PRICE: $${request.currentPrice}
ENTRY PRICE: ${request.entryPrice ? `$${request.entryPrice}` : "N/A"}
UNREALIZED P/L: ${pnl}%
24H CHANGE: ${request.percentChange24h?.toFixed(2) || "N/A"}%
7D CHANGE: ${request.percentChange7d?.toFixed(2) || "N/A"}%
${request.marketContext ? `MARKET CONTEXT: ${request.marketContext}` : ""}

Return ONLY valid JSON, no markdown.`;

  if (!NVIDIA_API_KEY) {
    return mockAssetEvaluation(request);
  }

  try {
    const response = await fetch(NVIDIA_NIM_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No valid JSON");

    const evaluation = JSON.parse(jsonMatch[0]) as AssetEvaluationResponse;
    
    return {
      action: ["BUY", "SELL", "HOLD", "WATCH"].includes(evaluation.action) ? evaluation.action : "HOLD",
      confidence: Math.min(100, Math.max(0, Number(evaluation.confidence) || 50)),
      priceTarget: evaluation.priceTarget ? Number(evaluation.priceTarget) : undefined,
      stopLoss: evaluation.stopLoss ? Number(evaluation.stopLoss) : undefined,
      reasoning: String(evaluation.reasoning || "").slice(0, 300),
      riskLevel: ["LOW", "MEDIUM", "HIGH"].includes(evaluation.riskLevel) ? evaluation.riskLevel : "MEDIUM",
      timeHorizon: ["SHORT", "MEDIUM", "LONG"].includes(evaluation.timeHorizon) ? evaluation.timeHorizon : "MEDIUM",
    };
  } catch (error) {
    console.error("Asset evaluation failed:", error);
    return mockAssetEvaluation(request);
  }
}

/**
 * Mock asset evaluation fallback
 */
function mockAssetEvaluation(request: AssetEvaluationRequest): AssetEvaluationResponse {
  const pnlPercent = request.entryPrice 
    ? ((request.currentPrice - request.entryPrice) / request.entryPrice) * 100
    : 0;

  let action: "BUY" | "SELL" | "HOLD" | "WATCH" = "HOLD";
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";

  if (pnlPercent > 20) {
    action = request.userRiskProfile === "CONSERVATIVE" ? "SELL" : "HOLD";
    riskLevel = "LOW";
  } else if (pnlPercent < -15) {
    action = request.userRiskProfile === "AGGRESSIVE" ? "BUY" : "WATCH";
    riskLevel = "HIGH";
  }

  return {
    action,
    confidence: Math.floor(55 + Math.random() * 35),
    priceTarget: request.currentPrice * (1 + (Math.random() * 0.2)),
    stopLoss: request.currentPrice * (1 - (Math.random() * 0.1)),
    reasoning: `${request.userRiskProfile} profile analysis: ${pnlPercent > 0 ? "Position in profit" : "Position underwater"}. ${action} recommended.`,
    riskLevel,
    timeHorizon: request.userRiskProfile === "AGGRESSIVE" ? "SHORT" : "MEDIUM",
  };
}
