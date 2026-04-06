import { prisma } from "@/lib/db";
import { calculateRewardSats } from "@/lib/rewards";
import { getStartOfSASTMonth, getEndOfSASTMonth } from "@/lib/sast";

export async function upsertMonthlyReport(month: string, generatedBy: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return;

  const monthStart = getStartOfSASTMonth(month);
  const monthEnd = getEndOfSASTMonth(month);

  const events = await prisma.event.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
    select: { id: true, date: true },
  });

  if (events.length === 0) return;

  const eventIds = events.map((e) => e.id);

  // Include participants who were active at any point during this month:
  // registered before month end AND either still ACTIVE or retired on/after month start.
  const [participants, records] = await Promise.all([
    prisma.participant.findMany({
      where: {
        registrationDate: { lte: monthEnd },
        OR: [
          { status: "ACTIVE" },
          { status: "RETIRED", retiredAt: { gte: monthStart } },
        ],
      },
      select: { id: true, isJuniorCoach: true, retiredAt: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { eventId: { in: eventIds } },
      select: { participantId: true, eventId: true, present: true },
    }),
  ]);

  // Build per-participant set of events attended
  const attendedSet = new Map<string, Set<string>>();
  for (const record of records) {
    if (record.present) {
      if (!attendedSet.has(record.participantId)) {
        attendedSet.set(record.participantId, new Set());
      }
      attendedSet.get(record.participantId)!.add(record.eventId);
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
      // For retired participants, only count events up to their retirement date
      const eligibleEvents = participant.retiredAt
        ? events.filter((e) => e.date <= participant.retiredAt!)
        : events;

      const totalEvents = eligibleEvents.length;
      const attended = eligibleEvents.filter((e) =>
        attendedSet.get(participant.id)?.has(e.id)
      ).length;

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
