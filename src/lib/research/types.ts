// Shared data types for a market research run.
//
// The most important idea in this file is the split between:
//   - OBSERVED data  (Listing, Observation)   -> came from an API or a cited web source
//   - COMPUTED data  (ReportMetrics)          -> deterministic math on observed data
//   - AI data        (MarketAnalysis)         -> Claude's interpretation, always labelled
//
// A value we could not verify is stored as `null` and shown as "Unavailable".
// Never fill a `null` with a guess.

export type ProviderId =
  | "etsy"
  | "ebay"
  | "serpapi_google_shopping"
  | "claude_web_search";

/** How we know a listing's data is real. */
export type ListingVerification =
  /** Returned directly by a marketplace/search API as structured data. */
  | "api"
  /** Extracted from a cited web excerpt, and the values were found verbatim in that excerpt. */
  | "verified_in_source_text";

export interface Price {
  amount: number;
  /** ISO currency code when known (e.g. "USD"), otherwise "unknown". */
  currency: string;
  /** The price exactly as the source displayed it, e.g. "$24.99". */
  raw: string;
}

/** A single product listing discovered by a provider. */
export interface Listing {
  /** Evidence ID like "L3", assigned when the report is assembled. */
  id: string;
  provider: ProviderId;
  title: string;
  url: string | null;
  price: Price | null;
  /** Product review count. null = the source does not provide it. */
  reviewCount: number | null;
  /** Average star rating. null = unavailable. */
  rating: number | null;
  /** Etsy "favorites" (people who saved the listing). null = unavailable. */
  favorites: number | null;
  tags: string[];
  seller: string | null;
  verification: ListingVerification;
}

export type ObservationKind =
  /** A page returned by a web search (title + URL). */
  | "search_result"
  /** A verbatim excerpt from a web page that Claude cited. */
  | "cited_excerpt"
  /** A total result count reported by a marketplace for the search query. */
  | "result_count";

/** A non-listing piece of evidence (search result, quote, result count). */
export interface Observation {
  /** Evidence ID like "O7", assigned when the report is assembled. */
  id: string;
  provider: ProviderId;
  kind: ObservationKind;
  text: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
}

/** What a provider returns before evidence IDs are assigned. */
export interface ProviderOutput {
  /** The exact query string sent to the provider. */
  query: string;
  listings: Omit<Listing, "id">[];
  observations: Omit<Observation, "id">[];
  /** Total number of results the marketplace said exist for the query. null = not reported. */
  totalResultsReported: number | null;
  /** Anything the user should know about this provider's data (limits, missing fields). */
  notes: string[];
}

export type ProviderStatus = "ok" | "error";

/** One provider's saved result for a research run. */
export interface ProviderRunResult {
  provider: ProviderId;
  label: string;
  status: ProviderStatus;
  errorMessage: string | null;
  output: ProviderOutput | null;
  fetchedAt: string;
}

export type RunStatus = "running" | "complete" | "failed";

export interface ResearchRun {
  id: string;
  market: string;
  status: RunStatus;
  /** Human readable progress message while running. */
  stage: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}
