import { prisma } from "@/lib/db";
import { buildCalculateRewardSats } from "@/lib/rewards";
import { getActiveRewardSettings } from "@/lib/get-reward-settings";
import { getStartOfSASTMonth, getEndOfSASTMonth } from "@/lib/sast";
import { type TskGroupKey } from "@/lib/tsk-groups";
import { acMultiplierForMonth } from "@/lib/tsk-levels";
import { isParticipantActiveOn, groupAsOf, type LevelHistoryRow } from "@/lib/roster-history";

export async function upsertMonthlyReport(
  month: string,
  generatedBy: string,
  group: TskGroupKey | null = null,
) {
  if (!/^\d{4}-\d{2}$/.test(month)) return;

  const { minSats, maxSats } = await getActiveRewardSettings();
  const calculateRewardSats = buildCalculateRewardSats(minSats, maxSats);

  const monthStart = getStartOfSASTMonth(month);
  const monthEnd = getEndOfSASTMonth(month);

  const events = await prisma.event.findMany({
    where: {
      date: { gte: monthStart, lte: monthEnd },
      ...(group ? { group } : {}),
    },
    select: { id: true, date: true, group: true },
  });

  if (events.length === 0) return;

  const eventIds = events.map((e) => e.id);

  // Group membership is never filtered in SQL here — Participant.tskStatus is only the
  // CURRENT status, and by the time a report is generated/refreshed a participant may
  // already have transitioned groups since `month`. Every participant is fetched
  // regardless of current group, and group-as-of-monthEnd is reconstructed from
  // TskLevelHistory below (see groupAsOf) so a participant's group in month M stays
  // correct even after a later transition — this is what broke TSK00050's August
  // report the moment his scheduled Dolphins→Sharks move applied on schedule.
  const [participants, records, levelHistory] = await Promise.all([
    prisma.participant.findMany({
      where: {
        registrationDate: { lte: monthEnd },
        OR: [
          { status: "ACTIVE" },
          { status: "RETIRED", retiredAt: { gt: monthStart } },
        ],
      },
      select: {
        id: true, isAssistantCoach: true, assistantCoachSince: true, retiredAt: true, registrationDate: true, status: true, tskStatus: true,
        assistantCoachPeriods: { select: { startedAt: true, endedAt: true } },
      },
    }),
    prisma.attendanceRecord.findMany({
      where: { eventId: { in: eventIds } },
      select: { participantId: true, eventId: true, present: true },
    }),
    prisma.tskLevelHistory.findMany({
      select: { participantId: true, level: true, changedAt: true },
      orderBy: { changedAt: "asc" },
    }),
  ]);

  const historyByParticipant = new Map<string, LevelHistoryRow[]>();
  for (const row of levelHistory) {
    const arr = historyByParticipant.get(row.participantId);
    if (arr) arr.push(row);
    else historyByParticipant.set(row.participantId, [row]);
  }

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

    // An approved report is locked — it must never be silently un-approved or have its
    // entries wiped/recalculated by a later attendance/event/participant edit. Every
    // caller of this function is expected to check this first and reject the underlying
    // action with a clear error instead of reaching here, but this is the one place that
    // actually enforces it, since relying on every call site to remember is exactly how
    // an approved, already-paid report previously got silently reset to PENDING.
    if (existing?.status === "APPROVED") return;

    let reportId: string;
    if (existing) {
      await tx.monthlyReport.update({
        where: { id: existing.id },
        data: { generatedAt: new Date() },
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
      const ownGroup = groupAsOf(historyByParticipant, participant.id, monthEnd, participant.tskStatus);

      // A group-specific report (e.g. SHARKS) only includes participants who were
      // actually in that group as of this month — not whoever currently is.
      if (group !== null && ownGroup !== group) continue;

      const attendableEvents = events.filter((e) => {
        if (!isParticipantActiveOn(participant, e.date)) return false;
        if (group !== null) return true; // already event-filtered by the query itself
        return e.group === null || e.group === ownGroup;
      });

      const totalEvents = attendableEvents.length;
      const attended = attendableEvents.filter((e) =>
        attendedSet.get(participant.id)?.has(e.id)
      ).length;

      const percentage = totalEvents > 0 ? (attended / totalEvents) * 100 : 0;
      const baseReward = calculateRewardSats(percentage);
      const acMultiplier = acMultiplierForMonth(participant.assistantCoachPeriods, month);
      const rewardSats = acMultiplier !== null ? Math.round(baseReward * acMultiplier) : baseReward;

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
