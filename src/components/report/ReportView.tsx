import { DataLabel } from "@/components/DataLabel";
import { StatusPill } from "@/components/StatusPill";
import { formatDateTime } from "@/lib/format";
import type { ResearchReport } from "@/lib/research/report";
import { AutoRefresh } from "./AutoRefresh";
import { Competition } from "./Competition";
import { DataSources, EvidenceList } from "./EvidenceAndSources";
import { MarketOverview } from "./MarketOverview";
import { Opportunities } from "./Opportunities";
import { Card } from "./Section";

/** Why AI sections are empty, or null when the analysis exists. */
function aiUnavailableMessage(report: ResearchReport): string | null {
  const analysis = report.analysis;
  if (analysis?.status === "complete" && analysis.analysis) return null;
  if (!analysis) return "the analysis has not run.";
  return analysis.message ?? "the analysis did not complete.";
}

export function ReportView({ report }: { report: ResearchReport }) {
  const { run } = report;

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">{run.market}</h1>
          <StatusPill status={run.status} />
        </div>
        <p className="text-sm text-zinc-500">Research started {formatDateTime(run.createdAt)}</p>
      </header>

      {run.status === "running" ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
          <AutoRefresh />
          <p className="flex items-center gap-2 font-medium text-amber-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
            {run.stage ?? "Working"}…
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Web research and analysis can take a few minutes. This page updates automatically.
          </p>
        </div>
      ) : (
        <>
          {run.status === "failed" && (
            <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">
              {run.errorMessage}
            </p>
          )}

          <Card title="How to read this report">
            <div className="grid gap-3 sm:grid-cols-2">
              <Legend kind="observed" text="Returned by a data source or quoted verbatim from a cited page." />
              <Legend kind="computed" text="Calculated from observed data by Drop Lab. No AI." />
              <Legend kind="ai" text="Claude's interpretation. Follow the evidence IDs to check it." />
              <Legend kind="hypothesis" text="Something to test with real customers before spending money." />
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              Nothing in this report predicts that a product will sell. Values that could not be verified are
              shown as “Unavailable”.
            </p>
          </Card>

          <MarketOverview report={report} aiMessage={aiUnavailableMessage(report)} />
          <Competition report={report} aiMessage={aiUnavailableMessage(report)} />
          <Opportunities report={report} aiMessage={aiUnavailableMessage(report)} />

          {report.analysis?.analysis && report.analysis.analysis.dataGaps.length > 0 && (
            <Card title="Data gaps" kind="ai">
              <ul className="list-disc space-y-1 pl-5 marker:text-zinc-600">
                {report.analysis.analysis.dataGaps.map((gap, index) => (
                  <li key={index}>{gap}</li>
                ))}
              </ul>
            </Card>
          )}

          <EvidenceList report={report} />
          <DataSources report={report} />
        </>
      )}
    </div>
  );
}

function Legend({ kind, text }: { kind: "observed" | "computed" | "ai" | "hypothesis"; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <DataLabel kind={kind} />
      <span className="text-xs text-zinc-400">{text}</span>
    </div>
  );
}
