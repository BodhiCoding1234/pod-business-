// The list of all market research providers.
// To add a provider, import it and add it to ALL_PROVIDERS. Order here is the
// order data appears in reports.
import { claudeWebSearchProvider } from "./claude-web-search";
import { ebayProvider } from "./ebay";
import { etsyProvider } from "./etsy";
import { serpApiGoogleShoppingProvider } from "./serpapi-google-shopping";
import type { MarketResearchProvider, ProviderInfo } from "./types";

const ALL_PROVIDERS: MarketResearchProvider[] = [
  etsyProvider,
  ebayProvider,
  serpApiGoogleShoppingProvider,
  claudeWebSearchProvider,
];

export function getConfiguredProviders(): MarketResearchProvider[] {
  return ALL_PROVIDERS.filter((provider) => provider.isConfigured());
}

/** Provider list for the UI, without any secret values. */
export function getProviderInfo(): ProviderInfo[] {
  return ALL_PROVIDERS.map((provider) => ({
    id: provider.id,
    label: provider.label,
    description: provider.description,
    requiredEnvVars: provider.requiredEnvVars,
    configured: provider.isConfigured(),
  }));
}
