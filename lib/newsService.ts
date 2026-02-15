/**
 * News Ingestion Service
 * Geisha Gains • Coffee Driven Development
 *
 * Fetches live financial news from cryptocurrency.cv API.
 * Returns: headline, full_content, source, timestamp, category, symbols
 */

export interface NewsArticle {
  id: string;
  headline: string;
  full_content: string;
  source: string;
  timestamp: string;
  url?: string;
  category:
    | "REGULATION"
    | "MARKET"
    | "TECH"
    | "MACRO"
    | "SECURITY"
    | "ADOPTION";
  symbols: string[];
  sentiment_hint?: "positive" | "negative" | "neutral";
}

export interface FetchLiveNewsOptions {
  limit?: number;
  page?: number;
  perPage?: number;
  latestTimestamp?: string;
  knownIds?: string[];
}

// ── Live News Endpoints ──────────────────────────────────────────

const PRIMARY_NEWS_ENDPOINT = "https://cryptocurrency.cv/api/news";
const SECONDARY_NEWS_ENDPOINT =
  "https://min-api.cryptocompare.com/data/v2/news/?lang=EN";

function buildNewsEndpoints(): string[] {
  const configured = process.env.NEWS_API_URL;
  const endpoints = [
    configured,
    PRIMARY_NEWS_ENDPOINT,
    SECONDARY_NEWS_ENDPOINT,
  ].filter(Boolean) as string[];

  return Array.from(new Set(endpoints));
}

export async function fetchLiveNews(
  input: number | FetchLiveNewsOptions = 10,
): Promise<NewsArticle[]> {
  const options: FetchLiveNewsOptions =
    typeof input === "number" ? { limit: input } : input;

  const maxItems = Math.max(1, Math.min(100, Number(options.limit || 10)));
  const page = Math.max(1, Number(options.page || 1));
  const perPage = Math.max(
    10,
    Math.min(100, Number(options.perPage || maxItems)),
  );
  const latestMs = options.latestTimestamp
    ? new Date(options.latestTimestamp).getTime()
    : 0;
  const knownIdSet = new Set((options.knownIds || []).map((id) => String(id)));

  const endpoints = buildNewsEndpoints();

  // Race all endpoints in parallel - use the first successful response
  const fetchPromises = endpoints.map(async (endpoint) => {
    const url = endpoint.includes("cryptocurrency.cv")
      ? `${endpoint}?page=${page}&perPage=${perPage}`
      : endpoint;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`News API request failed (${res.status})`);
    }

    const data = await res.json();
    const items = normalizeNewsPayload(data);

    if (!items.length) {
      throw new Error("News payload contained zero items");
    }

    const mapped = items.map((item) => mapNewsArticle(item, endpoint));
    const filtered = mapped
      .filter((article) => !knownIdSet.has(article.id))
      .filter((article) => {
        if (!latestMs || !Number.isFinite(latestMs)) return true;
        const articleMs = new Date(article.timestamp).getTime();
        return Number.isFinite(articleMs) && articleMs > latestMs;
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

    return filtered.slice(0, maxItems);
  });

  try {
    // Use Promise.any to get the first successful response
    const result = await Promise.any(fetchPromises);
    return result;
  } catch (error) {
    // All endpoints failed
    console.error("All news providers failed:", error);
    throw new Error("Unable to fetch live news");
  }
}

function normalizeNewsPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.articles)) return data.articles;
  if (Array.isArray(data?.news)) return data.news;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function mapNewsArticle(item: any, endpoint: string): NewsArticle {
  const headline =
    item.title || item.headline || item.name || "UNKNOWN HEADLINE";
  const content =
    item.content || item.summary || item.description || item.body || headline;

  const extractedSymbols = extractSymbols([headline, content]);
  const rawSymbols =
    item.symbols ||
    item.tickers ||
    item.assets ||
    item.coins ||
    item.currencies;

  const symbols: string[] = Array.isArray(rawSymbols)
    ? rawSymbols
        .map((entry: any) =>
          typeof entry === "string"
            ? entry.toUpperCase()
            : String(entry?.code || entry?.symbol || "").toUpperCase(),
        )
        .filter(Boolean)
    : extractedSymbols;

  let category: NewsArticle["category"] = "MARKET";
  const title = headline.toUpperCase();

  if (
    title.includes("REGULAT") ||
    title.includes("SEC") ||
    title.includes("BAN")
  ) {
    category = "REGULATION";
  } else if (
    title.includes("HACK") ||
    title.includes("EXPLOIT") ||
    title.includes("BREACH")
  ) {
    category = "SECURITY";
  } else if (
    title.includes("FED") ||
    title.includes("INFLATION") ||
    title.includes("GDP")
  ) {
    category = "MACRO";
  } else if (
    title.includes("ADOPT") ||
    title.includes("PARTNER") ||
    title.includes("LAUNCH")
  ) {
    category = "ADOPTION";
  } else if (
    title.includes("UPGRADE") ||
    title.includes("FORK") ||
    title.includes("PROTOCOL")
  ) {
    category = "TECH";
  }

  return {
    id: String(
      item.id ||
        item.guid ||
        item.url ||
        item.link ||
        `${headline}-${Date.now()}`,
    ),
    headline,
    full_content: content,
    source:
      item.source?.title ||
      item.source ||
      item.publisher ||
      (endpoint.includes("cryptocompare")
        ? "cryptocompare"
        : "cryptocurrency.cv"),
    timestamp:
      item.published_at ||
      item.publishedAt ||
      item.timestamp ||
      item.date ||
      new Date().toISOString(),
    url: item.original_url || item.url || item.link,
    category,
    symbols: symbols.length > 0 ? symbols : ["BTC"],
    sentiment_hint:
      String(item.sentiment || "").toLowerCase() === "positive"
        ? "positive"
        : String(item.sentiment || "").toLowerCase() === "negative"
          ? "negative"
          : "neutral",
  };
}

function extractSymbols(chunks: string[]): string[] {
  const supported = ["BTC", "ETH", "XRP", "USDT", "SOL", "ADA", "DOGE", "LTC"];
  const text = chunks.join(" ").toUpperCase();
  return supported.filter((sym) => new RegExp(`\\b${sym}\\b`, "i").test(text));
}
