import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; certId: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { certId } = await params;

  await prisma.certification.delete({ where: { id: certId } });
  return Response.json({ success: true });
}
