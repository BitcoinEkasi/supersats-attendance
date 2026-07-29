import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { getStartOfSASTToday } from "@/lib/sast";
import { getGroupForStatus } from "@/lib/tsk-groups";
import { countConsecutiveMissed } from "@/lib/consecutive-missed";

export async function POST(req: Request) {
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && bearer === cronSecret;

  if (!isCron) {
    const user = await requireAuth(["ADMINISTRATOR"]);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getStartOfSASTToday();

  // Fetch all attendance records for past events for active participants in one query.
  // Already ordered desc by event date so the most recent record per participant comes first.
  const records = await prisma.attendanceRecord.findMany({
    where: {
      event: { date: { lt: today } },
      participant: { status: "ACTIVE" },
    },
    select: {
      participantId: true,
      present: true,
      participant: { select: { tskStatus: true } },
    },
    orderBy: { event: { date: "desc" } },
  });

  // Group by participantId (order preserved — most recent first)
  const byParticipant = new Map<string, { present: boolean; tskStatus: string | null }[]>();
  for (const r of records) {
    const list = byParticipant.get(r.participantId) ?? [];
    list.push({ present: r.present, tskStatus: r.participant.tskStatus });
    byParticipant.set(r.participantId, list);
  }

  // Compute consecutive missed from most recent
  const toFlag: { participantId: string; consecutiveMissed: number; group: string | null }[] = [];
  const toUnflag: string[] = [];

  for (const [participantId, recs] of byParticipant) {
    const count = countConsecutiveMissed(recs.map((r) => r.present));
    const group = getGroupForStatus(recs[0]?.tskStatus ?? null);
    if (count >= 3) {
      toFlag.push({ participantId, consecutiveMissed: count, group });
    } else {
      toUnflag.push(participantId);
    }
  }

  // Upsert flags for participants with 3+ consecutive misses
  let flagged = 0;
  for (const f of toFlag) {
    await prisma.absenceFlag.upsert({
      where: { participantId: f.participantId },
      create: { participantId: f.participantId, consecutiveMissed: f.consecutiveMissed, group: f.group },
      update: { consecutiveMissed: f.consecutiveMissed, group: f.group },
    });
    flagged++;
  }

  // Remove flags for participants who are no longer absent, plus any flag left over
  // for a participant who has since retired (retirement already clears its own flag
  // immediately, but this covers any that slipped through some other path).
  const cleared = await prisma.absenceFlag.deleteMany({
    where: { OR: [{ participantId: { in: toUnflag } }, { participant: { status: { not: "ACTIVE" } } }] },
  });

  return Response.json({ flagged, cleared: cleared.count });
}
