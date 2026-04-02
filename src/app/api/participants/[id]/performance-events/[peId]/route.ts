import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; peId: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { peId } = await params;

  await prisma.performanceEvent.delete({ where: { id: peId } });
  return Response.json({ success: true });
}
