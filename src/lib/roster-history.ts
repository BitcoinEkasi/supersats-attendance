import { prisma } from "@/lib/db";
import { TSK_GROUPS, getGroupForStatus, type TskGroupKey } from "@/lib/tsk-groups";

export type MonthlyRoster = {
  registered: number;
  groupRegistered: Record<TskGroupKey, number>;
};

/**
 * Reconstructs, for each given as-of date, how many participants were part of the
 * active roster (and which group they were in) as of that moment — from Participant
 * and TskLevelHistory only. Two bulk queries total, computed in-memory across every
 * as-of date: this is a small programme (a few dozen participants), not worth
 * per-month or per-participant queries.
 *
 * Known limitation: there's no history table for status/retirement transitions
 * (unlike TskLevelHistory for level/group changes). A participant who was retired
 * and later reactivated has their retiredAt wiped back to null by the API, so any
 * earlier retired window is lost — this can OVER-count them for past months during
 * that gap. Never under-counts, never throws.
 */
export async function computeMonthlyRosterCounts(asOfDates: Date[]): Promise<MonthlyRoster[]> {
  const [participants, levelHistory] = await Promise.all([
    prisma.participant.findMany({
      select: { id: true, registrationDate: true, status: true, retiredAt: true },
    }),
    prisma.tskLevelHistory.findMany({
      select: { participantId: true, level: true, changedAt: true },
      orderBy: { changedAt: "asc" },
    }),
  ]);

  const historyByParticipant = new Map<string, { level: string; changedAt: Date }[]>();
  for (const row of levelHistory) {
    const arr = historyByParticipant.get(row.participantId);
    if (arr) arr.push(row);
    else historyByParticipant.set(row.participantId, [row]);
  }

  return asOfDates.map((asOf) => {
    const groupRegistered = Object.fromEntries(TSK_GROUPS.map((g) => [g, 0])) as Record<TskGroupKey, number>;
    let registered = 0;

    for (const p of participants) {
      if (p.registrationDate > asOf) continue;
      const wasActive = p.status === "ACTIVE" || (p.retiredAt != null && p.retiredAt > asOf);
      if (!wasActive) continue;

      registered++;

      // Most recent history row with changedAt <= asOf; rows are sorted ascending
      // by changedAt, so this is correct regardless of insertion order (backdated
      // manual corrections included).
      let level: string | null = null;
      for (const row of historyByParticipant.get(p.id) ?? []) {
        if (row.changedAt > asOf) break;
        level = row.level;
      }
      const group = getGroupForStatus(level);
      if (group) groupRegistered[group]++;
    }

    return { registered, groupRegistered };
  });
}
