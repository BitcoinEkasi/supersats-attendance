import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { upsertMonthlyReport } from "@/lib/upsert-report";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.monthlyReport.findUnique({ where: { id }, select: { month: true, status: true } });
  if (!report) return Response.json({ error: "Report not found" }, { status: 404 });
  if (report.status === "APPROVED") return Response.json({ error: "Cannot refresh an approved report" }, { status: 400 });

  await upsertMonthlyReport(report.month, user.id);
  return Response.json({ success: true });
}
