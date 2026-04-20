import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { upsertMonthlyReport } from "@/lib/upsert-report";
import { getSASTDateString, getStartOfSASTMonth, getEndOfSASTMonth } from "@/lib/sast";
import { type TskGroupKey, isValidGroup } from "@/lib/tsk-groups";
import type { EventCategory } from "@prisma/client";

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
  const user = await requireAuth(["ADMINISTRATOR", "MARSHALL"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, category, note, group } = body as {
    date?: string;
    category?: EventCategory;
    note?: string;
    group?: string;
  };

  if (!date || !category) {
    return Response.json({ error: "Date and category are required" }, { status: 400 });
  }
  if (!group || !isValidGroup(group)) {
    return Response.json({ error: "A valid group is required" }, { status: 400 });
  }

  const dateStr = date === "today" ? getSASTDateString() : date;
  const tskGroup = group as TskGroupKey;

  // One session per (day, group)
  const existing = await prisma.event.findFirst({
    where: { date: new Date(dateStr + "T12:00:00.000Z"), group: tskGroup },
  });
  if (existing) {
    return Response.json({ error: "A session for this group already exists today", existingId: existing.id }, { status: 409 });
  }

  try {
    const event = await prisma.event.create({
      data: {
        date: new Date(dateStr + "T12:00:00.000Z"),
        category,
        group: tskGroup,
        note: note?.trim() || null,
        createdBy: user.id,
      },
    });

    const month = dateStr.substring(0, 7);
    await upsertMonthlyReport(month, user.id, tskGroup);

    return Response.json({ id: event.id });
  } catch {
    return Response.json({ error: "Failed to create event" }, { status: 500 });
  }
}
