// Google Shopping results via SerpApi (a paid search-results API).
// Docs: https://serpapi.com/google-shopping-api
//
// This is currently the only configured source that returns review counts and
// ratings. Note these are Google Shopping product ratings, which may combine
// reviews from several stores.
import { config } from "@/lib/config";
import type { ProviderOutput } from "@/lib/research/types";
import { fetchJson } from "./http";
import type { MarketResearchProvider } from "./types";

interface SerpApiShoppingResult {
  title: string;
  link?: string;
  product_link?: string;
  source?: string;
  price?: string;
  extracted_price?: number;
  rating?: number;
  reviews?: number;
}

export interface SerpApiShoppingResponse {
  error?: string;
  shopping_results?: SerpApiShoppingResult[];
}

const CURRENCY_SYMBOLS: Record<string, string> = { "£": "GBP", "€": "EUR", "¥": "JPY", "₹": "INR" };

/** Work out the currency from the displayed price. "$" is ambiguous, so we use the search country. */
export function detectCurrency(rawPrice: string, country: string): string {
  const trimmed = rawPrice.trim();
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (trimmed.startsWith(symbol)) return code;
  }
  if (trimmed.startsWith("$")) {
    const dollarCountries: Record<string, string> = { us: "USD", ca: "CAD", au: "AUD", nz: "NZD" };
    return dollarCountries[country] ?? "unknown";
  }
  return "unknown";
}

/** Turn SerpApi's raw response into Drop Lab's provider format. Exported for tests. */
export function normalizeSerpApiResponse(
  query: string,
  data: SerpApiShoppingResponse,
  country: string,
): ProviderOutput {
  const results = data.shopping_results ?? [];
  const listings = results.map((item) => ({
    provider: "serpapi_google_shopping" as const,
    title: item.title,
    url: item.product_link ?? item.link ?? null,
    price:
      typeof item.extracted_price === "number" && item.price
        ? { amount: item.extracted_price, currency: detectCurrency(item.price, country), raw: item.price }
        : null,
    reviewCount: typeof item.reviews === "number" ? item.reviews : null,
    rating: typeof item.rating === "number" ? item.rating : null,
    favorites: null,
    tags: [],
    seller: item.source ?? null,
    verification: "api" as const,
  }));

  return {
    query,
    listings,
    observations: [],
    totalResultsReported: null, // Google Shopping does not report a total count.
    notes: [
      `Showing ${listings.length} Google Shopping results (country: ${country}).`,
      "Review counts are Google Shopping product ratings and may combine several stores.",
      "Google Shopping does not report a total number of matching products.",
    ],
  };
}

export const serpApiGoogleShoppingProvider: MarketResearchProvider = {
  id: "serpapi_google_shopping",
  label: "Google Shopping (SerpApi)",
  description: "Google Shopping results: prices, star ratings, review counts and stores.",
  requiredEnvVars: ["SERPAPI_API_KEY"],

  isConfigured() {
    return config.serpapi.apiKey !== null;
  },

  async research(market) {
    const params = new URLSearchParams({
      engine: "google_shopping",
      q: market,
      gl: config.serpapi.country,
      hl: "en",
      api_key: config.serpapi.apiKey!,
    });
    const data = await fetchJson<SerpApiShoppingResponse>(`https://serpapi.com/search.json?${params}`, {
      providerLabel: "SerpApi",
    });
    if (data.error) {
      throw new Error(`SerpApi: ${data.error}`);
    }
    return normalizeSerpApiResponse(market, data, config.serpapi.country);
  },
};
