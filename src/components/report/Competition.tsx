import { Unavailable } from "@/components/DataLabel";
import { formatAmount, formatNumber, formatPrice, PROVIDER_LABELS } from "@/lib/format";
import type { TermStat } from "@/lib/research/metrics";
import type { ResearchReport } from "@/lib/research/report";
import type { Listing } from "@/lib/research/types";
import { AiUnavailable, Card, CitedList, Section } from "./Section";

export function Competition({ report, aiMessage }: { report: ResearchReport; aiMessage: string | null }) {
  const { metrics, evidence } = report;
  const analysis = report.analysis?.analysis ?? null;
  const okProviders = report.providers.filter((p) => p.status === "ok" && p.output);

  return (
    <Section
      id="competition"
      title="Competition"
      description="What is already being sold. Numbers here come only from the data sources, never from the AI."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Search result counts" kind="observed">
          <ul className="space-y-1">
            {okProviders.map((p) => (
              <li key={p.provider} className="flex justify-between gap-4">
                <span className="text-zinc-400">{p.label}</span>
                {p.output!.totalResultsReported !== null ? (
                  <span>{formatNumber(p.output!.totalResultsReported)} results</span>
                ) : (
                  <Unavailable reason="This source does not report a total result count." />
                )}
              </li>
            ))}
            {okProviders.length === 0 && <li className="text-zinc-500">No data sources returned data.</li>}
          </ul>
          <p className="mt-3 text-xs text-zinc-500">
            Total matches the source reported for the search. A high count can mean saturation, but also broad
            demand. It is not a sales figure.
          </p>
        </Card>

        <Card title="Prices" kind="computed">
          {metrics.priceStats.length === 0 ? (
            <Unavailable reason="No listing had a verifiable price." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-xs text-zinc-500">
                  <tr>
                    <th className="pr-3 pb-1 font-normal">Source</th>
                    <th className="pr-3 pb-1 font-normal">Currency</th>
                    <th className="pr-3 pb-1 font-normal">Listings</th>
                    <th className="pr-3 pb-1 font-normal">Low</th>
                    <th className="pr-3 pb-1 font-normal">Median</th>
                    <th className="pb-1 font-normal">High</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.priceStats.map((s) => (
                    <tr key={`${s.provider}-${s.currency}`}>
                      <td className="py-0.5 pr-3 text-zinc-400">{PROVIDER_LABELS[s.provider]}</td>
                      <td className="pr-3">
                        {s.currency === "unknown" ? (
                          <span
                            className="text-zinc-500"
                            title="The source showed a symbol like $ that could be several currencies."
                          >
                            not confirmed
                          </span>
                        ) : (
                          s.currency
                        )}
                      </td>
                      <td className="pr-3">{s.count}</td>
                      <td className="pr-3">{formatAmount(s.min, s.currency)}</td>
                      <td className="pr-3">{formatAmount(s.median, s.currency)}</td>
                      <td>{formatAmount(s.max, s.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Review counts" kind="computed">
          {metrics.reviewStats.length === 0 ? (
            <Unavailable />
          ) : (
            <ul className="space-y-1">
              {metrics.reviewStats.map((s) => (
                <li key={s.provider} className="flex justify-between gap-4">
                  <span className="text-zinc-400">{PROVIDER_LABELS[s.provider]}</span>
                  {s.listingsWithReviewData === 0 ? (
                    <Unavailable reason="This source did not provide review counts." />
                  ) : (
                    <span>
                      median {formatNumber(s.median!)}, max {formatNumber(s.max!)}{" "}
                      <span className="text-zinc-500">
                        ({s.listingsWithReviewData} of{" "}
                        {s.listingsWithReviewData + s.listingsWithoutReviewData} listings)
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Common keywords & phrases in listing titles" kind="computed">
          <TermCloud label="Words" terms={metrics.topKeywords} total={metrics.totalListings} />
          <TermCloud label="Phrases" terms={metrics.topPhrases} total={metrics.totalListings} />
          {metrics.topTags.length > 0 && (
            <TermCloud label="Etsy tags" terms={metrics.topTags} total={metrics.totalListings} />
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Common product styles" kind="ai">
          {analysis ? (
            <CitedList
              items={analysis.competition.commonStyles}
              empty="No clear style patterns identified."
            />
          ) : (
            <AiUnavailable message={aiMessage!} />
          )}
        </Card>
        <Card title="Saturation signals" kind="ai">
          {analysis ? (
            <>
              <CitedList
                items={analysis.competition.saturationSignals}
                empty="No obvious saturation signals in the evidence."
              />
              <p className="mt-4 border-t border-zinc-800 pt-3 text-zinc-400">
                {analysis.competition.summary}
              </p>
            </>
          ) : (
            <AiUnavailable message={aiMessage!} />
          )}
        </Card>
      </div>

      <Card title={`Listings discovered (${evidence.listings.length})`} kind="observed">
        <ListingsTable listings={evidence.listings} />
      </Card>
    </Section>
  );
}

function TermCloud({ label, terms, total }: { label: string; terms: TermStat[]; total: number }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1 text-xs text-zinc-500">{label}</p>
      {terms.length === 0 ? (
        <Unavailable reason="Not enough listings to find repeated terms." />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {terms.map((t) => (
            <span
              key={t.term}
              title={`Appears in ${t.listingCount} of ${total} listings`}
              className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200"
            >
              {t.term} <span className="text-zinc-500">{t.listingCount}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ListingsTable({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) {
    return <p className="text-zinc-500">No listings were collected.</p>;
  }
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead className="text-xs text-zinc-500">
          <tr className="border-b border-zinc-800">
            <th className="px-5 py-2 font-normal">ID</th>
            <th className="py-2 font-normal">Title</th>
            <th className="py-2 font-normal">Source</th>
            <th className="py-2 font-normal">Price</th>
            <th className="py-2 font-normal">Reviews</th>
            <th className="py-2 font-normal">Rating</th>
            <th className="py-2 pr-5 font-normal">Favorites</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => (
            <tr key={l.id} id={l.id} className="border-b border-zinc-800/60 align-top">
              <td className="px-5 py-2 font-mono text-xs text-zinc-500">{l.id}</td>
              <td className="max-w-md py-2 pr-4">
                {l.url ? (
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-100 hover:text-emerald-300"
                  >
                    {l.title}
                  </a>
                ) : (
                  l.title
                )}
                {l.verification === "verified_in_source_text" && (
                  <span className="mt-0.5 block text-[11px] text-zinc-500">
                    Extracted from a cited web page; values checked against the source text.
                  </span>
                )}
              </td>
              <td className="py-2 pr-4 whitespace-nowrap text-zinc-400">{PROVIDER_LABELS[l.provider]}</td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {l.price ? formatPrice(l.price) : <Unavailable />}
              </td>
              <td className="py-2 pr-4">
                {l.reviewCount !== null ? formatNumber(l.reviewCount) : <Unavailable />}
              </td>
              <td className="py-2 pr-4">{l.rating !== null ? `${l.rating}★` : <Unavailable />}</td>
              <td className="py-2 pr-5">
                {l.favorites !== null ? formatNumber(l.favorites) : <Unavailable />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
