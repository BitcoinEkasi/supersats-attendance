import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { calculateRewardSats } from "@/lib/rewards";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const payout = await prisma.academicPayout.findUnique({ where: { id }, select: { year: true, term: true, status: true } });
  if (!payout) return Response.json({ error: "Payout not found" }, { status: 404 });
  if (payout.status === "APPROVED") return Response.json({ error: "Cannot refresh an approved payout" }, { status: 400 });

  const termField = `term${payout.term}Result` as "term1Result" | "term2Result" | "term3Result" | "term4Result";

  const schoolReports = await prisma.schoolReport.findMany({
    where: { year: payout.year, [termField]: { not: null } },
    select: { participantId: true, term1Result: true, term2Result: true, term3Result: true, term4Result: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.academicPayoutEntry.deleteMany({ where: { payoutId: id } });
    for (const report of schoolReports) {
      const gradePercent = report[termField] as number;
      await tx.academicPayoutEntry.create({
        data: { payoutId: id, participantId: report.participantId, gradePercent, rewardSats: calculateRewardSats(gradePercent) },
      });
    }
  });

  return Response.json({ success: true });
}
