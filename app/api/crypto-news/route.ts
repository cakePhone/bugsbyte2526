/**
 * CRYPTO NEWS API ROUTE — V5 Tactical Intelligence
 *
 * Fetches real-time crypto news from https://cryptocurrency.cv
 * Free, no API key required, 200+ sources
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-memory cache for news
let newsCache: {
  data: TransformedArticle[] | null;
  timestamp: number;
  category: string;
} = { data: null, timestamp: 0, category: "" };
const NEWS_CACHE_TTL_MS = 60_000; // 1 minute cache

// Response from the free crypto news API
interface CryptoNewsApiArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  timeAgo: string;
}

interface CryptoNewsApiResponse {
  articles: CryptoNewsApiArticle[];
  totalCount: number;
  fetchedAt: string;
}

// Our internal article format
interface TransformedArticle {
  id: string;
  timestamp: string;
  date: string;
  symbol: string;
  title: string;
  summary: string;
  fullContent?: string;
  tags: string[];
  sourceUrl: string;
  source: string;
}

// Extract crypto symbols from title/description
function extractSymbol(text: string): string {
  const symbolPatterns = [
    /\b(BTC|Bitcoin)\b/i,
    /\b(ETH|Ethereum)\b/i,
    /\b(SOL|Solana)\b/i,
    /\b(XRP|Ripple)\b/i,
    /\b(DOGE|Dogecoin)\b/i,
    /\b(ADA|Cardano)\b/i,
    /\b(DOT|Polkadot)\b/i,
    /\b(AVAX|Avalanche)\b/i,
    /\b(LINK|Chainlink)\b/i,
    /\b(MATIC|Polygon)\b/i,
    /\b(UNI|Uniswap)\b/i,
    /\b(AAVE)\b/i,
    /\b(LTC|Litecoin)\b/i,
    /\b(ATOM|Cosmos)\b/i,
    /\b(NEAR)\b/i,
    /\b(FTM|Fantom)\b/i,
    /\b(ARB|Arbitrum)\b/i,
    /\b(OP|Optimism)\b/i,
    /\b(USDT|Tether)\b/i,
    /\b(USDC)\b/i,
  ];

  for (const pattern of symbolPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Return the standard ticker symbol
      const found = match[1].toUpperCase();
      if (found === "BITCOIN") return "BTC";
      if (found === "ETHEREUM") return "ETH";
      if (found === "SOLANA") return "SOL";
      if (found === "RIPPLE") return "XRP";
      if (found === "DOGECOIN") return "DOGE";
      if (found === "CARDANO") return "ADA";
      if (found === "POLKADOT") return "DOT";
      if (found === "AVALANCHE") return "AVAX";
      if (found === "CHAINLINK") return "LINK";
      if (found === "POLYGON") return "MATIC";
      if (found === "UNISWAP") return "UNI";
      if (found === "LITECOIN") return "LTC";
      if (found === "COSMOS") return "ATOM";
      if (found === "FANTOM") return "FTM";
      if (found === "ARBITRUM") return "ARB";
      if (found === "OPTIMISM") return "OP";
      if (found === "TETHER") return "USDT";
      return found;
    }
  }

  return "CRYPTO";
}

// Generate tags from content and source
function generateTags(
  title: string,
  description: string,
  source: string,
): string[] {
  const tags: string[] = [];
  const text = `${title} ${description}`.toLowerCase();

  // Category tags based on content
  if (
    text.includes("defi") ||
    text.includes("swap") ||
    text.includes("yield") ||
    text.includes("liquidity")
  ) {
    tags.push("DEFI");
  }
  if (
    text.includes("nft") ||
    text.includes("opensea") ||
    text.includes("collectible")
  ) {
    tags.push("NFT");
  }
  if (text.includes("bitcoin") || text.includes("btc")) {
    tags.push("BITCOIN");
  }
  if (
    text.includes("ethereum") ||
    text.includes("eth") ||
    text.includes("layer 2") ||
    text.includes("l2")
  ) {
    tags.push("ETHEREUM");
  }
  if (
    text.includes("regulation") ||
    text.includes("sec") ||
    text.includes("law") ||
    text.includes("legal")
  ) {
    tags.push("REGULATION");
  }
  if (
    text.includes("etf") ||
    text.includes("institutional") ||
    text.includes("blackrock") ||
    text.includes("grayscale")
  ) {
    tags.push("INSTITUTIONAL");
  }
  if (
    text.includes("hack") ||
    text.includes("exploit") ||
    text.includes("breach") ||
    text.includes("security")
  ) {
    tags.push("SECURITY");
  }
  if (
    text.includes("price") ||
    text.includes("rally") ||
    text.includes("surge") ||
    text.includes("dump") ||
    text.includes("crash")
  ) {
    tags.push("MARKET");
  }
  if (
    text.includes("breaking") ||
    text.includes("🚨") ||
    text.includes("alert")
  ) {
    tags.push("BREAKING");
  }

  // Source tag
  tags.push("CRYPTO NEWS");

  // Limit to 4 tags
  return tags.slice(0, 4);
}

// Format date to "DD MONTH YYYY"
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const months = [
      "JANUARY",
      "FEBRUARY",
      "MARCH",
      "APRIL",
      "MAY",
      "JUNE",
      "JULY",
      "AUGUST",
      "SEPTEMBER",
      "OCTOBER",
      "NOVEMBER",
      "DECEMBER",
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return "TODAY";
  }
}

// Format time to "HH:MM"
function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return "--:--";
  }
}

// Generate unique ID from article
function generateId(article: CryptoNewsApiArticle): string {
  const hash = `${article.title}-${article.pubDate}`
    .split("")
    .reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
  return Math.abs(hash).toString(36);
}

// Transform API response to our format
function transformArticle(article: CryptoNewsApiArticle): TransformedArticle {
  const combined = `${article.title} ${article.description}`;

  return {
    id: generateId(article),
    timestamp: formatTime(article.pubDate),
    date: formatDate(article.pubDate),
    symbol: extractSymbol(combined),
    title: article.title,
    summary: article.description || article.title,
    fullContent: article.description,
    tags: generateTags(article.title, article.description, article.source),
    sourceUrl: article.link,
    source: article.source,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "20";
    const category = searchParams.get("category") || "all";

    // Check in-memory cache first
    const now = Date.now();
    if (
      newsCache.data &&
      newsCache.category === category &&
      now - newsCache.timestamp < NEWS_CACHE_TTL_MS
    ) {
      return NextResponse.json({
        success: true,
        articles: newsCache.data.slice(0, parseInt(limit)),
        totalCount: newsCache.data.length,
        fetchedAt: new Date(newsCache.timestamp).toISOString(),
        source: "cryptocurrency.cv (cached)",
      });
    }

    // Build API URL
    let apiUrl = `https://cryptocurrency.cv/api/news?limit=${limit}`;

    // Use specialized endpoints for categories
    if (category === "bitcoin") {
      apiUrl = `https://cryptocurrency.cv/api/bitcoin?limit=${limit}`;
    } else if (category === "defi") {
      apiUrl = `https://cryptocurrency.cv/api/defi?limit=${limit}`;
    } else if (category === "breaking") {
      apiUrl = `https://cryptocurrency.cv/api/breaking?limit=${limit}`;
    } else if (category === "trending") {
      apiUrl = `https://cryptocurrency.cv/api/trending?hours=24`;
    }

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "GeishaGains/1.0 WarRoom",
      },
      // Cache for 2 minutes
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data: CryptoNewsApiResponse = await response.json();

    // Transform articles to our format
    const transformedArticles = data.articles.map(transformArticle);

    // Update cache
    newsCache = {
      data: transformedArticles,
      timestamp: Date.now(),
      category,
    };

    return NextResponse.json({
      success: true,
      articles: transformedArticles,
      totalCount: data.totalCount || transformedArticles.length,
      fetchedAt: data.fetchedAt || new Date().toISOString(),
      source: "cryptocurrency.cv",
    });
  } catch (error) {
    console.error("[CRYPTO-NEWS] Error fetching news:", error);

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch news",
        articles: [],
      },
      { status: 500 },
    );
  }
}
