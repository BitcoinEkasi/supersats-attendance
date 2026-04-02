import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const reports = await prisma.monthlyReport.findMany({
    orderBy: { generatedAt: "desc" },
    include: { entries: { select: { rewardSats: true, percentage: true } } },
  });

  return Response.json(reports);
}
