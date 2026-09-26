// eBay Browse API - item summary search.
// Docs: https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
//
// What eBay gives us: titles, prices, seller usernames, total result count.
// What eBay does NOT give us in search results: product review counts or units sold.
import { config } from "@/lib/config";
import type { ProviderOutput } from "@/lib/research/types";
import { fetchJson } from "./http";
import type { MarketResearchProvider } from "./types";

const LISTING_LIMIT = 50;

interface EbayItemSummary {
  itemId: string;
  title: string;
  itemWebUrl?: string;
  price?: { value: string; currency: string };
  seller?: { username?: string };
}

export interface EbaySearchResponse {
  total?: number;
  itemSummaries?: EbayItemSummary[];
}

/** Turn eBay's raw response into Drop Lab's provider format. Exported for tests. */
export function normalizeEbayResponse(query: string, data: EbaySearchResponse): ProviderOutput {
  const items = data.itemSummaries ?? [];
  const listings = items.map((item) => {
    const amount = item.price ? Number(item.price.value) : NaN;
    return {
      provider: "ebay" as const,
      title: item.title,
      url: item.itemWebUrl ?? null,
      price:
        item.price && Number.isFinite(amount)
          ? { amount, currency: item.price.currency, raw: `${item.price.value} ${item.price.currency}` }
          : null,
      reviewCount: null, // Not included in Browse API search results.
      rating: null,
      favorites: null,
      tags: [],
      seller: item.seller?.username ?? null,
      verification: "api" as const,
    };
  });

  const total = typeof data.total === "number" ? data.total : null;
  return {
    query,
    listings,
    observations:
      total === null
        ? []
        : [
            {
              provider: "ebay",
              kind: "result_count",
              text: `eBay reported ${total.toLocaleString("en-US")} listings matching "${query}".`,
              sourceUrl: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`,
              sourceTitle: "eBay Browse API - item_summary/search",
            },
          ],
    totalResultsReported: total,
    notes: [
      `Showing the top ${listings.length} listings by eBay best match.`,
      "eBay search results do not include product review counts or units sold.",
    ],
  };
}

// eBay app tokens last ~2 hours. Cache one in memory so we don't request it every time.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const credentials = Buffer.from(`${config.ebay.clientId}:${config.ebay.clientSecret}`).toString("base64");
  const data = await fetchJson<{ access_token: string; expires_in: number }>(
    "https://api.ebay.com/identity/v1/oauth2/token",
    {
      providerLabel: "eBay (OAuth)",
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "https://api.ebay.com/oauth/api_scope",
      }),
    },
  );
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export const ebayProvider: MarketResearchProvider = {
  id: "ebay",
  label: "eBay",
  description: "eBay listings: titles, prices, sellers and total result count.",
  requiredEnvVars: ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET"],

  isConfigured() {
    return config.ebay.clientId !== null && config.ebay.clientSecret !== null;
  },

  async research(market) {
    const token = await getAppToken();
    const params = new URLSearchParams({ q: market, limit: String(LISTING_LIMIT) });
    const data = await fetchJson<EbaySearchResponse>(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
      {
        providerLabel: "eBay",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": config.ebay.marketplaceId,
        },
      },
    );
    return normalizeEbayResponse(market, data);
  },
};
