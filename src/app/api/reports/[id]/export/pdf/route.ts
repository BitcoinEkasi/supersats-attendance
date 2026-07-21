import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { getActiveRewardSettings } from "@/lib/get-reward-settings";
import { getZarPerSat } from "@/lib/bolt";
import { getStartOfSASTMonth, getEndOfSASTMonth } from "@/lib/sast";
import { fmtDate } from "@/lib/format-date";
import { TSK_GROUP_LABELS } from "@/lib/tsk-groups";
import { ReportPdfDocument, type ReportPdfEntry } from "@/lib/report-pdf";
import { isParticipantActiveOn } from "@/lib/roster-history";
import React from "react";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function fmtMonth(yearMonth: string) {
  const [y, m] = yearMonth.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [report, rewardSettings, liveZarPerSat] = await Promise.all([
    prisma.monthlyReport.findUnique({
      where: { id },
      include: {
        entries: {
          include: {
            participant: {
              select: {
                tskId: true, surname: true, fullNames: true, knownAs: true,
                registrationDate: true, retiredAt: true, status: true,
              },
            },
          },
          orderBy: { percentage: "desc" },
        },
      },
    }),
    getActiveRewardSettings(),
    getZarPerSat().catch(() => null),
  ]);

  if (!report) return Response.json({ error: "Not found" }, { status: 404 });

  const zarPerSat = report.status === "APPROVED" ? (report.zarPerSat ?? liveZarPerSat) : liveZarPerSat;

  const monthStart = getStartOfSASTMonth(report.month);
  const monthEnd   = getEndOfSASTMonth(report.month);

  const recruited = report.entries.filter((e) => {
    const rd = e.participant.registrationDate;
    return rd >= monthStart && rd <= monthEnd;
  }).length;

  const retired = report.entries.filter((e) => {
    const ra = e.participant.retiredAt;
    return ra !== null && ra >= monthStart && ra <= monthEnd;
  }).length;

  const activeParticipants = report.entries.filter((e) => isParticipantActiveOn(e.participant, monthEnd)).length;

  // Count events in the month for this group (approximate via totalEvents from entries)
  const totalSessions = report.entries.length > 0
    ? Math.max(...report.entries.map((e) => e.totalEvents))
    : 0;

  const totalSats = report.entries.reduce((s, e) => s + e.rewardSats, 0);
  const qualifyingParticipants = report.entries.filter((e) => e.rewardSats > 0).length;
  const avgPercentage = report.entries.length > 0
    ? report.entries.reduce((s, e) => s + Number(e.percentage), 0) / report.entries.length
    : 0;

  const entries: ReportPdfEntry[] = report.entries.map((e) => {
    const p = e.participant;
    const name = p.knownAs ? `${p.knownAs} (${p.surname})` : `${p.surname}, ${p.fullNames}`;
    return {
      tskId: p.tskId,
      name,
      totalEvents: e.totalEvents,
      attended: e.attended,
      percentage: Number(e.percentage),
      rewardSats: e.rewardSats,
      retiredAt: p.retiredAt ? fmtDate(p.retiredAt) : null,
    };
  });

  const groupLabel = report.group ? (TSK_GROUP_LABELS[report.group] ?? report.group) : "All Groups";
  const groupSlug  = report.group ? report.group.toLowerCase().replace("_", "-") : "all";
  const filename   = `tsk-report-${report.month}-${groupSlug}.pdf`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = React.createElement(ReportPdfDocument, {
    month: report.month,
    group: report.group,
    groupLabel,
    status: report.status,
    generatedBy: report.generatedBy,
    approvedBy: report.approvedBy ?? null,
    approvedAt: report.approvedAt ? fmtDate(report.approvedAt) : null,
    zarPerSat,
    recruited,
    retired,
    activeParticipants,
    totalSessions,
    qualifyingParticipants,
    avgPercentage,
    totalSats,
    entries,
  }) as any;

  const pdfBuffer = await renderToBuffer(el);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
