// Pure helpers for turning Claude web-search responses into verifiable evidence.
// Nothing here calls an API, so it is easy to unit test.
import type { BetaContentBlock } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { Listing, Observation, Price } from "@/lib/research/types";
import type { ExtractedListings } from "./schemas";

export interface WebSearchHit {
  url: string;
  title: string;
  pageAge: string | null;
}

/** A verbatim excerpt from a web page, as returned in a Claude citation. */
export interface WebExcerpt {
  number: number;
  url: string;
  title: string | null;
  text: string;
}

const MAX_SEARCH_HITS = 60;
const MAX_EXCERPTS = 80;

/**
 * Pull the raw evidence out of Claude's response:
 *  - search hits come from `web_search_tool_result` blocks (real search results)
 *  - excerpts come from citations on text blocks; `cited_text` is quoted
 *    verbatim from the source page by the API, not written by Claude.
 * Claude's own summary text is deliberately NOT kept as evidence.
 */
export function collectWebEvidence(blocks: BetaContentBlock[]): {
  hits: WebSearchHit[];
  excerpts: WebExcerpt[];
} {
  const hits = new Map<string, WebSearchHit>();
  const excerpts = new Map<string, WebExcerpt>();

  for (const block of blocks) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const result of block.content) {
        if (!hits.has(result.url)) {
          hits.set(result.url, { url: result.url, title: result.title, pageAge: result.page_age ?? null });
        }
      }
    }

    if (block.type === "text" && block.citations) {
      for (const citation of block.citations) {
        if (citation.type !== "web_search_result_location") continue;
        const text = citation.cited_text.trim();
        const key = `${citation.url}::${text}`;
        if (text && !excerpts.has(key)) {
          excerpts.set(key, { number: excerpts.size + 1, url: citation.url, title: citation.title, text });
        }
      }
    }
  }

  return {
    hits: [...hits.values()].slice(0, MAX_SEARCH_HITS),
    excerpts: [...excerpts.values()].slice(0, MAX_EXCERPTS),
  };
}

export function webEvidenceToObservations(
  hits: WebSearchHit[],
  excerpts: WebExcerpt[],
): Omit<Observation, "id">[] {
  return [
    ...excerpts.map((e) => ({
      provider: "claude_web_search" as const,
      kind: "cited_excerpt" as const,
      text: e.text,
      sourceUrl: e.url,
      sourceTitle: e.title,
    })),
    ...hits.map((h) => ({
      provider: "claude_web_search" as const,
      kind: "search_result" as const,
      text: h.pageAge ? `${h.title} (page age: ${h.pageAge})` : h.title,
      sourceUrl: h.url,
      sourceTitle: h.title,
    })),
  ];
}

// ---------------------------------------------------------------------------
// Verification of listings that Claude extracted from excerpts
// ---------------------------------------------------------------------------

/** Lowercase and collapse whitespace so small formatting differences don't matter. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function appearsIn(needle: string, haystack: string): boolean {
  return normalize(haystack).includes(normalize(needle));
}

/** Parse a price like "$24.99", "£1,299.00" or "24.99 USD". Returns null if unclear. */
export function parsePriceText(priceText: string): Price | null {
  const match = priceText.match(/\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?/);
  if (!match) return null;
  const amount = Number(match[0].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  let currency = "unknown";
  if (/USD|US\$/i.test(priceText)) currency = "USD";
  else if (/GBP|£/i.test(priceText)) currency = "GBP";
  else if (/EUR|€/i.test(priceText)) currency = "EUR";
  else if (/CAD|CA\$/i.test(priceText)) currency = "CAD";
  else if (/AUD|A\$/i.test(priceText)) currency = "AUD";
  // A bare "$" could be several currencies, so it stays "unknown".

  return { amount, currency, raw: priceText.trim() };
}

/**
 * Parse a review count like "1,234 reviews" or "(87)".
 * Abbreviated counts like "1.2k" are rejected because they are approximate.
 */
export function parseReviewCountText(text: string): number | null {
  const match = text.match(/\d[\d,.]*\s*[kKmM]?/);
  if (!match) return null;
  const token = match[0].trim();
  if (/[kKmM]$/.test(token) || token.includes(".")) return null;
  const value = Number(token.replace(/,/g, ""));
  return Number.isInteger(value) ? value : null;
}

export interface VerificationSummary {
  kept: Omit<Listing, "id">[];
  droppedCount: number;
  clearedValueCount: number;
}

/**
 * Keep only extracted listings whose values really appear in the cited excerpt.
 *  - the title must appear in the excerpt (or in the page title), otherwise the listing is dropped
 *  - a price or review count that isn't found verbatim is cleared to null ("Unavailable")
 */
export function verifyExtractedListings(
  extracted: ExtractedListings,
  excerpts: WebExcerpt[],
): VerificationSummary {
  const byNumber = new Map(excerpts.map((e) => [e.number, e]));
  const kept: Omit<Listing, "id">[] = [];
  const seen = new Set<string>();
  let droppedCount = 0;
  let clearedValueCount = 0;

  for (const item of extracted.listings) {
    const excerpt = byNumber.get(item.excerptNumber);
    const title = item.title.trim();
    const titleFound =
      excerpt !== undefined &&
      title.length >= 4 &&
      (appearsIn(title, excerpt.text) || (excerpt.title !== null && appearsIn(title, excerpt.title)));
    const dedupeKey = `${excerpt?.url}::${normalize(title)}`;

    if (!excerpt || !titleFound || seen.has(dedupeKey)) {
      droppedCount++;
      continue;
    }
    seen.add(dedupeKey);

    let price: Price | null = null;
    if (item.priceText) {
      price = appearsIn(item.priceText, excerpt.text) ? parsePriceText(item.priceText) : null;
      if (!price) clearedValueCount++;
    }

    let reviewCount: number | null = null;
    if (item.reviewCountText) {
      reviewCount = appearsIn(item.reviewCountText, excerpt.text)
        ? parseReviewCountText(item.reviewCountText)
        : null;
      if (reviewCount === null) clearedValueCount++;
    }

    kept.push({
      provider: "claude_web_search",
      title,
      url: excerpt.url,
      price,
      reviewCount,
      rating: null,
      favorites: null,
      tags: [],
      seller: excerpt.title,
      verification: "verified_in_source_text",
    });
  }

  return { kept, droppedCount, clearedValueCount };
}
