import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { createPayoutBatch, directPayoutBatch, getBoltReserve, createBoltUser } from "@/lib/bolt";
import { TSK_GROUP_LABELS } from "@/lib/tsk-groups";

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

  const totalRewardSats = eligible.reduce((sum, e) => sum + e.rewardSats, 0);
  const groupLabel = report.group ? (TSK_GROUP_LABELS[report.group] ?? report.group) : "All";
  const batchMemo = `TSK rewards ${report.month} – ${groupLabel}`;
  const payoutItems = eligible.map((e) => ({
    user_id: Number(e.participant.boltUserId),
    amount_sats: e.rewardSats,
    description: `Monthly reward – ${report.month}`,
    payout_type: e.participant.paymentMethod === "LIGHTNING_ADDRESS" ? "ln_address" : "internal",
    ln_address: e.participant.paymentMethod === "LIGHTNING_ADDRESS" ? (e.participant.lightningAddress ?? undefined) : undefined,
  }));

  // Check bolt reserves
  let reserveSats = 0;
  try {
    const reserveData = await getBoltReserve();
    reserveSats = reserveData.reserve_sats;
  } catch (err: any) {
    console.error(`[create-payout] Failed to fetch bolt reserve:`, err.message);
    // Fall through to invoice-based payout
  }

  if (reserveSats >= totalRewardSats) {
    // ── Direct payout from reserves ──
    const batch = await directPayoutBatch({ memo: batchMemo, payouts: payoutItems });

    await prisma.$transaction([
      prisma.monthlyReport.update({
        where: { id },
        data: {
          batchId: batch.batch_id,
          totalPayoutSats: totalRewardSats,
          payoutStatus: "paid",
        },
      }),
      prisma.monthlyReportEntry.updateMany({
        where: { reportId: id, rewardSats: { gt: 0 } },
        data: { payoutStatus: "paid" },
      }),
    ]);

    return Response.json({
      success: true,
      direct: true,
      total_sats: totalRewardSats,
      eligible_count: eligible.length,
      ineligible_count: ineligibleCount,
    });
  }

  // ── Invoice-based payout (full or shortfall top-up) ──
  const shortfall = totalRewardSats - reserveSats;
  const useTopup = reserveSats > 0;

  const batch = await createPayoutBatch({
    memo: batchMemo,
    payouts: payoutItems,
    ...(useTopup ? { invoice_sats: shortfall } : {}),
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
      ...(useTopup ? { topup_sats: shortfall, reserve_sats: reserveSats, full_total_sats: totalRewardSats } : {}),
      eligible_count: eligible.length,
      ineligible_count: ineligibleCount,
    },
  });
}
