// The research pipeline:
//   1. collect data from every configured provider (in parallel)
//   2. save each provider's raw result
//   3. compute deterministic metrics
//   4. ask Claude to interpret the evidence (if configured)
import "server-only";
import { analyzeMarket } from "@/lib/ai/analyze-market";
import { describeAnthropicError } from "@/lib/ai/client";
import { isAnthropicConfigured } from "@/lib/config";
import {
  finishRun,
  getAnalysis,
  getProviderResults,
  getRun,
  saveAnalysis,
  saveProviderResult,
  updateRunStage,
} from "@/lib/db/repository";
import { getConfiguredProviders } from "@/lib/providers/registry";
import type { MarketResearchProvider } from "@/lib/providers/types";
import { assignEvidenceIds } from "./evidence";
import { computeMetrics } from "./metrics";
import type { ResearchReport } from "./report";
import type { ProviderRunResult } from "./types";

async function runProvider(provider: MarketResearchProvider, market: string): Promise<ProviderRunResult> {
  try {
    const output = await provider.research(market);
    return {
      provider: provider.id,
      label: provider.label,
      status: "ok",
      errorMessage: null,
      output,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      provider: provider.id,
      label: provider.label,
      status: "error",
      errorMessage: describeAnthropicError(error),
      output: null,
      fetchedAt: new Date().toISOString(),
    };
  }
}

export async function runResearch(runId: string, market: string): Promise<void> {
  try {
    const providers = getConfiguredProviders();
    updateRunStage(runId, `Collecting data from ${providers.map((p) => p.label).join(", ")}`);

    // Providers run at the same time; one failing doesn't stop the others.
    const results = await Promise.all(providers.map((provider) => runProvider(provider, market)));
    for (const result of results) {
      saveProviderResult(runId, result);
    }

    // Re-read from the database so evidence IDs match exactly what the report page will show.
    const evidence = assignEvidenceIds(getProviderResults(runId));
    if (evidence.listings.length === 0 && evidence.observations.length === 0) {
      saveAnalysis(runId, {
        status: "skipped",
        message: "No market data was collected, so there was nothing to analyse.",
        model: null,
        analysis: null,
        removedReferences: [],
      });
      finishRun(runId, "failed", "No provider returned any data. See the data source details below.");
      return;
    }

    if (!isAnthropicConfigured()) {
      saveAnalysis(runId, {
        status: "skipped",
        message: "ANTHROPIC_API_KEY is not set, so only observed data is shown.",
        model: null,
        analysis: null,
        removedReferences: [],
      });
      finishRun(runId, "complete");
      return;
    }

    updateRunStage(
      runId,
      `Claude is analysing ${evidence.listings.length} listings and ${evidence.observations.length} observations`,
    );
    try {
      const result = await analyzeMarket(market, evidence, computeMetrics(evidence.listings));
      saveAnalysis(runId, {
        status: "complete",
        message: null,
        model: result.servedByModel,
        analysis: result.analysis,
        removedReferences: result.removedReferences,
      });
    } catch (error) {
      saveAnalysis(runId, {
        status: "error",
        message: describeAnthropicError(error),
        model: null,
        analysis: null,
        removedReferences: [],
      });
    }
    finishRun(runId, "complete");
  } catch (error) {
    console.error(`Research run ${runId} failed`, error);
    finishRun(runId, "failed", error instanceof Error ? error.message : String(error));
  }
}

/** Assemble a full report from the database. Returns null if the run doesn't exist. */
export function loadReport(runId: string): ResearchReport | null {
  const run = getRun(runId);
  if (!run) return null;
  const providers = getProviderResults(runId);
  const evidence = assignEvidenceIds(providers);
  return {
    run,
    providers,
    evidence,
    metrics: computeMetrics(evidence.listings),
    analysis: getAnalysis(runId),
  };
}
