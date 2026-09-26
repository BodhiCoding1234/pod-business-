import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ReportView } from "@/components/report/ReportView";
import { loadReport } from "@/lib/research/run-research";

export default async function ReportPage(props: PageProps<"/reports/[id]">) {
  await connection();
  const { id } = await props.params;
  const report = loadReport(id);
  if (!report) notFound();
  return <ReportView report={report} />;
}
