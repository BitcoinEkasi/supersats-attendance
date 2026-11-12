import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { getPayoutBatchStatus } from "@/lib/bolt";
import { resetExpiredPayout } from "@/lib/payout-expiry";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const payout = await prisma.academicPayout.findUnique({ where: { id } });
  if (!payout) return Response.json({ error: "Payout not found" }, { status: 404 });
  if (!payout.batchId) return Response.json({ payout_status: payout.payoutStatus, batch_status: null });

  const batchStatus = await getPayoutBatchStatus(payout.batchId);

  if (batchStatus?.status === "paid" && payout.payoutStatus !== "paid") {
    await prisma.academicPayout.update({ where: { id }, data: { payoutStatus: "paid" } });
    await prisma.academicPayoutEntry.updateMany({
      where: { payoutId: id, rewardSats: { gt: 0 } },
      data: { payoutStatus: "paid" },
    });
    return Response.json({ payout_status: "paid", batch_status: batchStatus });
  }

  // Invoice expired unpaid — cancel the bolt batch and return the payout to PENDING
  if (await resetExpiredPayout("academic", payout, batchStatus)) {
    return Response.json({ payout_status: "unpaid", expired: true, batch_status: batchStatus });
  }

  return Response.json({
    payout_status: payout.payoutStatus,
    expires_at: batchStatus?.expires_at ?? null,
    batch_status: batchStatus,
  });
}
