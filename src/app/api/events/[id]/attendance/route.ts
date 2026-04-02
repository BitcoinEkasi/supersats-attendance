import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { upsertMonthlyReport } from "@/lib/upsert-report";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR", "MARSHALL"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  const records = (await req.json()) as { participantId: string; present: boolean; onTour?: boolean }[];

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

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { date: true } });
    if (event) {
      const month = event.date.toISOString().substring(0, 7);
      await upsertMonthlyReport(month, user.id);
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to save attendance" }, { status: 500 });
  }
}
