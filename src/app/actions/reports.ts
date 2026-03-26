"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/role-guard";
import { calculateRewardSats } from "@/lib/rewards";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

export async function generateMonthlyReport(month: string) {
  const user = await requireRole(["ADMINISTRATOR"]);

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { error: "Invalid month format. Use YYYY-MM." };
  }

  const [year, mon] = month.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, mon - 1, 1));
  const endDate = new Date(Date.UTC(year, mon, 0));

  // Get all events in this month
  const events = await prisma.event.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    select: { id: true },
  });

  if (events.length === 0) {
    return { error: "No events found for this month. Create events before generating a report." };
  }

  const eventIds = events.map((e) => e.id);
  const totalEvents = eventIds.length;

  // Get all active participants
  const participants = await prisma.participant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  // Get all attendance records for these events
  const records = await prisma.attendanceRecord.findMany({
    where: { eventId: { in: eventIds } },
    select: { participantId: true, present: true },
  });

  // Count attended per participant
  const attendedMap = new Map<string, number>();
  for (const record of records) {
    if (record.present) {
      attendedMap.set(record.participantId, (attendedMap.get(record.participantId) || 0) + 1);
    }
  }

  const report = await prisma.$transaction(async (tx) => {
    const report = await tx.monthlyReport.create({
      data: {
        month,
        generatedBy: user.id,
      },
    });

    for (const participant of participants) {
      const attended = attendedMap.get(participant.id) || 0;
      if (attended === 0) continue; // Skip participants with no attendance this month

      const percentage = (attended / totalEvents) * 100;
      const rewardSats = calculateRewardSats(percentage);

      await tx.monthlyReportEntry.create({
        data: {
          reportId: report.id,
          participantId: participant.id,
          totalEvents,
          attended,
          percentage: new Prisma.Decimal(percentage.toFixed(2)),
          rewardSats,
        },
      });
    }

    return report;
  });

  revalidatePath("/reports");
  revalidatePath("/dashboard");
  return { success: true, reportId: report.id };
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

export async function checkUnreportedPreviousMonth(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMINISTRATOR") return null;

  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

  const [existingReport, eventCount] = await Promise.all([
    prisma.monthlyReport.findUnique({ where: { month: monthStr } }),
    prisma.event.count({
      where: {
        date: {
          gte: new Date(Date.UTC(prevMonth.getFullYear(), prevMonth.getMonth(), 1)),
          lte: new Date(Date.UTC(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0)),
        },
      },
    }),
  ]);

  if (!existingReport && eventCount > 0) return monthStr;
  return null;
}
