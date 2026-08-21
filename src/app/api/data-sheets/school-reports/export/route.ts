import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { fmtDate } from "@/lib/format-date";
import { TSK_GROUP_LABELS, getGroupForStatus } from "@/lib/tsk-groups";
import { SchoolReportsPdfDocument, type SchoolReportsPdfEntry } from "@/lib/data-sheet-pdf";
import React from "react";

function esc(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "";
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const participantIds = Array.isArray(body.participantIds) ? (body.participantIds as string[]) : [];
  const format = body.format === "pdf" ? "pdf" : "csv";
  const year = Number(body.year);

  if (participantIds.length === 0) {
    return Response.json({ error: "No participants selected" }, { status: 400 });
  }
  if (!year || isNaN(year)) {
    return Response.json({ error: "year is required" }, { status: 400 });
  }

  const participants = await prisma.participant.findMany({
    where: { id: { in: participantIds }, status: "ACTIVE" },
    orderBy: [{ surname: "asc" }, { fullNames: "asc" }],
    select: {
      tskId: true, surname: true, fullNames: true, knownAs: true, tskStatus: true,
      schoolReports: {
        where: { year },
        select: {
          term1Result: true, term1FileUrl: true,
          term2Result: true, term2FileUrl: true,
          term3Result: true, term3FileUrl: true,
          term4Result: true, term4FileUrl: true,
        },
      },
    },
  });

  if (format === "csv") {
    const headers = [
      "TSK ID", "Surname", "Full Names", "Known As", "Group",
      "Q1 Avg %", "Q1 File", "Q2 Avg %", "Q2 File", "Q3 Avg %", "Q3 File", "Q4 Avg %", "Q4 File",
    ];
    const rows = participants.map((p) => {
      const group = getGroupForStatus(p.tskStatus);
      const r = p.schoolReports[0];
      return [
        esc(p.tskId),
        esc(p.surname),
        esc(p.fullNames),
        esc(p.knownAs),
        esc(group ? TSK_GROUP_LABELS[group] : ""),
        esc(r?.term1Result ?? null),
        esc(r?.term1FileUrl ?? null),
        esc(r?.term2Result ?? null),
        esc(r?.term2FileUrl ?? null),
        esc(r?.term3Result ?? null),
        esc(r?.term3FileUrl ?? null),
        esc(r?.term4Result ?? null),
        esc(r?.term4FileUrl ?? null),
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tsk-school-reports-${year}-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  const entries: SchoolReportsPdfEntry[] = participants.map((p) => {
    const group = getGroupForStatus(p.tskStatus);
    const name = p.knownAs ? `${p.knownAs} (${p.surname})` : `${p.surname}, ${p.fullNames}`;
    const r = p.schoolReports[0];
    const toAbsolute = (path: string | null | undefined) => (path ? new URL(path, req.url).toString() : null);
    return {
      tskId: p.tskId,
      name,
      group: group ? TSK_GROUP_LABELS[group] : null,
      term1Result: r?.term1Result ?? null,
      term1FileUrl: toAbsolute(r?.term1FileUrl),
      term2Result: r?.term2Result ?? null,
      term2FileUrl: toAbsolute(r?.term2FileUrl),
      term3Result: r?.term3Result ?? null,
      term3FileUrl: toAbsolute(r?.term3FileUrl),
      term4Result: r?.term4Result ?? null,
      term4FileUrl: toAbsolute(r?.term4FileUrl),
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = React.createElement(SchoolReportsPdfDocument, { generatedAt: fmtDate(new Date()), year, entries }) as any;
  const pdfBuffer = await renderToBuffer(el);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tsk-school-reports-${year}-${new Date().toISOString().split("T")[0]}.pdf"`,
    },
  });
}
