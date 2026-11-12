import { requireAuth } from "@/lib/api-auth";
import { buildGroupReport, resolvePeriod, periodSlug, periodLabel, monthLabel, type ReportRow } from "@/lib/group-report";
import { loadGroupReportInput, latestCompletedMonth } from "@/lib/group-report-data";

const field = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const HEADER = ["Group", "Surfers paid", "Participants", "Rewards (sats)", "Spent (sats)", "Saved (sats)", "Save rate (%)"];
const rowCells = (r: ReportRow) => [r.label, r.paid, r.participants, r.rewards, r.spent, r.saved, r.saveRate ?? ""];

export async function GET(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const { from, to } = resolvePeriod(url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined, latestCompletedMonth());
  const report = buildGroupReport(await loadGroupReportInput(from, to));

  const lines: (string | number)[][] = [
    [`Rewards, spending and savings by group, ${periodLabel(from, to)} (totals)`],
    HEADER,
    ...report.totals.map(rowCells),
  ];
  for (const m of report.monthly) lines.push([], [monthLabel(m.month)], HEADER, ...m.rows.map(rowCells));

  const csv = "﻿" + lines.map((l) => l.map(field).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="SuperSats-rewards-by-group-${periodSlug(from, to)}.csv"`,
    },
  });
}
