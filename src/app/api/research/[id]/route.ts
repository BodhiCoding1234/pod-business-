import { loadReport } from "@/lib/research/run-research";

/** Get the full report for one research run (also used to poll progress). */
export async function GET(_request: Request, ctx: RouteContext<"/api/research/[id]">) {
  const { id } = await ctx.params;
  const report = loadReport(id);
  if (!report) {
    return Response.json({ error: "Research run not found." }, { status: 404 });
  }
  return Response.json(report);
}
