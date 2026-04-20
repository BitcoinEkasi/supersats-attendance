import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR", "MARSHALL"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: participantId } = await params;
  const { notes } = await req.json();

  if (!notes?.trim()) {
    return Response.json({ error: "Please describe the requested change" }, { status: 400 });
  }

  await prisma.participantChangeRequest.create({
    data: {
      participantId: participantId || null,
      requestedBy: user.id,
      notes: notes.trim(),
    },
  });

  return Response.json({ success: true });
}
