import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await params;
  const { text } = await req.json();

  if (!text?.trim()) {
    return Response.json({ error: "Note text is required" }, { status: 400 });
  }

  await prisma.participantNote.update({ where: { id: noteId }, data: { text: text.trim() } });
  return Response.json({ success: true });
}
