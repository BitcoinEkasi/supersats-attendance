import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { upsertMonthlyReport } from "@/lib/upsert-report";
import { getSASTDateString, getStartOfSASTMonth, getEndOfSASTMonth } from "@/lib/sast";
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
  const { date, category, note } = body as { date?: string; category?: EventCategory; note?: string };

  if (!date || !category) {
    return Response.json({ error: "Date and category are required" }, { status: 400 });
  }

  const dateStr = date === "today" ? getSASTDateString() : date;

  try {
    const event = await prisma.event.create({
      data: {
        date: new Date(dateStr + "T12:00:00.000Z"),
        category,
        note: note?.trim() || null,
        createdBy: user.id,
      },
    });

    const month = dateStr.substring(0, 7);
    await upsertMonthlyReport(month, user.id);

    return Response.json({ id: event.id });
  } catch {
    return Response.json({ error: "Failed to create event" }, { status: 500 });
  }
}
