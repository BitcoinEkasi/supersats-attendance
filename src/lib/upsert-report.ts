import { prisma } from "@/lib/db";
import { calculateRewardSats } from "@/lib/rewards";
import { getStartOfSASTMonth, getEndOfSASTMonth } from "@/lib/sast";
import { type TskGroupKey, participantWhereForGroup } from "@/lib/tsk-groups";

export async function upsertMonthlyReport(
  month: string,
  generatedBy: string,
  group: TskGroupKey | null = null,
) {
  if (!/^\d{4}-\d{2}$/.test(month)) return;

  const monthStart = getStartOfSASTMonth(month);
  const monthEnd = getEndOfSASTMonth(month);

  const events = await prisma.event.findMany({
    where: {
      date: { gte: monthStart, lte: monthEnd },
      ...(group ? { group } : {}),
    },
    select: { id: true, date: true },
  });

  if (events.length === 0) return;

  const eventIds = events.map((e) => e.id);

  const [participants, records] = await Promise.all([
    prisma.participant.findMany({
      where: {
        registrationDate: { lte: monthEnd },
        OR: [
          { status: "ACTIVE" },
          { status: "RETIRED", retiredAt: { gte: monthStart } },
        ],
        ...(group ? participantWhereForGroup(group) : {}),
      },
      select: { id: true, isJuniorCoach: true, juniorCoachLevel: true, retiredAt: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { eventId: { in: eventIds } },
      select: { participantId: true, eventId: true, present: true },
    }),
  ]);

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
    const existing = await tx.monthlyReport.findFirst({
      where: { month, group: group ?? null },
    });

    let reportId: string;
    if (existing) {
      await tx.monthlyReport.update({
        where: { id: existing.id },
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
        data: { month, group: group ?? null, generatedBy },
      });
      reportId = created.id;
    }

    await tx.monthlyReportEntry.deleteMany({ where: { reportId } });

    for (const participant of participants) {
      const attendableEvents = participant.retiredAt
        ? events.filter((e) => e.date <= participant.retiredAt!)
        : events;

      const totalEvents = events.length;
      const attended = attendableEvents.filter((e) =>
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
