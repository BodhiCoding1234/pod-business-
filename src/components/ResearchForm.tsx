"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResearchForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [market, setMarket] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market }),
      });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) {
        throw new Error(data.error ?? "Could not start research.");
      }
      router.push(`/reports/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label htmlFor="market" className="mb-2 block text-sm font-medium text-zinc-400">
        Market or niche
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="market"
          value={market}
          onChange={(e) => setMarket(e.target.value)}
          placeholder='e.g. "football t-shirts"'
          maxLength={120}
          disabled={disabled || submitting}
          className="h-12 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || submitting || market.trim().length < 2}
          className="h-12 rounded-lg bg-emerald-500 px-6 font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Starting…" : "Research Market"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
    </form>
  );
}
