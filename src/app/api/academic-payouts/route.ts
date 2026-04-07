import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { calculateRewardSats } from "@/lib/rewards";

export async function GET() {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const payouts = await prisma.academicPayout.findMany({
    orderBy: [{ year: "desc" }, { term: "desc" }],
    include: { _count: { select: { entries: true } } },
  });

  const result = await Promise.all(
    payouts.map(async (p) => {
      const qualifyingCount = await prisma.academicPayoutEntry.count({
        where: { payoutId: p.id, rewardSats: { gt: 0 } },
      });
      return { ...p, qualifyingCount };
    })
  );

  return Response.json(result);
}

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const year = parseInt(body.year);
  const term = parseInt(body.term);

  if (!year || term < 1 || term > 4) {
    return Response.json({ error: "Valid year and term (1–4) are required" }, { status: 400 });
  }

  const termField = `term${term}Result` as "term1Result" | "term2Result" | "term3Result" | "term4Result";

  const schoolReports = await prisma.schoolReport.findMany({
    where: { year, [termField]: { not: null } },
    select: {
      participantId: true,
      term1Result: true,
      term2Result: true,
      term3Result: true,
      term4Result: true,
    },
  });

  if (schoolReports.length === 0) {
    return Response.json({ error: "No school reports found for this year and term" }, { status: 400 });
  }

  // Upsert: if payout for this year+term already exists, replace its entries
  const existing = await prisma.academicPayout.findUnique({ where: { year_term: { year, term } } });

  const payout = await prisma.$transaction(async (tx) => {
    let payoutRecord;
    if (existing) {
      await tx.academicPayoutEntry.deleteMany({ where: { payoutId: existing.id } });
      payoutRecord = await tx.academicPayout.update({
        where: { id: existing.id },
        data: { status: "PENDING", payoutStatus: "unpaid", paymentRequest: null, paymentHash: null, totalPayoutSats: 0, batchId: null, approvedAt: null, approvedBy: null },
      });
    } else {
      payoutRecord = await tx.academicPayout.create({
        data: { year, term, createdBy: user.id },
      });
    }

    for (const report of schoolReports) {
      const gradePercent = report[termField] as number;
      const rewardSats = calculateRewardSats(gradePercent);
      await tx.academicPayoutEntry.create({
        data: {
          payoutId: payoutRecord.id,
          participantId: report.participantId,
          gradePercent,
          rewardSats,
        },
      });
    }

    return payoutRecord;
  });

  return Response.json({ id: payout.id });
}
