import Link from "next/link";
import { connection } from "next/server";
import { DataSourcesPanel } from "@/components/DataSourcesPanel";
import { ResearchForm } from "@/components/ResearchForm";
import { StatusPill } from "@/components/StatusPill";
import { isAnthropicConfigured } from "@/lib/config";
import { listRecentRuns } from "@/lib/db/repository";
import { formatDateTime } from "@/lib/format";
import { getProviderInfo } from "@/lib/providers/registry";

export default async function HomePage() {
  // Render on every request (this page reads the database).
  await connection();

  const providers = getProviderInfo();
  const anyProviderConfigured = providers.some((p) => p.configured);
  const runs = listRecentRuns();

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/40 p-8 sm:p-10">
        <p className="text-xs font-semibold tracking-[0.2em] text-emerald-400 uppercase">Drop Lab</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Research a market before you spend money on it.
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Drop Lab collects real listings and sources, then uses Claude to suggest product opportunities as
          hypotheses to test with real customers. It does not predict sales.
        </p>
        <div className="mt-8 max-w-2xl">
          <ResearchForm disabled={!anyProviderConfigured} />
          {!anyProviderConfigured && (
            <p className="mt-3 text-sm text-amber-300">
              No data sources are configured yet. Copy <code>.env.example</code> to <code>.env.local</code>, add
              at least one API key, then restart the dev server.
            </p>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">Recent research</h2>
          {runs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">
              No research yet. Enter a market above to create your first report.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
              {runs.map((run) => (
                <li key={run.id}>
                  <Link
                    href={`/reports/${run.id}`}
                    className="flex items-center justify-between gap-4 bg-zinc-900/40 px-4 py-3 transition hover:bg-zinc-900"
                  >
                    <span className="truncate text-zinc-100">{run.market}</span>
                    <span className="flex shrink-0 items-center gap-3 text-xs text-zinc-500">
                      {formatDateTime(run.createdAt)}
                      <StatusPill status={run.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <DataSourcesPanel providers={providers} anthropicConfigured={isAnthropicConfigured()} />
      </div>
    </div>
  );
}
