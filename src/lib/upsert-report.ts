import { prisma } from "@/lib/db";
import { calculateRewardSats } from "@/lib/rewards";
import { getStartOfSASTMonth, getEndOfSASTMonth } from "@/lib/sast";

export async function upsertMonthlyReport(month: string, generatedBy: string) {
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
        data: { month, generatedBy },
      });
      reportId = created.id;
    }

    await tx.monthlyReportEntry.deleteMany({ where: { reportId } });

    for (const participant of participants) {
      const attended = attendedMap.get(participant.id) || 0;
      const percentage = totalEvents > 0 ? (attended / totalEvents) * 100 : 0;
      const rewardSats = participant.isJuniorCoach ? 0 : calculateRewardSats(percentage);

      await tx.monthlyReportEntry.create({
        data: {
          reportId,
          participantId: participant.id,
          totalEvents,
          attended,
          percentage: parseFloat(percentage.toFixed(2)),
          rewardSats,
        },
      });
    }
  });
}
