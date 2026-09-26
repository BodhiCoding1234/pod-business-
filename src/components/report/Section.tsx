import { DataLabel, type DataKind } from "@/components/DataLabel";

export function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-50">{title}</h2>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** A card with a heading and a data-source label. */
export function Card({
  title,
  kind,
  children,
}: {
  title: string;
  kind?: DataKind;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        {kind && <DataLabel kind={kind} />}
      </div>
      <div className="text-sm text-zinc-300">{children}</div>
    </div>
  );
}

/** Links to evidence rows further down the page, e.g. [L3] [O12]. */
export function EvidenceRefs({ ids }: { ids: string[] }) {
  if (ids.length === 0) {
    return <span className="text-xs text-zinc-600 italic">no evidence cited</span>;
  }
  return (
    <span className="inline-flex flex-wrap gap-1">
      {ids.map((id) => (
        <a
          key={id}
          href={`#${id}`}
          className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-sky-300 hover:bg-zinc-700"
        >
          {id}
        </a>
      ))}
    </span>
  );
}

/** A list of AI items that each cite evidence. */
export function CitedList({
  items,
  empty,
}: {
  items: { name: string; description: string; evidenceIds: string[] }[];
  empty: string;
}) {
  if (items.length === 0) return <p className="text-zinc-500">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={index}>
          <p className="font-medium text-zinc-100">{item.name}</p>
          <p className="text-zinc-400">{item.description}</p>
          <div className="mt-1">
            <EvidenceRefs ids={item.evidenceIds} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Explains why the AI part of a section is missing. */
export function AiUnavailable({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-zinc-700 p-3 text-zinc-500">
      AI interpretation unavailable: {message}
    </p>
  );
}
