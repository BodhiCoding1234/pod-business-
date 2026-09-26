// Deterministic statistics computed from observed listings.
// No AI is involved here - these numbers can be recalculated from the evidence.
import type { Listing, ProviderId } from "./types";

export interface PriceStats {
  provider: ProviderId;
  currency: string;
  count: number;
  min: number;
  median: number;
  max: number;
}

export interface ReviewStats {
  provider: ProviderId;
  listingsWithReviewData: number;
  listingsWithoutReviewData: number;
  median: number | null;
  max: number | null;
}

export interface TermStat {
  term: string;
  /** Number of listings this term appears in. */
  listingCount: number;
}

export interface ReportMetrics {
  totalListings: number;
  priceStats: PriceStats[];
  reviewStats: ReviewStats[];
  /** Most common single words in listing titles. */
  topKeywords: TermStat[];
  /** Most common two-word phrases in listing titles. */
  topPhrases: TermStat[];
  /** Most common marketplace tags (Etsy provides these). */
  topTags: TermStat[];
}

const STOP_WORDS = new Set(
  "a an and are as at be by for from has have in is it its of on or our that the this to with your you my me we i".split(
    " ",
  ),
);

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function isMeaningful(word: string): boolean {
  return word.length > 1 && !STOP_WORDS.has(word) && !/^\d+$/.test(word);
}

/** Split a title into lowercase words, keeping their original order. */
export function splitWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^[-']+|[-']+$/g, ""))
    .filter(Boolean);
}

/** Meaningful single words (no stop words or plain numbers). */
export function keywords(title: string): string[] {
  return splitWords(title).filter(isMeaningful);
}

/** Two-word phrases where both words are adjacent in the title and meaningful. */
export function phrases(title: string): string[] {
  const words = splitWords(title);
  const result: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    if (isMeaningful(words[i]) && isMeaningful(words[i + 1])) result.push(`${words[i]} ${words[i + 1]}`);
  }
  return result;
}

/** Count how many listings each term appears in (each listing counts once per term). */
function countTerms(termLists: string[][], limit: number): TermStat[] {
  const counts = new Map<string, number>();
  for (const terms of termLists) {
    for (const term of new Set(terms)) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2) // a term seen once isn't a pattern
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term, listingCount]) => ({ term, listingCount }));
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  return groups;
}

export function computeMetrics(listings: Listing[]): ReportMetrics {
  // Prices are only comparable within one source and one currency.
  const priced = listings.filter((l) => l.price !== null);
  const priceStats: PriceStats[] = [];
  for (const group of groupBy(priced, (l) => `${l.provider}|${l.price!.currency}`).values()) {
    const amounts = group.map((l) => l.price!.amount);
    priceStats.push({
      provider: group[0].provider,
      currency: group[0].price!.currency,
      count: amounts.length,
      min: Math.min(...amounts),
      median: median(amounts),
      max: Math.max(...amounts),
    });
  }

  const reviewStats: ReviewStats[] = [];
  for (const group of groupBy(listings, (l) => l.provider).values()) {
    const counts = group.map((l) => l.reviewCount).filter((c): c is number => c !== null);
    reviewStats.push({
      provider: group[0].provider,
      listingsWithReviewData: counts.length,
      listingsWithoutReviewData: group.length - counts.length,
      median: counts.length > 0 ? median(counts) : null,
      max: counts.length > 0 ? Math.max(...counts) : null,
    });
  }

  const titleWords = listings.map((l) => keywords(l.title));
  const titlePhrases = listings.map((l) => phrases(l.title));
  const tags = listings.map((l) => l.tags.map((t) => t.toLowerCase().trim()).filter(Boolean));

  return {
    totalListings: listings.length,
    priceStats,
    reviewStats,
    topKeywords: countTerms(titleWords, 25),
    topPhrases: countTerms(titlePhrases, 20),
    topTags: countTerms(tags, 25),
  };
}
