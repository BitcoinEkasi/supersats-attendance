import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { createPayoutBatch, createBoltUser } from "@/lib/bolt";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const payout = await prisma.academicPayout.findUnique({
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
  if (!payout) return Response.json({ error: "Payout not found" }, { status: 404 });
  if (payout.status === "APPROVED") return Response.json({ error: "Already approved" }, { status: 400 });

  await prisma.academicPayout.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date(), approvedBy: user.id },
  });

  const rewarded = payout.entries.filter((e) => e.rewardSats > 0);

  for (const e of rewarded) {
    if (e.participant.paymentMethod === "LIGHTNING_ADDRESS" && !e.participant.boltUserId) {
      try {
        const bolt = await createBoltUser(e.participant.tskId, e.participant.fullNames);
        await prisma.participant.update({ where: { id: e.participantId }, data: { boltUserId: String(bolt.id) } });
        e.participant.boltUserId = String(bolt.id);
      } catch (err: any) {
        console.error(`[academic-approve] Bolt account creation failed for ${e.participant.tskId}:`, err.message);
      }
    }
  }

  const eligible = rewarded.filter((e) => e.participant.boltUserId);
  const ineligibleCount = rewarded.length - eligible.length;

  if (eligible.length === 0) {
    return Response.json({ success: true, invoice: null, ineligible_count: ineligibleCount });
  }

  try {
    const batch = await createPayoutBatch({
      memo: `TSK school grades ${payout.year} T${payout.term}`,
      payouts: eligible.map((e) => ({
        user_id: Number(e.participant.boltUserId),
        amount_sats: e.rewardSats,
        description: `School grades ${payout.year} T${payout.term}`,
        payout_type: e.participant.paymentMethod === "LIGHTNING_ADDRESS" ? "ln_address" : "internal",
        ln_address: e.participant.paymentMethod === "LIGHTNING_ADDRESS" ? (e.participant.lightningAddress ?? undefined) : undefined,
      })),
    });

    await prisma.academicPayout.update({
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
  } catch (err: any) {
    return Response.json({ success: true, invoice: null, invoice_error: err.message, ineligible_count: ineligibleCount });
  }
}
