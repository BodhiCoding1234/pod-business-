import type { ProviderId, ProviderOutput } from "@/lib/research/types";

/**
 * Every market data source implements this interface.
 *
 * To add a new source (e.g. Amazon, Redbubble, Google Trends):
 *   1. Create a file in this folder that implements MarketResearchProvider.
 *   2. Add it to the list in `registry.ts`.
 * Nothing else in the app needs to change.
 *
 * Rules for providers:
 *   - Return only data the source actually returned. Never invent values.
 *   - If a field isn't available from the source, set it to null.
 *   - Throw an Error with a helpful message if the request fails.
 */
export interface MarketResearchProvider {
  id: ProviderId;
  /** Name shown in the UI. */
  label: string;
  /** One-line description of what this source contributes. */
  description: string;
  /** Environment variables this provider needs (for the setup screen). */
  requiredEnvVars: string[];
  isConfigured(): boolean;
  research(market: string): Promise<ProviderOutput>;
}

/** Safe summary of a provider for the UI (no secrets). */
export interface ProviderInfo {
  id: ProviderId;
  label: string;
  description: string;
  requiredEnvVars: string[];
  configured: boolean;
}
