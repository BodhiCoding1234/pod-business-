import { DataLabel } from "@/components/DataLabel";
import type { CheckedOpportunity } from "@/lib/ai/analysis-check";
import type { ResearchReport } from "@/lib/research/report";
import { AiUnavailable, EvidenceRefs, Section } from "./Section";

const CONFIDENCE_STYLES = {
  low: "text-rose-300",
  medium: "text-amber-300",
  high: "text-emerald-300",
} as const;

export function Opportunities({ report, aiMessage }: { report: ResearchReport; aiMessage: string | null }) {
  const opportunities = report.analysis?.analysis?.opportunities ?? null;

  return (
    <Section
      id="opportunities"
      title="Opportunity Areas"
      description="Narrower product ideas suggested by Claude. Each one is a hypothesis to validate with real customers, not a prediction that it will sell."
    >
      {opportunities === null ? (
        <AiUnavailable message={aiMessage!} />
      ) : opportunities.length === 0 ? (
        <p className="text-zinc-500">Claude did not find enough evidence to suggest opportunities.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {opportunities.map((opportunity, index) => (
            <OpportunityCard key={index} opportunity={opportunity} />
          ))}
        </div>
      )}
    </Section>
  );
}

function OpportunityCard({ opportunity }: { opportunity: CheckedOpportunity }) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-zinc-50">{opportunity.name}</h3>
        <DataLabel kind="ai" />
      </header>

      {opportunity.unsupported && (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">
          None of the evidence Claude cited for this idea exists in the collected data. Treat it as speculation.
        </p>
      )}

      <Field label="Target customer">{opportunity.targetCustomer}</Field>

      <Field label="Evidence supporting it">
        {opportunity.evidence.length === 0 ? (
          <span className="text-zinc-500">No verified evidence.</span>
        ) : (
          <ul className="space-y-1.5">
            {opportunity.evidence.map((e, index) => (
              <li key={`${e.evidenceId}-${index}`} className="flex gap-2">
                <EvidenceRefs ids={[e.evidenceId]} />
                <span className="text-zinc-400">{e.explanation}</span>
              </li>
            ))}
          </ul>
        )}
      </Field>

      <Field label="Competition observations">{opportunity.competitionObservations}</Field>
      <Field label="Differentiation angles">
        <BulletList items={opportunity.differentiationAngles} />
      </Field>
      <Field label="Risks">
        <BulletList items={opportunity.risks} />
      </Field>
      <Field label="AI assessment">
        <p>{opportunity.assessment}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Evidence strength:{" "}
          <span className={`font-semibold uppercase ${CONFIDENCE_STYLES[opportunity.confidence]}`}>
            {opportunity.confidence}
          </span>{" "}
          (how well the collected data supports this idea, not a sales forecast)
        </p>
      </Field>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-amber-200">Test with real customers</p>
          <DataLabel kind="hypothesis" />
        </div>
        <BulletList items={opportunity.hypothesesToTest} />
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
      <p className="mb-1 text-xs font-medium tracking-wide text-zinc-500 uppercase">{label}</p>
      <div className="text-zinc-300">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-zinc-500">None listed.</span>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-zinc-300 marker:text-zinc-600">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
