import { prisma } from "@/lib/db";
import { getPayoutBatchStatus, cancelPayoutBatch, type PayoutBatchStatus } from "@/lib/bolt";

/** The three kinds of payout that can be paid by a Bolt invoice. */
export type PayoutKind = "monthly" | "academic" | "special";

type InvoicedItem = { id: string; payoutStatus: string; batchId: number | null };

// Fields cleared on reset, shared by all kinds (monthly reports also clear their locked ZAR rate)
const RESET_DATA = {
  status: "PENDING" as const,
  approvedAt: null,
  approvedBy: null,
  payoutStatus: "unpaid",
  paymentRequest: null,
  paymentHash: null,
  batchId: null,
  totalPayoutSats: 0,
};

async function applyReset(kind: PayoutKind, item: InvoicedItem & { batchId: number }): Promise<number> {
  // Guard on the current state so a concurrent reset/payment sync can't be overwritten
  const where = { id: item.id, payoutStatus: "invoiced", batchId: item.batchId };
  switch (kind) {
    case "monthly":
      return (await prisma.monthlyReport.updateMany({ where, data: { ...RESET_DATA, zarPerSat: null } })).count;
    case "academic":
      return (await prisma.academicPayout.updateMany({ where, data: RESET_DATA })).count;
    case "special":
      return (await prisma.specialPayout.updateMany({ where, data: RESET_DATA })).count;
  }
}

/**
 * If a payout's invoice expired unpaid, cancel the Bolt batch and return the item to
 * PENDING (un-approved), so it can't look finished while nothing was paid. The admin
 * approves it again to pay.
 *
 * Returns true if the item was reset. Leaves it untouched if the batch isn't expired or
 * the Bolt cancel fails (retried on the next check). Pass a batch status already fetched
 * by the caller to avoid a second lookup.
 */
export async function resetExpiredPayout(
  kind: PayoutKind,
  item: InvoicedItem,
  knownStatus?: PayoutBatchStatus | null
): Promise<boolean> {
  if (item.payoutStatus !== "invoiced" || !item.batchId) return false;
  const batchStatus = knownStatus === undefined ? await getPayoutBatchStatus(item.batchId) : knownStatus;
  if (!batchStatus?.expired) return false;

  try {
    await cancelPayoutBatch(item.batchId);
  } catch (err: any) {
    console.error(`[payout-expiry] Failed to cancel expired batch #${item.batchId}:`, err.message);
    return false;
  }

  const count = await applyReset(kind, { ...item, batchId: item.batchId });
  if (count > 0) {
    console.log(`[payout-expiry] ${kind} payout ${item.id}: invoice expired, batch #${item.batchId} cancelled, back to PENDING`);
  }
  return count > 0;
}

/** Reset every approved payout of this kind whose invoice has expired unpaid. */
export async function resetAllExpiredPayouts(kind: PayoutKind): Promise<void> {
  const where = { status: "APPROVED" as const, payoutStatus: "invoiced" };
  const select = { id: true, payoutStatus: true, batchId: true };
  const items: InvoicedItem[] =
    kind === "monthly" ? await prisma.monthlyReport.findMany({ where, select })
    : kind === "academic" ? await prisma.academicPayout.findMany({ where, select })
    : await prisma.specialPayout.findMany({ where, select });
  await Promise.all(items.map((i) => resetExpiredPayout(kind, i).catch(() => false)));
}
