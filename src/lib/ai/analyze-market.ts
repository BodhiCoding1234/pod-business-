// Step 3: ask Claude to interpret the collected evidence.
import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { config } from "@/lib/config";
import type { Evidence } from "@/lib/research/evidence";
import type { ReportMetrics } from "@/lib/research/metrics";
import { checkAnalysisEvidence, type CheckedMarketAnalysis } from "./analysis-check";
import { assertUsableResponse, FALLBACK_BETA, getAnthropicClient } from "./client";
import { ANALYSIS_SYSTEM, buildAnalysisPrompt } from "./prompts";
import { MarketAnalysisSchema } from "./schemas";

/** Compact JSON view of the evidence. Missing values are spelled out as "unavailable". */
export function buildEvidenceJson(evidence: Evidence, metrics: ReportMetrics): string {
  const listings = evidence.listings.map((l) => ({
    id: l.id,
    source: l.provider,
    title: l.title,
    price: l.price ? l.price.raw : "unavailable",
    reviewCount: l.reviewCount ?? "unavailable",
    rating: l.rating ?? "unavailable",
    favorites: l.favorites ?? "unavailable",
    tags: l.tags.length > 0 ? l.tags.slice(0, 13) : undefined,
    seller: l.seller ?? undefined,
  }));
  const observations = evidence.observations.map((o) => ({
    id: o.id,
    source: o.provider,
    kind: o.kind,
    text: o.text,
    url: o.sourceUrl ?? undefined,
  }));
  return JSON.stringify({ listings, observations, metrics });
}

export interface AnalysisResult {
  analysis: CheckedMarketAnalysis;
  removedReferences: string[];
  /** The model that actually produced the answer (may differ if a fallback ran). */
  servedByModel: string;
}

export async function analyzeMarket(
  market: string,
  evidence: Evidence,
  metrics: ReportMetrics,
): Promise<AnalysisResult> {
  const client = getAnthropicClient();
  // Streaming avoids HTTP timeouts on long responses.
  const stream = client.beta.messages.stream({
    model: config.anthropic.model,
    max_tokens: 32000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: betaZodOutputFormat(MarketAnalysisSchema) },
    system: ANALYSIS_SYSTEM,
    messages: [{ role: "user", content: buildAnalysisPrompt(market, buildEvidenceJson(evidence, metrics)) }],
  });
  const message = await stream.finalMessage();
  assertUsableResponse(message, "Market analysis");
  if (!message.parsed_output) {
    throw new Error("Market analysis: Claude's response did not match the expected format.");
  }

  const checked = checkAnalysisEvidence(message.parsed_output, evidence);
  return { ...checked, servedByModel: message.model };
}
