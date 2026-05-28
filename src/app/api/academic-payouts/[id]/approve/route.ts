import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const payout = await prisma.academicPayout.findUnique({ where: { id } });
  if (!payout) return Response.json({ error: "Payout not found" }, { status: 404 });
  if (payout.status === "APPROVED") return Response.json({ error: "Already approved" }, { status: 400 });

  await prisma.academicPayout.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date(), approvedBy: user.id },
  });

  return Response.json({ success: true });
}
