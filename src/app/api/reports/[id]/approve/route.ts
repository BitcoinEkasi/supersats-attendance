import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { getSASTNow } from "@/lib/sast";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const report = await prisma.monthlyReport.findUnique({ where: { id } });
  if (!report) return Response.json({ error: "Report not found" }, { status: 404 });
  if (report.status === "APPROVED") return Response.json({ error: "Report is already approved" }, { status: 400 });

  const { year, month } = getSASTNow();
  const currentYM = `${year}-${String(month).padStart(2, "0")}`;
  if (report.month >= currentYM) return Response.json({ error: "Month is not yet complete" }, { status: 400 });

  await prisma.monthlyReport.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date(), approvedBy: user.id },
  });

  return Response.json({ success: true });
}
