import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import type { EventCategory } from "@prisma/client";

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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR", "MARSHALL"]);
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
