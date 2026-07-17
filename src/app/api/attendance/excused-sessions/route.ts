import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { isValidGroup, type TskGroupKey } from "@/lib/tsk-groups";

function parseDate(date: unknown): Date | null {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return new Date(`${date}T12:00:00.000Z`);
}

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, group, reason, reasonOther } = body as {
    date?: string;
    group?: string;
    reason?: string;
    reasonOther?: string;
  };

  const dateObj = parseDate(date);
  if (!dateObj) return Response.json({ error: "A valid date is required" }, { status: 400 });
  if (!group || !isValidGroup(group)) return Response.json({ error: "A valid group is required" }, { status: 400 });
  if (!reason?.trim()) return Response.json({ error: "A reason is required" }, { status: 400 });

  const tskGroup = group as TskGroupKey;

  // A day with a real session can't also be excused.
  const existingEvent = await prisma.event.findFirst({ where: { date: dateObj, group: tskGroup } });
  if (existingEvent) {
    return Response.json({ error: "A session already exists for this date" }, { status: 409 });
  }

  await prisma.excusedSession.upsert({
    where: { date_group: { date: dateObj, group: tskGroup } },
    create: {
      date: dateObj,
      group: tskGroup,
      reason: reason.trim(),
      reasonOther: reason === "Other" ? (reasonOther?.trim() || null) : null,
      createdBy: user.id,
    },
    update: {
      reason: reason.trim(),
      reasonOther: reason === "Other" ? (reasonOther?.trim() || null) : null,
    },
  });

  return Response.json({ success: true });
}

export async function DELETE(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, group } = body as { date?: string; group?: string };

  const dateObj = parseDate(date);
  if (!dateObj) return Response.json({ error: "A valid date is required" }, { status: 400 });
  if (!group || !isValidGroup(group)) return Response.json({ error: "A valid group is required" }, { status: 400 });

  try {
    await prisma.excusedSession.delete({ where: { date_group: { date: dateObj, group: group as TskGroupKey } } });
  } catch (err) {
    if ((err as { code?: string }).code !== "P2025") throw err;
  }

  return Response.json({ success: true });
}
