import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { upsertMonthlyReport } from "@/lib/upsert-report";
import { getSASTDateString, getStartOfSASTMonth, getEndOfSASTMonth } from "@/lib/sast";
import { type TskGroupKey, isValidGroup } from "@/lib/tsk-groups";
import { getExcuseCategory } from "@/lib/excused-session-reasons";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ?? undefined;

  const where = month
    ? { date: { gte: getStartOfSASTMonth(month), lte: getEndOfSASTMonth(month) } }
    : {};

  const events = await prisma.event.findMany({
    where,
    orderBy: { date: "desc" },
    include: { _count: { select: { attendanceRecords: true } } },
  });

  return Response.json(events);
}

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR", "MARSHAL"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, category, note, group } = body as {
    date?: string;
    category?: string;
    note?: string;
    group?: string;
  };

  if (!date || !category) {
    return Response.json({ error: "Date and category are required" }, { status: 400 });
  }
  const activity = await prisma.sessionActivity.findUnique({ where: { name: category }, select: { requiresNote: true } });
  if (activity?.requiresNote && !note?.trim()) {
    return Response.json({ error: `A note is required when ${category} is selected as the session activity.` }, { status: 400 });
  }
  if (!group || !isValidGroup(group)) {
    return Response.json({ error: "A valid group is required" }, { status: 400 });
  }

  const dateStr = date === "today" ? getSASTDateString() : date;
  const tskGroup = group as TskGroupKey;

  const month = dateStr.substring(0, 7);
  const report = await prisma.monthlyReport.findFirst({
    where: { month, group: tskGroup },
    select: { status: true },
  });
  if (report?.status === "APPROVED") {
    return Response.json(
      { error: "This month has already been approved and is locked — no new sessions can be added." },
      { status: 409 },
    );
  }

  const excuse = await prisma.excusedSession.findFirst({
    where: { date: new Date(dateStr + "T12:00:00.000Z"), group: tskGroup },
    select: { reason: true },
  });
  if (excuse && getExcuseCategory(excuse.reason) === "excused") {
    return Response.json({ error: `No session today — ${excuse.reason}` }, { status: 409 });
  }

  // One session per (day, group)
  const existing = await prisma.event.findFirst({
    where: { date: new Date(dateStr + "T12:00:00.000Z"), group: tskGroup },
  });
  if (existing) {
    return Response.json({ error: "A session for this group already exists today", existingId: existing.id }, { status: 409 });
  }

  let event;
  try {
    event = await prisma.event.create({
      data: {
        date: new Date(dateStr + "T12:00:00.000Z"),
        category,
        group: tskGroup,
        note: note?.trim() || null,
        createdBy: user.id,
      },
    });
  } catch (err) {
    console.error("[events POST] failed to create event:", err);
    return Response.json({ error: "Failed to create session" }, { status: 500 });
  }

  try {
    await upsertMonthlyReport(month, user.id, tskGroup);
  } catch (err) {
    console.error("[events POST] failed to upsert monthly report:", err);
  }

  return Response.json({ id: event.id });
}
