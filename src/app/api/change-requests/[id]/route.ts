import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  if (status === "resolved") {
    await prisma.participantChangeRequest.update({
      where: { id },
      data: { status: "resolved", resolvedAt: new Date() },
    });
    return Response.json({ success: true });
  }

  return Response.json({ error: "Invalid status" }, { status: 400 });
}
