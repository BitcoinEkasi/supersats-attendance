import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { upsertMonthlyReport } from "@/lib/upsert-report";
import { GROUP_PENALTY_OPTIONS } from "@/lib/rewards";
import type { TskGroupKey } from "@/lib/tsk-groups";

const MAX_REASON_LENGTH = 500;

// The status check and the write are one conditional UPDATE, so a report approved in the
// meantime can never have its penalty changed — an approved report's rewards are locked.
async function setPenalty(
  id: string,
  userId: string,
  data: { penaltyPercent: number; penaltyReason: string | null; penaltyBy: string | null; penaltyAt: Date | null },
) {
  const report = await prisma.monthlyReport.findUnique({ where: { id }, select: { month: true, group: true } });
  if (!report) return Response.json({ error: "Report not found" }, { status: 404 });

  const { count } = await prisma.monthlyReport.updateMany({ where: { id, status: "PENDING" }, data });
  if (count === 0) return Response.json({ error: "Report is approved — penalty is locked" }, { status: 400 });

  await upsertMonthlyReport(report.month, userId, (report.group as TskGroupKey | null) ?? null);
  return Response.json({ success: true });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const percent = Number(body?.percent);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  if (!(GROUP_PENALTY_OPTIONS as readonly number[]).includes(percent)) {
    return Response.json({ error: `Penalty must be one of ${GROUP_PENALTY_OPTIONS.join(", ")}%` }, { status: 400 });
  }
  if (!reason) return Response.json({ error: "A reason is required" }, { status: 400 });
  if (reason.length > MAX_REASON_LENGTH) {
    return Response.json({ error: `Reason must be ${MAX_REASON_LENGTH} characters or fewer` }, { status: 400 });
  }

  return setPenalty(id, user.id, { penaltyPercent: percent, penaltyReason: reason, penaltyBy: user.id, penaltyAt: new Date() });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  return setPenalty(id, user.id, { penaltyPercent: 0, penaltyReason: null, penaltyBy: null, penaltyAt: null });
}
