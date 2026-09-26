import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { createRun, listRecentRuns } from "@/lib/db/repository";
import { getConfiguredProviders } from "@/lib/providers/registry";
import { runResearch } from "@/lib/research/run-research";

const MAX_MARKET_LENGTH = 120;

/** List recent research runs. */
export async function GET() {
  return Response.json({ runs: listRecentRuns() });
}

/**
 * Start a new research run. The research itself runs in the background
 * (after the response is sent); the client polls GET /api/research/[id].
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { market?: unknown } | null;
  const market = typeof body?.market === "string" ? body.market.trim() : "";

  if (market.length < 2) {
    return Response.json({ error: "Enter a market or niche to research." }, { status: 400 });
  }
  if (market.length > MAX_MARKET_LENGTH) {
    return Response.json(
      { error: `Keep the market under ${MAX_MARKET_LENGTH} characters.` },
      { status: 400 },
    );
  }
  if (getConfiguredProviders().length === 0) {
    return Response.json(
      { error: "No data sources are configured. Add API keys to .env.local (see .env.example) and restart." },
      { status: 400 },
    );
  }

  const id = randomUUID();
  createRun(id, market);
  after(() => runResearch(id, market));

  return Response.json({ id }, { status: 202 });
}
