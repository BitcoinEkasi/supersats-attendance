"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { calculateRewardSats } from "@/lib/rewards";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";

export async function generateMonthlyReport(month: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  // Validate month format
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { error: "Invalid month format. Use YYYY-MM." };
  }

  // Get date range for the month
  const [year, mon] = month.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, mon - 1, 1));
  const endDate = new Date(Date.UTC(year, mon, 0)); // last day of month

  // Get all active participants
  const participants = await prisma.participant.findMany({
    where: { isActive: true },
  });

  // Get attendance records for this month
  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Group records by participant
  const byParticipant = new Map<string, { present: number; absent: number }>();
  for (const record of records) {
    const existing = byParticipant.get(record.participantId) || {
      present: 0,
      absent: 0,
    };
    if (record.status === 1) existing.present++;
    else if (record.status === -1) existing.absent++;
    byParticipant.set(record.participantId, existing);
  }

  // Create report
  const report = await prisma.$transaction(async (tx) => {
    const report = await tx.monthlyReport.create({
      data: {
        month,
        generatedBy: session.user!.id!,
      },
    });

    for (const participant of participants) {
      const stats = byParticipant.get(participant.id);
      if (!stats) continue; // No records for this participant this month

      const totalSessions = stats.present + stats.absent;
      if (totalSessions === 0) continue;

      const percentage = (stats.present / totalSessions) * 100;
      const rewardSats = calculateRewardSats(percentage);

      await tx.monthlyReportEntry.create({
        data: {
          reportId: report.id,
          participantId: participant.id,
          totalSessions,
          attended: stats.present,
          percentage: new Decimal(percentage.toFixed(2)),
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

export async function getReportWithEntries(reportId: string) {
  return prisma.monthlyReport.findUnique({
    where: { id: reportId },
    include: {
      admin: { select: { name: true } },
      entries: {
        include: {
          participant: { select: { displayName: true, csvName: true } },
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
    "Name,CSV Name,Total Sessions,Attended,Percentage,Reward (sats),Payout Status",
  ];

  for (const entry of report.entries) {
    lines.push(
      [
        `"${entry.participant.displayName}"`,
        `"${entry.participant.csvName}"`,
        entry.totalSessions,
        entry.attended,
        `${entry.percentage}%`,
        entry.rewardSats,
        entry.payoutStatus,
      ].join(","),
    );
  }

  return lines.join("\n");
}
