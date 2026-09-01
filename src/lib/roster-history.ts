import { prisma } from "@/lib/db";
import { TSK_GROUPS, getGroupForStatus, type TskGroupKey } from "@/lib/tsk-groups";

export type MonthlyRoster = {
  registered: number;
  groupRegistered: Record<TskGroupKey, number>;
};

/**
 * True if a participant was part of the active roster on `date` — registered by then, and
 * not yet retired as of that date. Retirement excludes starting ON the retirement date
 * itself, not strictly after it, per the "removed from the total from the date they're
 * retired" rule. Retirement is permanent (enforced at the API layer), so a participant can
 * never carry a stale retiredAt from a prior retirement while status is ACTIVE.
 */
export function isParticipantActiveOn(
  participant: { registrationDate: Date; status: string; retiredAt: Date | null },
  date: Date
): boolean {
  if (participant.registrationDate > date) return false;
  if (participant.status === "RETIRED" && participant.retiredAt != null && participant.retiredAt <= date) return false;
  return true;
}

export type LevelHistoryRow = { participantId: string; level: string; changedAt: Date };

/**
 * A participant's group as of a given date, reconstructed from their TskLevelHistory
 * rows (most recent row with changedAt <= asOf wins; rows must be sorted ascending by
 * changedAt, so this is correct regardless of insertion order, backdated manual
 * corrections included). `currentTskStatus`, if given, is used as a fallback when no
 * history row exists at or before `asOf` — e.g. a participant whose history hasn't
 * been backfilled — so callers that must not silently drop a participant (report/
 * reward generation) can pass their live `tskStatus`; callers happy to undercount a
 * chart line for an edge case (the roster-count use case below) can omit it.
 */
export function groupAsOf(
  historyByParticipant: Map<string, LevelHistoryRow[]>,
  participantId: string,
  asOf: Date,
  currentTskStatus: string | null = null,
): TskGroupKey | null {
  let level: string | null = null;
  for (const row of historyByParticipant.get(participantId) ?? []) {
    if (row.changedAt > asOf) break;
    level = row.level;
  }
  return getGroupForStatus(level ?? currentTskStatus);
}

/**
 * Reconstructs, for each given as-of date, how many participants were part of the
 * active roster (and which group they were in) as of that moment — from Participant
 * and TskLevelHistory only. Two bulk queries total, computed in-memory across every
 * as-of date: this is a small programme (a few dozen participants), not worth
 * per-month or per-participant queries.
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

  const historyByParticipant = new Map<string, LevelHistoryRow[]>();
  for (const row of levelHistory) {
    const arr = historyByParticipant.get(row.participantId);
    if (arr) arr.push(row);
    else historyByParticipant.set(row.participantId, [row]);
  }

  return asOfDates.map((asOf) => {
    const groupRegistered = Object.fromEntries(TSK_GROUPS.map((g) => [g, 0])) as Record<TskGroupKey, number>;
    let registered = 0;

    for (const p of participants) {
      if (!isParticipantActiveOn(p, asOf)) continue;

      registered++;

      const group = groupAsOf(historyByParticipant, p.id, asOf);
      if (group) groupRegistered[group]++;
    }

    return { registered, groupRegistered };
  });
}
