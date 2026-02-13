/**
 * News Ingestion Service
 * Geisha Gains • Coffee Driven Development
 *
 * Fetches live financial news from CryptoPanic API with robust mock fallback.
 * Returns: headline, full_content, source, timestamp, category, symbols
 */

export interface NewsArticle {
  id: string;
  headline: string;
  full_content: string;
  source: string;
  timestamp: string;
  url?: string;
  category: 'REGULATION' | 'MARKET' | 'TECH' | 'MACRO' | 'SECURITY' | 'ADOPTION';
  symbols: string[];
  sentiment_hint?: 'positive' | 'negative' | 'neutral';
}

// ── CryptoPanic API ─────────────────────────────────────────────

const CRYPTOPANIC_API = 'https://cryptopanic.com/api/v1/posts';

export async function fetchLiveNews(limit = 10): Promise<NewsArticle[]> {
  const apiKey = process.env.CRYPTOPANIC_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch(
        `${CRYPTOPANIC_API}/?auth_token=${apiKey}&kind=news&filter=important&currencies=BTC,ETH,XRP&public=true`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        return (data.results || []).slice(0, limit).map(mapCryptoPanicArticle);
      }
    } catch (e) {
      console.error('CryptoPanic fetch failed:', e);
    }
  }

  // Fallback to robust mock news
  return generateMockNews(limit);
}

function mapCryptoPanicArticle(item: any): NewsArticle {
  const symbols: string[] = (item.currencies || []).map((c: any) => c.code);
  let category: NewsArticle['category'] = 'MARKET';
  const title = (item.title || '').toUpperCase();

  if (title.includes('REGULAT') || title.includes('SEC') || title.includes('BAN')) {
    category = 'REGULATION';
  } else if (title.includes('HACK') || title.includes('EXPLOIT') || title.includes('BREACH')) {
    category = 'SECURITY';
  } else if (title.includes('FED') || title.includes('INFLATION') || title.includes('GDP')) {
    category = 'MACRO';
  } else if (title.includes('ADOPT') || title.includes('PARTNER') || title.includes('LAUNCH')) {
    category = 'ADOPTION';
  } else if (title.includes('UPGRADE') || title.includes('FORK') || title.includes('PROTOCOL')) {
    category = 'TECH';
  }

  return {
    id: String(item.id || Date.now()),
    headline: item.title || 'UNKNOWN HEADLINE',
    full_content: item.body || item.title || '',
    source: item.source?.title || 'CryptoPanic',
    timestamp: item.published_at || new Date().toISOString(),
    url: item.url,
    category,
    symbols: symbols.length > 0 ? symbols : ['BTC'],
    sentiment_hint: item.votes
      ? item.votes.positive > item.votes.negative
        ? 'positive'
        : item.votes.negative > item.votes.positive
        ? 'negative'
        : 'neutral'
      : 'neutral',
  };
}

// ── Mock News Generator ─────────────────────────────────────────

