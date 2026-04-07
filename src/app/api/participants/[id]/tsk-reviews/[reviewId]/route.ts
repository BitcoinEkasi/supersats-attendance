import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; reviewId: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId } = await params;
  await prisma.tskReview.delete({ where: { id: reviewId } });
  return Response.json({ success: true });
}
