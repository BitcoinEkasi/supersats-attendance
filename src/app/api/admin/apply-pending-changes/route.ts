import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { isAcEligible } from "@/lib/tsk-levels";
// requireAuth used for non-cron requests; CRON_SECRET used for scheduled calls
import { updateBoltUserMeta } from "@/lib/bolt";
import { getDivisionLabel } from "@/lib/sa-id";

export async function POST(req: Request) {
  // Allow session auth (admin UI) or bearer token (cron)
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && bearer === cronSecret;

  if (!isCron) {
    const user = await requireAuth(["ADMINISTRATOR"]);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const pending = await prisma.pendingParticipantChange.findMany({
    where: { effectiveFrom: { lte: now }, appliedAt: null },
    include: {
      participant: {
        select: {
          id: true, tskStatus: true, isAssistantCoach: true, assistantCoachSince: true,
          boltUserId: true, dateOfBirth: true, gender: true,
        },
      },
    },
    orderBy: [{ participantId: "asc" }, { field: "asc" }],
  });

  let applied = 0;
  const errors: string[] = [];

  // Group by participant; sort tskStatus before isAssistantCoach so the
  // eligibility re-check on the AC change sees the freshly-written level.
  const byParticipant = new Map<string, typeof pending>();
  for (const c of pending) {
    const list = byParticipant.get(c.participantId) ?? [];
    list.push(c);
    byParticipant.set(c.participantId, list);
  }
  for (const list of byParticipant.values()) {
    list.sort((a, b) => (a.field === "tskStatus" ? -1 : b.field === "tskStatus" ? 1 : 0));
  }

  for (const [, changes] of byParticipant) {
    for (const change of changes) {
      const p = change.participant;
      try {
        if (change.field === "tskStatus") {
          const newLevel = change.newValue || null;
          await prisma.participant.update({
            where: { id: p.id },
            data: { tskStatus: newLevel, tskStatusUpdatedAt: change.effectiveFrom },
          });
          if (newLevel) {
            await prisma.tskLevelHistory.create({
              data: { participantId: p.id, level: newLevel, changedAt: change.effectiveFrom },
            });
          }
        } else if (change.field === "isAssistantCoach") {
          const wantsAc = change.newValue === "true";
          // Re-read current level (may have just been updated above)
          const fresh = await prisma.participant.findUnique({ where: { id: p.id }, select: { tskStatus: true } });
          const eligible = isAcEligible(fresh?.tskStatus ?? null);
          const actualNewIsAc = wantsAc && eligible;
          const newSince = actualNewIsAc ? change.effectiveFrom : null;
          await prisma.participant.update({
            where: { id: p.id },
            data: { isAssistantCoach: actualNewIsAc, assistantCoachSince: newSince },
          });
        }

        await prisma.pendingParticipantChange.update({
          where: { id: change.id },
          data: { appliedAt: now },
        });
        applied++;
      } catch (e) {
        errors.push(`${change.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Sync to Bolt after all changes for this participant
    const freshP = await prisma.participant.findUnique({
      where: { id: changes[0].participantId },
      select: { boltUserId: true, tskStatus: true, isAssistantCoach: true, dateOfBirth: true, gender: true },
    });
    if (freshP?.boltUserId && freshP.dateOfBirth) {
      try {
        const division = getDivisionLabel(freshP.dateOfBirth, freshP.gender);
        await updateBoltUserMeta(Number(freshP.boltUserId), {
          division,
          tsk_level: freshP.tskStatus,
          ac: freshP.isAssistantCoach,
        });
      } catch { /* non-critical */ }
    }
  }

  return Response.json({ applied, errors: errors.length > 0 ? errors : undefined });
}
