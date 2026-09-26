import type { CheckedMarketAnalysis } from "@/lib/ai/analysis-check";
import type { Evidence } from "./evidence";
import type { ReportMetrics } from "./metrics";
import type { ProviderRunResult, ResearchRun } from "./types";

export type AnalysisStatus = "complete" | "skipped" | "error";

/** Claude's (labelled) interpretation of a research run. */
export interface AnalysisRecord {
  status: AnalysisStatus;
  /** Why the analysis was skipped or failed. */
  message: string | null;
  model: string | null;
  analysis: CheckedMarketAnalysis | null;
  /** Evidence IDs Claude cited that did not exist and were removed. */
  removedReferences: string[];
  createdAt: string;
}

/** Everything the report page needs, assembled from the database. */
export interface ResearchReport {
  run: ResearchRun;
  providers: ProviderRunResult[];
  evidence: Evidence;
  metrics: ReportMetrics;
  analysis: AnalysisRecord | null;
}
