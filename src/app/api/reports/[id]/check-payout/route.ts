import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { getPayoutBatchStatus } from "@/lib/bolt";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.monthlyReport.findUnique({ where: { id } });
  if (!report) return Response.json({ error: "Report not found" }, { status: 404 });
  if (!report.batchId) return Response.json({ payout_status: report.payoutStatus, batch_status: null });

  const batchStatus = await getPayoutBatchStatus(report.batchId);

  if (batchStatus?.status === "paid" && report.payoutStatus !== "paid") {
    await prisma.monthlyReport.update({ where: { id }, data: { payoutStatus: "paid" } });
    await prisma.monthlyReportEntry.updateMany({
      where: { reportId: id, rewardSats: { gt: 0 } },
      data: { payoutStatus: "paid" },
    });
    return Response.json({ payout_status: "paid", batch_status: batchStatus });
  }

  return Response.json({ payout_status: report.payoutStatus, batch_status: batchStatus });
}
