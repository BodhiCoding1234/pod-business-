import { describe, expect, it } from "vitest";
import { checkAnalysisEvidence } from "@/lib/ai/analysis-check";
import type { MarketAnalysis } from "@/lib/ai/schemas";
import { assignEvidenceIds } from "@/lib/research/evidence";
import { computeMetrics, keywords, median, phrases } from "@/lib/research/metrics";
import type { Listing, ProviderRunResult } from "@/lib/research/types";

// Test inputs only - not real market data.
function listing(overrides: Partial<Listing>): Listing {
  return {
    id: "L0",
    provider: "etsy",
    title: "Test title",
    url: null,
    price: null,
    reviewCount: null,
    rating: null,
    favorites: null,
    tags: [],
    seller: null,
    verification: "api",
    ...overrides,
  };
}

describe("metrics", () => {
  it("computes median for odd and even lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });

  it("only builds phrases from adjacent meaningful words", () => {
    expect(keywords("Funny Shirt for Dad 2024")).toEqual(["funny", "shirt", "dad"]);
    expect(phrases("Funny Shirt for Dad")).toEqual(["funny shirt"]);
  });

  it("groups price stats by provider and currency, and reports missing reviews", () => {
    const metrics = computeMetrics([
      listing({ price: { amount: 10, currency: "USD", raw: "10.00 USD" }, title: "Retro football shirt" }),
      listing({ price: { amount: 30, currency: "USD", raw: "30.00 USD" }, title: "Retro football tee" }),
      listing({ price: { amount: 20, currency: "GBP", raw: "20.00 GBP" }, title: "Vintage kit" }),
      listing({ provider: "ebay", title: "Retro football jersey" }),
    ]);
    expect(metrics.priceStats).toEqual([
      { provider: "etsy", currency: "USD", count: 2, min: 10, median: 20, max: 30 },
      { provider: "etsy", currency: "GBP", count: 1, min: 20, median: 20, max: 20 },
    ]);
    expect(metrics.reviewStats.find((s) => s.provider === "etsy")).toMatchObject({
      listingsWithReviewData: 0,
      median: null,
    });
    expect(metrics.topPhrases).toEqual([{ term: "retro football", listingCount: 3 }]);
  });
});

describe("evidence IDs", () => {
  it("numbers listings and observations across providers in order", () => {
    const result = (provider: "etsy" | "ebay", titles: string[]): ProviderRunResult => ({
      provider,
      label: provider,
      status: "ok",
      errorMessage: null,
      fetchedAt: "2026-01-01T00:00:00.000Z",
      output: {
        query: "q",
        listings: titles.map((title) => {
          const withoutId: Partial<Listing> = listing({ provider, title });
          delete withoutId.id;
          return withoutId as Omit<Listing, "id">;
        }),
        observations: [{ provider, kind: "result_count", text: "count", sourceUrl: null, sourceTitle: null }],
        totalResultsReported: 1,
        notes: [],
      },
    });
    const evidence = assignEvidenceIds([result("etsy", ["a", "b"]), result("ebay", ["c"])]);
    expect(evidence.listings.map((l) => `${l.id}:${l.title}`)).toEqual(["L1:a", "L2:b", "L3:c"]);
    expect(evidence.observations.map((o) => o.id)).toEqual(["O1", "O2"]);
  });
});

describe("checkAnalysisEvidence", () => {
  const evidence = { listings: [listing({ id: "L1" })], observations: [] };
  const item = (ids: string[]) => ({ name: "n", description: "d", evidenceIds: ids });
  const analysis: MarketAnalysis = {
    productCategory: "Apparel",
    customerTypes: [item(["L1", "L1", "L99"])],
    majorThemes: [],
    subNiches: [],
    competition: { summary: "", commonStyles: [], saturationSignals: [item(["O5"])] },
    opportunities: [
      {
        name: "Supported",
        targetCustomer: "t",
        evidence: [{ evidenceId: "L1", explanation: "e" }],
        competitionObservations: "",
        differentiationAngles: [],
        risks: [],
        assessment: "",
        confidence: "low",
        hypothesesToTest: [],
      },
      {
        name: "Unsupported",
        targetCustomer: "t",
        evidence: [{ evidenceId: "L42", explanation: "made up" }],
        competitionObservations: "",
        differentiationAngles: [],
        risks: [],
        assessment: "",
        confidence: "high",
        hypothesesToTest: [],
      },
    ],
    dataGaps: [],
  };

  it("removes references to evidence that doesn't exist and flags unsupported opportunities", () => {
    const { analysis: checked, removedReferences } = checkAnalysisEvidence(analysis, evidence);
    expect(checked.customerTypes[0].evidenceIds).toEqual(["L1"]);
    expect(checked.competition.saturationSignals[0].evidenceIds).toEqual([]);
    expect(checked.opportunities[0].unsupported).toBe(false);
    expect(checked.opportunities[1].unsupported).toBe(true);
    expect(checked.opportunities[1].evidence).toEqual([]);
    expect(removedReferences.sort()).toEqual(["L42", "L99", "O5"]);
  });
});
