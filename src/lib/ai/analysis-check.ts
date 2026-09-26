// Checks Claude's analysis against the real evidence (pure logic, easy to test).
import type { Evidence } from "@/lib/research/evidence";
import type { MarketAnalysis } from "./schemas";

export type CheckedOpportunity = MarketAnalysis["opportunities"][number] & {
  /** True when none of the evidence IDs Claude cited actually exist. */
  unsupported: boolean;
};

export type CheckedMarketAnalysis = Omit<MarketAnalysis, "opportunities"> & {
  opportunities: CheckedOpportunity[];
};

/**
 * Remove any evidence ID that doesn't exist in the collected evidence, and
 * flag opportunities that are left with no real supporting evidence.
 */
export function checkAnalysisEvidence(
  analysis: MarketAnalysis,
  evidence: Evidence,
): { analysis: CheckedMarketAnalysis; removedReferences: string[] } {
  const validIds = new Set([
    ...evidence.listings.map((l) => l.id),
    ...evidence.observations.map((o) => o.id),
  ]);
  const removed = new Set<string>();

  // Keep only IDs that exist, without duplicates.
  const keepValid = (ids: string[]): string[] => {
    const kept = new Set<string>();
    for (const rawId of ids) {
      const id = rawId.trim();
      if (validIds.has(id)) kept.add(id);
      else removed.add(rawId);
    }
    return [...kept];
  };

  const cleanItems = <T extends { evidenceIds: string[] }>(items: T[]): T[] =>
    items.map((item) => ({ ...item, evidenceIds: keepValid(item.evidenceIds) }));

  const opportunities: CheckedOpportunity[] = analysis.opportunities.map((opportunity) => {
    const supportedEvidence = opportunity.evidence
      .filter((e) => keepValid([e.evidenceId]).length > 0)
      .map((e) => ({ ...e, evidenceId: e.evidenceId.trim() }));
    return { ...opportunity, evidence: supportedEvidence, unsupported: supportedEvidence.length === 0 };
  });

  return {
    analysis: {
      ...analysis,
      customerTypes: cleanItems(analysis.customerTypes),
      majorThemes: cleanItems(analysis.majorThemes),
      subNiches: cleanItems(analysis.subNiches),
      competition: {
        ...analysis.competition,
        commonStyles: cleanItems(analysis.competition.commonStyles),
        saturationSignals: cleanItems(analysis.competition.saturationSignals),
      },
      opportunities,
    },
    removedReferences: [...removed],
  };
}
