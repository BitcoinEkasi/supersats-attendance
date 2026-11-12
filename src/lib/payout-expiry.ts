import { prisma } from "@/lib/db";
import { getPayoutBatchStatus, cancelPayoutBatch, type PayoutBatchStatus } from "@/lib/bolt";

/**
 * If a monthly report's payout invoice expired unpaid, cancel the Bolt batch and
 * return the report to PENDING (un-approved), so it can't look finished while
 * nothing was paid. The admin re-approves it, which re-checks reserves and pays
 * directly or issues a fresh invoice.
 *
 * Returns true if the report was reset. Leaves the report untouched if the batch
 * isn't expired or the Bolt cancel fails (retried on the next check).
 * Pass a batch status already fetched by the caller to avoid a second lookup.
 */
export async function resetExpiredPayout(
  report: { id: string; month: string; group: string | null; payoutStatus: string; batchId: number | null },
  knownStatus?: PayoutBatchStatus | null
): Promise<boolean> {
  if (report.payoutStatus !== "invoiced" || !report.batchId) return false;
  const batchStatus = knownStatus === undefined ? await getPayoutBatchStatus(report.batchId) : knownStatus;
  if (!batchStatus?.expired) return false;

  try {
    await cancelPayoutBatch(report.batchId);
  } catch (err: any) {
    console.error(`[payout-expiry] Failed to cancel expired batch #${report.batchId}:`, err.message);
    return false;
  }

  // Guard on the current state so a concurrent reset/payment sync can't be overwritten
  const { count } = await prisma.monthlyReport.updateMany({
    where: { id: report.id, payoutStatus: "invoiced", batchId: report.batchId },
    data: {
      status: "PENDING",
      approvedAt: null,
      approvedBy: null,
      zarPerSat: null,
      payoutStatus: "unpaid",
      paymentRequest: null,
      paymentHash: null,
      batchId: null,
      totalPayoutSats: 0,
    },
  });
  if (count > 0) {
    console.log(`[payout-expiry] Report ${report.month} ${report.group ?? "ALL"}: invoice expired, batch #${report.batchId} cancelled, report back to PENDING`);
  }
  return count > 0;
}

/** Reset every approved report whose payout invoice has expired unpaid. */
export async function resetAllExpiredPayouts(): Promise<void> {
  const invoiced = await prisma.monthlyReport.findMany({
    where: { status: "APPROVED", payoutStatus: "invoiced" },
    select: { id: true, month: true, group: true, payoutStatus: true, batchId: true },
  });
  await Promise.all(invoiced.map((r) => resetExpiredPayout(r).catch(() => false)));
}
