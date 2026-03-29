"use server";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/role-guard";
import { calculateRewardSats } from "@/lib/rewards";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getSASTNow, getStartOfSASTMonth, getEndOfSASTMonth } from "@/lib/sast";

/**
 * Upserts the monthly report for the given month (YYYY-MM).
 * Called automatically whenever attendance is saved or an event is created/updated.
 * If the report was previously approved and data has changed, it resets to PENDING.
 */
export async function upsertMonthlyReport(month: string, userId: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return;

  const events = await prisma.event.findMany({
    where: { date: { gte: getStartOfSASTMonth(month), lte: getEndOfSASTMonth(month) } },
    select: { id: true },
  });

  if (events.length === 0) return;

  const eventIds = events.map((e) => e.id);
  const totalEvents = eventIds.length;

  const [participants, records] = await Promise.all([
    prisma.participant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, isJuniorCoach: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { eventId: { in: eventIds } },
      select: { participantId: true, present: true },
    }),
  ]);

  const attendedMap = new Map<string, number>();
  for (const record of records) {
    if (record.present) {
      attendedMap.set(record.participantId, (attendedMap.get(record.participantId) || 0) + 1);
    }
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.monthlyReport.findUnique({ where: { month } });

    let reportId: string;
    if (existing) {
      await tx.monthlyReport.update({
        where: { month },
        data: {
          generatedAt: new Date(),
          ...(existing.status === "APPROVED"
            ? { status: "PENDING", approvedAt: null, approvedBy: null }
            : {}),
        },
      });
      reportId = existing.id;
    } else {
      const created = await tx.monthlyReport.create({
        data: { month, generatedBy: userId },
      });
      reportId = created.id;
    }

    await tx.monthlyReportEntry.deleteMany({ where: { reportId } });

    for (const participant of participants) {
      const attended = attendedMap.get(participant.id) || 0;
      const percentage = (attended / totalEvents) * 100;
      const rewardSats = participant.isJuniorCoach ? 0 : calculateRewardSats(percentage);

      await tx.monthlyReportEntry.create({
        data: {
          reportId,
          participantId: participant.id,
          totalEvents,
          attended,
          percentage: new Prisma.Decimal(percentage.toFixed(2)),
          rewardSats,
        },
      });
    }
  });

  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

export async function approveReport(reportId: string) {
  const user = await requireRole(["SUPERVISOR"]);

  const report = await prisma.monthlyReport.findUnique({ where: { id: reportId } });
  if (!report) return { error: "Report not found" };
  if (report.status === "APPROVED") return { error: "Report is already approved" };

  await prisma.monthlyReport.update({
    where: { id: reportId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: user.id,
    },
  });

  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
  return { success: true };
}

export async function getReportWithEntries(reportId: string) {
  return prisma.monthlyReport.findUnique({
    where: { id: reportId },
    include: {
      generator: { select: { name: true } },
      approver: { select: { name: true } },
      entries: {
        include: {
          participant: {
            select: {
              tskId: true,
              surname: true,
              fullNames: true,
              knownAs: true,
            },
          },
        },
        orderBy: { percentage: "desc" },
      },
    },
  });
}

export async function exportReportCSV(reportId: string): Promise<string> {
  const report = await getReportWithEntries(reportId);
  if (!report) return "";

  const lines = [
    "TSK ID,Name,Total Events,Attended,Percentage,Reward (sats),Payout Status",
  ];

  for (const entry of report.entries) {
    const p = entry.participant;
    const name = p.knownAs
      ? `${p.knownAs} (${p.surname})`
      : `${p.surname}, ${p.fullNames}`;
    lines.push(
      [
        p.tskId,
        `"${name}"`,
        entry.totalEvents,
        entry.attended,
        `${entry.percentage}%`,
        entry.rewardSats,
        entry.payoutStatus,
      ].join(","),
    );
  }

  return lines.join("\n");
}

