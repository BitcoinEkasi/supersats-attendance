import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const title = body.title?.trim();
  const entries: { participantId: string; amountSats: number; note?: string }[] = body.entries ?? [];

  if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
  if (entries.length === 0) return Response.json({ error: "At least one entry is required" }, { status: 400 });
  if (entries.some((e) => !e.amountSats || e.amountSats <= 0)) {
    return Response.json({ error: "All entries must have a positive amount" }, { status: 400 });
  }

  const payout = await prisma.$transaction(async (tx) => {
    const p = await tx.specialPayout.create({
      data: { title, createdBy: user.id },
    });
    for (const e of entries) {
      await tx.specialPayoutEntry.create({
        data: { payoutId: p.id, participantId: e.participantId, amountSats: e.amountSats, note: e.note?.trim() || null },
      });
    }
    return p;
  });

  return Response.json({ id: payout.id }, { status: 201 });
}
