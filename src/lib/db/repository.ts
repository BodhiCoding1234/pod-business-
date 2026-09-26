// All SQL lives in this file. The rest of the app calls these functions.
import "server-only";
import type { AnalysisRecord, AnalysisStatus } from "@/lib/research/report";
import type { CheckedMarketAnalysis } from "@/lib/ai/analysis-check";
import type { ProviderOutput, ProviderRunResult, ResearchRun, RunStatus } from "@/lib/research/types";
import type { ProviderId } from "@/lib/research/types";
import { getDb } from "./client";

/** A run still "running" after this long was almost certainly interrupted (e.g. server restart). */
const STALE_RUN_MINUTES = 20;

interface RunRow {
  id: string;
  market: string;
  status: RunStatus;
  stage: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

function toRun(row: RunRow): ResearchRun {
  return {
    id: row.id,
    market: row.market,
    status: row.status,
    stage: row.stage,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function now(): string {
  return new Date().toISOString();
}

function failStaleRuns(): void {
  const cutoff = new Date(Date.now() - STALE_RUN_MINUTES * 60_000).toISOString();
  getDb()
    .prepare(
      `UPDATE research_runs
         SET status = 'failed', stage = NULL, completed_at = ?,
             error_message = 'Interrupted: this research did not finish (the server may have restarted).'
       WHERE status = 'running' AND created_at < ?`,
    )
    .run(now(), cutoff);
}

// ---- research_runs ----

export function createRun(id: string, market: string): void {
  getDb()
    .prepare(
      `INSERT INTO research_runs (id, market, status, stage, created_at)
       VALUES (?, ?, 'running', 'Starting research', ?)`,
    )
    .run(id, market, now());
}

export function updateRunStage(id: string, stage: string): void {
  getDb().prepare(`UPDATE research_runs SET stage = ? WHERE id = ?`).run(stage, id);
}

export function finishRun(id: string, status: "complete" | "failed", errorMessage: string | null = null): void {
  getDb()
    .prepare(
      `UPDATE research_runs SET status = ?, stage = NULL, error_message = ?, completed_at = ? WHERE id = ?`,
    )
    .run(status, errorMessage, now(), id);
}

export function getRun(id: string): ResearchRun | null {
  failStaleRuns();
  const row = getDb().prepare(`SELECT * FROM research_runs WHERE id = ?`).get(id) as RunRow | undefined;
  return row ? toRun(row) : null;
}

export function listRecentRuns(limit = 20): ResearchRun[] {
  failStaleRuns();
  const rows = getDb()
    .prepare(`SELECT * FROM research_runs ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as RunRow[];
  return rows.map(toRun);
}

// ---- provider_results ----

interface ProviderRow {
  provider: ProviderId;
  label: string;
  status: "ok" | "error";
  error_message: string | null;
  output_json: string | null;
  fetched_at: string;
}

export function saveProviderResult(runId: string, result: ProviderRunResult): void {
  getDb()
    .prepare(
      `INSERT INTO provider_results (run_id, provider, label, status, error_message, output_json, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      runId,
      result.provider,
      result.label,
      result.status,
      result.errorMessage,
      result.output ? JSON.stringify(result.output) : null,
      result.fetchedAt,
    );
}

/** Provider results in the order they were saved (this order defines evidence IDs). */
export function getProviderResults(runId: string): ProviderRunResult[] {
  const rows = getDb()
    .prepare(`SELECT * FROM provider_results WHERE run_id = ? ORDER BY id ASC`)
    .all(runId) as ProviderRow[];
  return rows.map((row) => ({
    provider: row.provider,
    label: row.label,
    status: row.status,
    errorMessage: row.error_message,
    output: row.output_json ? (JSON.parse(row.output_json) as ProviderOutput) : null,
    fetchedAt: row.fetched_at,
  }));
}

// ---- ai_analyses ----

interface AnalysisRow {
  status: AnalysisStatus;
  message: string | null;
  model: string | null;
  analysis_json: string | null;
  removed_refs_json: string | null;
  created_at: string;
}

export function saveAnalysis(
  runId: string,
  record: Omit<AnalysisRecord, "createdAt">,
): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO ai_analyses (run_id, status, message, model, analysis_json, removed_refs_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      runId,
      record.status,
      record.message,
      record.model,
      record.analysis ? JSON.stringify(record.analysis) : null,
      JSON.stringify(record.removedReferences),
      now(),
    );
}

export function getAnalysis(runId: string): AnalysisRecord | null {
  const row = getDb().prepare(`SELECT * FROM ai_analyses WHERE run_id = ?`).get(runId) as
    | AnalysisRow
    | undefined;
  if (!row) return null;
  return {
    status: row.status,
    message: row.message,
    model: row.model,
    analysis: row.analysis_json ? (JSON.parse(row.analysis_json) as CheckedMarketAnalysis) : null,
    removedReferences: row.removed_refs_json ? (JSON.parse(row.removed_refs_json) as string[]) : [],
    createdAt: row.created_at,
  };
}
