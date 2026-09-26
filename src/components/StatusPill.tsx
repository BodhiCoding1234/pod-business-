import type { RunStatus } from "@/lib/research/types";

const STYLES: Record<RunStatus, string> = {
  running: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  complete: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  failed: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export function StatusPill({ status }: { status: RunStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${STYLES[status]}`}>
      {status === "running" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />}
      {status}
    </span>
  );
}
