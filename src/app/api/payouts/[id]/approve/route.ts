import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { createPayoutBatch, createBoltUser } from "@/lib/bolt";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const payout = await prisma.specialPayout.findUnique({
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

  await prisma.specialPayout.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date(), approvedBy: user.id },
  });

  for (const e of payout.entries) {
    if (e.participant.paymentMethod === "LIGHTNING_ADDRESS" && !e.participant.boltUserId) {
      try {
        const bolt = await createBoltUser(e.participant.tskId, e.participant.fullNames);
        await prisma.participant.update({ where: { id: e.participantId }, data: { boltUserId: String(bolt.id) } });
        e.participant.boltUserId = String(bolt.id);
      } catch (err: any) {
        console.error(`[special-approve] Bolt account creation failed for ${e.participant.tskId}:`, err.message);
      }
    }
  }

  const eligible = payout.entries.filter((e) => e.participant.boltUserId && e.amountSats > 0);
  const ineligibleCount = payout.entries.length - eligible.length;

  if (eligible.length === 0) {
    return Response.json({ success: true, invoice: null, ineligible_count: ineligibleCount });
  }

  try {
    const batch = await createPayoutBatch({
      memo: `TSK special payout – ${payout.title}`,
      payouts: eligible.map((e) => ({
        user_id: Number(e.participant.boltUserId),
        amount_sats: e.amountSats,
        description: e.note ?? payout.title,
        payout_type: e.participant.paymentMethod === "LIGHTNING_ADDRESS" ? "ln_address" : "internal",
        ln_address: e.participant.paymentMethod === "LIGHTNING_ADDRESS" ? (e.participant.lightningAddress ?? undefined) : undefined,
      })),
    });

    await prisma.specialPayout.update({
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
