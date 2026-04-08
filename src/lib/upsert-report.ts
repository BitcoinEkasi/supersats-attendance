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

  // Include participants who were fully active throughout this month:
  // registered before month end AND either still ACTIVE or retired strictly after the month ended.
  // Participants who retired during this month are excluded entirely — reward forfeited.
  const [participants, records] = await Promise.all([
    prisma.participant.findMany({
      where: {
        registrationDate: { lte: monthEnd },
        OR: [
          { status: "ACTIVE" },
          { status: "RETIRED", retiredAt: { gt: monthEnd } },
        ],
      },
      select: { id: true, isJuniorCoach: true, juniorCoachLevel: true },
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
      const totalEvents = events.length;
      const attended = events.filter((e) =>
        attendedSet.get(participant.id)?.has(e.id)
      ).length;

      const percentage = totalEvents > 0 ? (attended / totalEvents) * 100 : 0;
      const baseReward = calculateRewardSats(percentage);
      const JC_MULTIPLIERS: Record<number, number> = { 1: 5, 2: 7.5, 3: 10 };
      const rewardSats = participant.isJuniorCoach
        ? Math.round(baseReward * (JC_MULTIPLIERS[participant.juniorCoachLevel ?? 1] ?? 5))
        : baseReward;

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