const MOCK_NEWS: Omit<NewsArticle, 'id' | 'timestamp'>[] = [
  {
    headline: 'EU ANNOUNCES SWEEPING STABLECOIN REGULATIONS — EXCHANGES SCRAMBLE',
    full_content:
      'The European Union has passed emergency legislation requiring all stablecoin issuers to maintain 1:1 reserves verified by central banks. Exchanges operating in the EU must comply within 90 days or face license revocation. Market analysts predict a significant liquidity crunch as USDT and USDC holders rush to de-risk their positions.',
    source: 'Reuters',
    category: 'REGULATION',
    symbols: ['BTC', 'ETH', 'USDT'],
    sentiment_hint: 'negative',
  },
  {
    headline: 'BITCOIN HASHRATE REACHES ALL-TIME HIGH AS MINING DIFFICULTY SURGES',
    full_content:
      'The Bitcoin network hashrate has surpassed 800 EH/s for the first time, driven by institutional mining operations expanding across Texas and the Nordic region. Mining difficulty adjustment is expected to increase by 8.3%, putting further pressure on less efficient mining operations. This is broadly seen as a bullish fundamental signal.',
    source: 'CoinDesk',
    category: 'TECH',
    symbols: ['BTC'],
    sentiment_hint: 'positive',
  },
  {
    headline: 'FEDERAL RESERVE SIGNALS EMERGENCY RATE CUT — MARKETS BRACE',
    full_content:
      'In an unscheduled press conference, the Federal Reserve Chair signaled an emergency 50bp rate cut may be imminent, citing deteriorating employment data. Treasury yields plummeted across the curve. Risk assets including crypto rallied sharply in after-hours trading. Traditional safe havens like gold also moved higher.',
    source: 'Bloomberg',
    category: 'MACRO',
    symbols: ['BTC', 'ETH', 'XRP'],
    sentiment_hint: 'positive',
  },
  {
    headline: 'MAJOR EXCHANGE SUFFERS $180M HOT WALLET BREACH',
    full_content:
      'A top-tier centralized exchange confirmed that its hot wallet was compromised overnight, resulting in the theft of approximately $180M in various cryptocurrencies. The exchange has halted withdrawals and is working with law enforcement. On-chain analysis indicates the stolen funds are being laundered through mixer protocols.',
    source: 'The Block',
    category: 'SECURITY',
    symbols: ['BTC', 'ETH'],
    sentiment_hint: 'negative',
  },
  {
    headline: 'BLACKROCK ETH ETF APPROVAL EXPECTED WITHIN DAYS',
    full_content:
      'Multiple sources within the SEC indicate that BlackRock\'s spot Ethereum ETF application is on the verge of approval. The fund would be the largest institutional vehicle for ETH exposure, with an initial seed capital of $2 billion. Trading could begin as early as next week.',
    source: 'CNBC',
    category: 'ADOPTION',
    symbols: ['ETH'],
    sentiment_hint: 'positive',
  },
  {
    headline: 'CHINA PBOC LAUNCHES DIGITAL YUAN TRADE SETTLEMENT PILOT',
    full_content:
      'The People\'s Bank of China has launched a digital yuan pilot program for international trade settlement, partnering with Brazil, Saudi Arabia, and South Africa. This move could significantly reduce demand for dollar-denominated stablecoins in cross-border transactions.',
    source: 'Financial Times',
    category: 'MACRO',
    symbols: ['BTC', 'USDT'],
    sentiment_hint: 'negative',
  },
  {
    headline: 'XRP WINS LANDMARK COURT RULING — TOKEN NOT A SECURITY',
    full_content:
      'A federal appeals court has upheld a lower court ruling that XRP is not a security when sold on secondary markets. Ripple Labs celebrated the victory as legal certainty that paves the way for institutional adoption of XRP for cross-border payment solutions.',
    source: 'Reuters',
    category: 'REGULATION',
    symbols: ['XRP'],
    sentiment_hint: 'positive',
  },
  {
    headline: 'ETHEREUM LAYER-2 CONGESTION SPIKES — GAS FEES HIT 200 GWEI',
    full_content:
      'A surge in meme coin activity on Ethereum Layer-2 rollups has caused base layer gas fees to spike to levels not seen since 2024. Average transaction costs exceeded $15, forcing DeFi users to delay non-urgent transactions. The congestion is expected to persist for 48 hours.',
    source: 'Delphi Digital',
    category: 'TECH',
    symbols: ['ETH'],
    sentiment_hint: 'negative',
  },
  {
    headline: 'SAUDI ARAMCO ANNOUNCES BTC TREASURY ALLOCATION — $500M INITIAL PURCHASE',
    full_content:
      'Saudi Aramco, the world\'s largest oil company, has disclosed a $500M Bitcoin allocation as part of a broader sovereign digital asset strategy. The purchase was executed OTC to minimize market impact. This marks the first major oil sector corporation to adopt BTC as a treasury reserve asset.',
    source: 'Bloomberg',
    category: 'ADOPTION',
    symbols: ['BTC'],
    sentiment_hint: 'positive',
  },
  {
    headline: 'GLOBAL CRYPTO TAX CRACKDOWN — G7 AGREES ON UNIFIED REPORTING FRAMEWORK',
    full_content:
      'The G7 nations have agreed to implement a unified cryptocurrency tax reporting framework effective Q1 2027. All exchanges will be required to report user transactions exceeding $600 annually. Privacy coins face potential delistings across regulated platforms.',
    source: 'Financial Times',
    category: 'REGULATION',
    symbols: ['BTC', 'ETH', 'XRP'],
    sentiment_hint: 'negative',
  },
];

function generateMockNews(limit: number): NewsArticle[] {
  const shuffled = [...MOCK_NEWS].sort(() => Math.random() - 0.5);
  const now = Date.now();

  return shuffled.slice(0, limit).map((article, i) => ({
    ...article,
    id: `mock-${now}-${i}`,
    timestamp: new Date(now - i * 15 * 60 * 1000).toISOString(), // Stagger by 15 min
  }));
}
