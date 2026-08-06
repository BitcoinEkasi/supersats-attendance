import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { upsertMonthlyReport } from "@/lib/upsert-report";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR", "MARSHAL"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  const records = (await req.json()) as { participantId: string; present: boolean; onTour?: boolean }[];

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { date: true, group: true } });
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });

  const month = event.date.toISOString().substring(0, 7);
  const report = await prisma.monthlyReport.findFirst({
    where: { month, group: (event.group as any) ?? null },
    select: { status: true },
  });
  if (report?.status === "APPROVED") {
    return Response.json(
      { error: "This month has already been approved and is locked — attendance can no longer be edited." },
      { status: 409 },
    );
  }

  try {
    await prisma.$transaction(
      records.map((r) =>
        prisma.attendanceRecord.upsert({
          where: { participantId_eventId: { participantId: r.participantId, eventId } },
          update: { present: r.present, onTour: r.onTour ?? false },
          create: { participantId: r.participantId, eventId, present: r.present, onTour: r.onTour ?? false },
        }),
      ),
    );

    await upsertMonthlyReport(month, user.id, (event.group as any) ?? null);

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to save attendance" }, { status: 500 });
  }
}
