import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { profilePicture } = await req.json();

  await prisma.participant.update({ where: { id }, data: { profilePicture: profilePicture || null } });
  return Response.json({ success: true });
}
