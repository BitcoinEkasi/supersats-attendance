import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { createPayoutBatch, createBoltUser } from "@/lib/bolt";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const report = await prisma.monthlyReport.findUnique({
    where: { id },
    include: {
      entries: {
        include: {
          participant: {
            select: { boltUserId: true, tskId: true, fullNames: true, paymentMethod: true, lightningAddress: true },
          },
        },
      },
    },
  });
  if (!report) return Response.json({ error: "Report not found" }, { status: 404 });
  if (report.status !== "APPROVED") return Response.json({ error: "Report is not approved" }, { status: 400 });
  if (report.payoutStatus !== "unpaid") return Response.json({ error: "Payout already created" }, { status: 400 });

  const rewarded = report.entries.filter((e) => e.rewardSats > 0);

  // Auto-create Bolt accounts for LN address participants who don't have one yet
  for (const e of rewarded) {
    if (e.participant.paymentMethod === "LIGHTNING_ADDRESS" && !e.participant.boltUserId) {
      try {
        const bolt = await createBoltUser(e.participant.tskId, e.participant.fullNames);
        await prisma.participant.update({
          where: { id: e.participantId },
          data: { boltUserId: String(bolt.id) },
        });
        e.participant.boltUserId = String(bolt.id);
      } catch (err: any) {
        console.error(`[create-payout] Failed to create Bolt account for ${e.participant.tskId}:`, err.message);
      }
    }
  }

  const eligible = rewarded.filter((e) => e.participant.boltUserId);
  const ineligibleCount = rewarded.length - eligible.length;

  if (eligible.length === 0) {
    return Response.json({ success: false, error: "No eligible participants with bolt accounts", ineligible_count: ineligibleCount }, { status: 400 });
  }

  const batch = await createPayoutBatch({
    memo: `TSK rewards ${report.month}`,
    payouts: eligible.map((e) => ({
      user_id: Number(e.participant.boltUserId),
      amount_sats: e.rewardSats,
      description: `Monthly reward – ${report.month}`,
      payout_type: e.participant.paymentMethod === "LIGHTNING_ADDRESS" ? "ln_address" : "internal",
      ln_address: e.participant.paymentMethod === "LIGHTNING_ADDRESS" ? (e.participant.lightningAddress ?? undefined) : undefined,
    })),
  });

  await prisma.monthlyReport.update({
    where: { id },
    data: {
      paymentRequest: batch.payment_request,
      paymentHash: batch.payment_hash,
      totalPayoutSats: batch.total_sats,
      batchId: batch.batch_id,
      payoutStatus: "invoiced",
    },
  });

  return Response.json({
    success: true,
    invoice: {
      payment_request: batch.payment_request,
      qr_base64: batch.qr_base64,
      total_sats: batch.total_sats,
      eligible_count: eligible.length,
      ineligible_count: ineligibleCount,
    },
  });
}
