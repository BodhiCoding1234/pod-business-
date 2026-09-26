import type { ResearchReport } from "@/lib/research/report";
import { AiUnavailable, Card, CitedList, Section } from "./Section";

export function MarketOverview({ report, aiMessage }: { report: ResearchReport; aiMessage: string | null }) {
  const analysis = report.analysis?.analysis ?? null;

  return (
    <Section id="overview" title="Market Overview">
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Market / niche">
          <p className="text-lg text-zinc-50">{report.run.market}</p>
          <p className="mt-1 text-xs text-zinc-500">Your search input.</p>
        </Card>
        <Card title="Product category" kind="ai">
          {analysis ? <p className="text-lg text-zinc-50">{analysis.productCategory}</p> : <AiUnavailable message={aiMessage!} />}
        </Card>
        <Card title="Common customer types" kind="ai">
          {analysis ? (
            <CitedList items={analysis.customerTypes} empty="Not enough evidence to identify customer types." />
          ) : (
            <AiUnavailable message={aiMessage!} />
          )}
        </Card>
        <Card title="Major themes" kind="ai">
          {analysis ? (
            <CitedList items={analysis.majorThemes} empty="No clear themes in the evidence." />
          ) : (
            <AiUnavailable message={aiMessage!} />
          )}
        </Card>
      </div>
      <Card title="Potential sub-niches" kind="ai">
        {analysis ? (
          <CitedList items={analysis.subNiches} empty="No sub-niches identified." />
        ) : (
          <AiUnavailable message={aiMessage!} />
        )}
      </Card>
    </Section>
  );
}
