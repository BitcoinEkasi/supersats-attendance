import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: participantId } = await params;
  const { eventDate, eventName, location, division, result, verifyUrl } = await req.json();

  await prisma.performanceEvent.create({
    data: {
      participantId,
      eventDate: new Date(eventDate + "T00:00:00Z"),
      eventName,
      location: location || null,
      division: division || null,
      result,
      verifyUrl: verifyUrl || null,
    },
  });

  return Response.json({ success: true });
}
