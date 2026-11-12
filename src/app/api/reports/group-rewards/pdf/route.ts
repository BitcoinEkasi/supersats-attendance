import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAuth } from "@/lib/api-auth";
import { buildGroupReport, resolvePeriod, periodSlug } from "@/lib/group-report";
import { loadGroupReportInput, latestCompletedMonth } from "@/lib/group-report-data";
import { GroupReportPdf } from "@/lib/group-report-pdf";

export async function GET(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const { from, to } = resolvePeriod(url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined, latestCompletedMonth());
  const report = buildGroupReport(await loadGroupReportInput(from, to));
  const generatedAt = new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });

  const pdf = await renderToBuffer(React.createElement(GroupReportPdf, { report, from, to, generatedAt }) as any);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="SuperSats-rewards-by-group-${periodSlug(from, to)}.pdf"`,
    },
  });
}
