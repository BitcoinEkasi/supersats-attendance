import { prisma } from "@/lib/db";
import { getStartOfSASTMonth, getEndOfSASTMonth } from "@/lib/sast";
import { participantWhereForGroup, getGroupForStatus, type TskGroupKey } from "@/lib/tsk-groups";
import { isParticipantActiveOn } from "@/lib/roster-history";

export type ParticipantMonthAttendance = {
  participantId: string;
  totalEvents: number;
  attended: number;
};

/**
 * Per-participant attendance for a month, scoped the same way a Monthly Report is: events
 * optionally filtered by group, participants optionally filtered by group (current
 * tskStatus-derived) and the broad active-or-retired-after-monthStart candidate net, each
 * participant's own totalEvents/attended bounded by isParticipantActiveOn. Kept independent
 * of upsert-report.ts (which additionally needs AC-multiplier fields and writes reward
 * data) so Attendance Analytics can reuse the same weighting formula without touching the
 * reward-generation path.
 *
 * When neither `group` nor `participantId` is given (the "All Groups" aggregate), each
 * participant is only eligible for their own current group's events, plus any ungrouped
 * event — isParticipantActiveOn alone doesn't know about groups, so without this every
 * participant's totalEvents would include every other group's events too, hugely inflating
 * the denominator for anyone who (correctly) never attends another group's sessions.
 */
export async function computeParticipantMonthAttendance(
  month: string,
  { group, participantId }: { group?: TskGroupKey | null; participantId?: string } = {}
): Promise<ParticipantMonthAttendance[]> {
  const monthStart = getStartOfSASTMonth(month);
  const monthEnd = getEndOfSASTMonth(month);
  const scopeToOwnGroup = !group && !participantId;

  const events = await prisma.event.findMany({
    where: { date: { gte: monthStart, lte: monthEnd }, ...(group ? { group } : {}) },
    select: { id: true, date: true, group: true },
  });
  if (events.length === 0) return [];
  const eventIds = events.map((e) => e.id);

  const participantWhere = participantId
    ? { id: participantId }
    : {
        registrationDate: { lte: monthEnd },
        OR: [{ status: "ACTIVE" as const }, { status: "RETIRED" as const, retiredAt: { gt: monthStart } }],
        ...(group ? participantWhereForGroup(group) : {}),
      };

  const [participants, records] = await Promise.all([
    prisma.participant.findMany({
      where: participantWhere,
      select: { id: true, retiredAt: true, registrationDate: true, status: true, tskStatus: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { eventId: { in: eventIds } },
      select: { participantId: true, eventId: true, present: true },
    }),
  ]);

  const attendedSet = new Map<string, Set<string>>();
  for (const record of records) {
    if (record.present) {
      if (!attendedSet.has(record.participantId)) attendedSet.set(record.participantId, new Set());
      attendedSet.get(record.participantId)!.add(record.eventId);
    }
  }

  return participants.map((participant) => {
    const ownGroup = scopeToOwnGroup ? getGroupForStatus(participant.tskStatus) : null;
    const attendableEvents = events.filter((e) => {
      if (!isParticipantActiveOn(participant, e.date)) return false;
      if (!scopeToOwnGroup) return true; // already event-filtered by the query itself
      return e.group === null || e.group === ownGroup;
    });
    const totalEvents = attendableEvents.length;
    const attended = attendableEvents.filter((e) => attendedSet.get(participant.id)?.has(e.id)).length;
    return { participantId: participant.id, totalEvents, attended };
  });
}

export function sumAttendance(entries: ParticipantMonthAttendance[]): { attended: number; totalEvents: number } {
  return {
    attended: entries.reduce((sum, e) => sum + e.attended, 0),
    totalEvents: entries.reduce((sum, e) => sum + e.totalEvents, 0),
  };
}
