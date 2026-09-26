// Database schema, as a list of migrations.
//
// SQLite stores the number of migrations already applied in `PRAGMA user_version`.
// To change the schema later (e.g. adding `product_concepts`, `designs`,
// `campaigns` or `preorders` tables in Phase 2+), ADD a new entry to the end of
// this list. Never edit a migration that has already shipped.

export const MIGRATIONS: string[] = [
  // 1: Phase 1 - market research
  `
  CREATE TABLE research_runs (
    id            TEXT PRIMARY KEY,
    market        TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('running', 'complete', 'failed')),
    stage         TEXT,
    error_message TEXT,
    created_at    TEXT NOT NULL,
    completed_at  TEXT
  );

  -- One row per provider per run. output_json holds the provider's ProviderOutput.
  CREATE TABLE provider_results (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id        TEXT NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
    provider      TEXT NOT NULL,
    label         TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('ok', 'error')),
    error_message TEXT,
    output_json   TEXT,
    fetched_at    TEXT NOT NULL
  );
  CREATE INDEX idx_provider_results_run ON provider_results(run_id);

  -- Claude's interpretation of a run. Kept separate from the observed data on purpose.
  CREATE TABLE ai_analyses (
    run_id              TEXT PRIMARY KEY REFERENCES research_runs(id) ON DELETE CASCADE,
    status              TEXT NOT NULL CHECK (status IN ('complete', 'skipped', 'error')),
    message             TEXT,
    model               TEXT,
    analysis_json       TEXT,
    removed_refs_json   TEXT,
    created_at          TEXT NOT NULL
  );
  `,
];
