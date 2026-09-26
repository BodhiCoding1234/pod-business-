// Etsy Open API v3 - active listings search.
// Docs: https://developers.etsy.com/documentation/reference#operation/findAllListingsActive
//
// What Etsy gives us: title, price, tags, favorites, total result count.
// What Etsy does NOT give us per listing: review counts or sales. Those stay null.
import { config } from "@/lib/config";
import type { ProviderOutput } from "@/lib/research/types";
import { fetchJson } from "./http";
import type { MarketResearchProvider } from "./types";

const LISTING_LIMIT = 50;

interface EtsyMoney {
  amount: number;
  divisor: number;
  currency_code: string;
}

interface EtsyListing {
  listing_id: number;
  title: string;
  url?: string | null;
  price?: EtsyMoney | null;
  tags?: string[] | null;
  num_favorers?: number | null;
  shop_id?: number | null;
}

export interface EtsySearchResponse {
  count: number;
  results: EtsyListing[];
}

/** Turn Etsy's raw response into Drop Lab's provider format. Exported for tests. */
export function normalizeEtsyResponse(query: string, data: EtsySearchResponse): ProviderOutput {
  const listings = data.results.map((item) => ({
    provider: "etsy" as const,
    title: decodeHtmlEntities(item.title),
    url: item.url ?? `https://www.etsy.com/listing/${item.listing_id}`,
    price: item.price
      ? {
          amount: item.price.amount / item.price.divisor,
          currency: item.price.currency_code,
          raw: `${(item.price.amount / item.price.divisor).toFixed(2)} ${item.price.currency_code}`,
        }
      : null,
    reviewCount: null, // Etsy does not expose per-listing review counts in this endpoint.
    rating: null,
    favorites: item.num_favorers ?? null,
    tags: item.tags ?? [],
    seller: item.shop_id ? `Etsy shop #${item.shop_id}` : null,
    verification: "api" as const,
  }));

  return {
    query,
    listings,
    observations: [
      {
        provider: "etsy",
        kind: "result_count",
        text: `Etsy reported ${data.count.toLocaleString("en-US")} active listings matching "${query}".`,
        sourceUrl: `https://www.etsy.com/search?q=${encodeURIComponent(query)}`,
        sourceTitle: "Etsy Open API v3 - findAllListingsActive",
      },
    ],
    totalResultsReported: data.count,
    notes: [
      `Showing the top ${listings.length} listings by Etsy relevance.`,
      "Etsy's API does not provide per-listing review counts or sales numbers.",
      "The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.",
    ],
  };
}

// Etsy titles sometimes contain HTML entities like &quot; or &#39;.
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export const etsyProvider: MarketResearchProvider = {
  id: "etsy",
  label: "Etsy",
  description: "Active Etsy listings: titles, prices, tags, favorites and total result count.",
  requiredEnvVars: ["ETSY_API_KEY", "ETSY_SHARED_SECRET"],

  isConfigured() {
    return config.etsy.apiKey !== null;
  },

  async research(market) {
    const params = new URLSearchParams({
      keywords: market,
      limit: String(LISTING_LIMIT),
      sort_on: "score",
    });
    // Etsy expects "keystring:shared_secret" in x-api-key. If only the keystring
    // is provided we send it alone (older apps accepted that).
    const apiKeyHeader = config.etsy.sharedSecret
      ? `${config.etsy.apiKey}:${config.etsy.sharedSecret}`
      : config.etsy.apiKey!;

    const data = await fetchJson<EtsySearchResponse>(
      `https://openapi.etsy.com/v3/application/listings/active?${params}`,
      { providerLabel: "Etsy", headers: { "x-api-key": apiKeyHeader } },
    );
    return normalizeEtsyResponse(market, data);
  },
};
