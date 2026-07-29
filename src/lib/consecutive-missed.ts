import { prisma } from "@/lib/db";

/** Counts consecutive misses working backward from the most recent record, stopping
 *  at the first present record (or the end of the list). `presentFlags` must already
 *  be ordered most-recent-first. */
export function countConsecutiveMissed(presentFlags: boolean[]): number {
  let count = 0;
  for (const present of presentFlags) {
    if (!present) count++;
    else break;
  }
  return count;
}

/** Batched version of the same count for a set of participants, using each
 *  participant's attendance history strictly before `before`. Participants with no
 *  qualifying records are simply absent from the returned map (treat as 0). */
export async function getConsecutiveMissedCounts(
  participantIds: string[],
  before: Date,
): Promise<Map<string, number>> {
  if (participantIds.length === 0) return new Map();

  const records = await prisma.attendanceRecord.findMany({
    where: { participantId: { in: participantIds }, event: { date: { lt: before } } },
    select: { participantId: true, present: true },
    orderBy: { event: { date: "desc" } },
  });

  const byParticipant = new Map<string, boolean[]>();
  for (const r of records) {
    const list = byParticipant.get(r.participantId) ?? [];
    list.push(r.present);
    byParticipant.set(r.participantId, list);
  }

  const counts = new Map<string, number>();
  for (const [participantId, presentFlags] of byParticipant) {
    counts.set(participantId, countConsecutiveMissed(presentFlags));
  }
  return counts;
}
