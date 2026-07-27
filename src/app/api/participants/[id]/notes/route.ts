import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: participantId } = await params;
  const { text } = await req.json();

  if (!text?.trim()) {
    return Response.json({ error: "Note text is required" }, { status: 400 });
  }

  await prisma.participantNote.create({
    data: { participantId, text: text.trim() },
  });

  return Response.json({ success: true });
}
