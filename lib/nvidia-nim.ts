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
