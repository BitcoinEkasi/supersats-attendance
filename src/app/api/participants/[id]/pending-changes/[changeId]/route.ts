import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; changeId: string }> }
) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, changeId } = await params;

  try {
    await prisma.pendingParticipantChange.delete({
      where: { id: changeId, participantId: id, appliedAt: null },
    });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Pending change not found" }, { status: 404 });
  }
}
