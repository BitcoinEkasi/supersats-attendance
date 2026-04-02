import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { createBoltUser, createBoltCard } from "@/lib/bolt";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { cardId } = await req.json() as { cardId?: string };

  if (!cardId?.trim()) {
    return Response.json({ error: "cardId is required" }, { status: 400 });
  }

  const participant = await prisma.participant.findUnique({ where: { id } });
  if (!participant) return Response.json({ error: "Participant not found" }, { status: 404 });

  let boltUserId: number;

  if (participant.boltUserId) {
    // Bolt user already exists — just create a new card
    boltUserId = Number(participant.boltUserId);
  } else {
    try {
      const displayName = `${participant.fullNames} ${participant.surname}`;
      const boltUser = await createBoltUser(participant.tskId, displayName);
      boltUserId = boltUser.id;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return Response.json({ error: `Failed to create bolt user: ${msg}` }, { status: 502 });
    }
  }

  try {
    await createBoltCard(boltUserId, cardId.trim());
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: `Failed to create bolt card: ${msg}` }, { status: 502 });
  }

  await prisma.participant.update({
    where: { id },
    data: { boltUserId: String(boltUserId), boltCardId: cardId.trim() },
  });

  return Response.json({ boltUserId });
}
