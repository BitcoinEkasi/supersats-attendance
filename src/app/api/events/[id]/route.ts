import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { upsertMonthlyReport } from "@/lib/upsert-report";
import { getStartOfSASTMonth, getEndOfSASTMonth } from "@/lib/sast";
import type { EventCategory, TskGroup } from "@prisma/client";
import type { TskGroupKey } from "@/lib/tsk-groups";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      attendanceRecords: {
        include: {
          participant: {
            select: { id: true, surname: true, fullNames: true, knownAs: true },
          },
        },
      },
    },
  });

  if (!event) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(event);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, date: true, group: true } });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  const d = event.date;
  const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const group = event.group as TskGroup | null;

  const report = await prisma.monthlyReport.findFirst({
    where: { month, group: group ?? null },
    select: { id: true, status: true },
  });
  if (report?.status === "APPROVED") {
    return Response.json(
      { error: "This session belongs to an approved report and cannot be deleted." },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    prisma.attendanceRecord.deleteMany({ where: { eventId: id } }),
    prisma.event.delete({ where: { id } }),
  ]);

  const monthStart = getStartOfSASTMonth(month);
  const monthEnd = getEndOfSASTMonth(month);
  const remaining = await prisma.event.count({
    where: { date: { gte: monthStart, lte: monthEnd }, group: group ?? undefined },
  });

  if (remaining > 0) {
    await upsertMonthlyReport(month, user.id, group as TskGroupKey | null);
  } else if (report) {
    await prisma.monthlyReportEntry.deleteMany({ where: { reportId: report.id } });
    await prisma.monthlyReport.update({
      where: { id: report.id },
      data: { status: "PENDING", approvedAt: null, approvedBy: null },
    });
  }

  return Response.json({ success: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR", "MARSHAL"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  try {
    const data: { note?: string | null; category?: EventCategory } = {};
    if ("note" in body) data.note = body.note?.trim() || null;
    if ("category" in body) data.category = body.category as EventCategory;

    await prisma.event.update({ where: { id }, data });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to update event" }, { status: 500 });
  }
}
