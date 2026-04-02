import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const report = await prisma.monthlyReport.findUnique({
    where: { id },
    include: {
      entries: {
        include: {
          participant: {
            select: { tskId: true, surname: true, fullNames: true, knownAs: true },
          },
        },
        orderBy: { percentage: "desc" },
      },
    },
  });

  if (!report) return Response.json({ error: "Not found" }, { status: 404 });

  const lines = ["TSK ID,Name,Total Events,Attended,Percentage,Reward (sats),Payout Status"];

  for (const entry of report.entries) {
    const p = entry.participant;
    const name = p.knownAs ? `${p.knownAs} (${p.surname})` : `${p.surname}, ${p.fullNames}`;
    lines.push(
      [p.tskId, `"${name}"`, entry.totalEvents, entry.attended, `${entry.percentage}%`, entry.rewardSats, entry.payoutStatus].join(","),
    );
  }

  const csv = lines.join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv" } });
}
