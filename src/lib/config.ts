// All environment variables are read here, on the server only.
// The "server-only" import makes the build fail if a client component
// ever imports this file, so API keys can't leak into browser code.
import "server-only";

function readEnv(name: string): string | null {
  const value = process.env[name];
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export const config = {
  anthropic: {
    apiKey: readEnv("ANTHROPIC_API_KEY"),
    model: readEnv("ANTHROPIC_MODEL") ?? "claude-opus-5",
    /** Set ENABLE_WEB_SEARCH=false to stop Drop Lab using Claude's web search tool. */
    webSearchEnabled: readEnv("ENABLE_WEB_SEARCH") !== "false",
    /** Maximum web searches Claude may run per research request. */
    webSearchMaxUses: Number(readEnv("WEB_SEARCH_MAX_USES") ?? "8"),
  },
  etsy: {
    apiKey: readEnv("ETSY_API_KEY"),
    sharedSecret: readEnv("ETSY_SHARED_SECRET"),
  },
  ebay: {
    clientId: readEnv("EBAY_CLIENT_ID"),
    clientSecret: readEnv("EBAY_CLIENT_SECRET"),
    marketplaceId: readEnv("EBAY_MARKETPLACE_ID") ?? "EBAY_US",
  },
  serpapi: {
    apiKey: readEnv("SERPAPI_API_KEY"),
    /** Google country code for shopping results, e.g. "us", "uk". */
    country: readEnv("SERPAPI_COUNTRY") ?? "us",
  },
  database: {
    path: readEnv("DROP_LAB_DB_PATH") ?? "data/drop-lab.db",
  },
};

export function isAnthropicConfigured(): boolean {
  return config.anthropic.apiKey !== null;
}
