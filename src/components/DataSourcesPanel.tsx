import type { ProviderInfo } from "@/lib/providers/types";

export function DataSourcesPanel({
  providers,
  anthropicConfigured,
}: {
  providers: ProviderInfo[];
  anthropicConfigured: boolean;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-sm font-semibold text-zinc-200">Data sources</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Add API keys to <code className="text-zinc-400">.env.local</code> and restart to enable more sources.
      </p>
      <ul className="mt-4 space-y-3">
        {providers.map((provider) => (
          <SourceRow
            key={provider.id}
            label={provider.label}
            description={provider.description}
            envVars={provider.requiredEnvVars}
            configured={provider.configured}
          />
        ))}
        <SourceRow
          label="Claude analysis"
          description="Interprets the collected evidence: patterns, opportunities, risks and product angles."
          envVars={["ANTHROPIC_API_KEY"]}
          configured={anthropicConfigured}
        />
      </ul>
    </section>
  );
}

function SourceRow(props: { label: string; description: string; envVars: string[]; configured: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${props.configured ? "bg-emerald-400" : "bg-zinc-600"}`}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm text-zinc-200">
          {props.label}{" "}
          <span className={`text-xs ${props.configured ? "text-emerald-400" : "text-zinc-500"}`}>
            {props.configured ? "connected" : "not configured"}
          </span>
        </p>
        <p className="text-xs text-zinc-500">{props.description}</p>
        {!props.configured && (
          <p className="mt-0.5 font-mono text-[11px] text-zinc-600">{props.envVars.join(", ")}</p>
        )}
      </div>
    </li>
  );
}
