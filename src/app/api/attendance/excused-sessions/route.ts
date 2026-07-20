import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { isValidGroup, TSK_GROUPS, type TskGroupKey } from "@/lib/tsk-groups";
import { getReasonsForScope } from "@/lib/excused-session-reasons";

function parseDate(date: unknown): Date | null {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return new Date(`${date}T12:00:00.000Z`);
}

function isValidReason(reason: string, scope: "group" | "all-groups"): boolean {
  return getReasonsForScope(scope).some((r) => r.label === reason);
}

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, group, allGroups, reason } = body as {
    date?: string;
    group?: string;
    allGroups?: boolean;
    reason?: string;
  };

  const dateObj = parseDate(date);
  if (!dateObj) return Response.json({ error: "A valid date is required" }, { status: 400 });
  if (!reason?.trim()) return Response.json({ error: "A reason is required" }, { status: 400 });
  const trimmedReason = reason.trim();

  if (allGroups) {
    if (!isValidReason(trimmedReason, "all-groups")) {
      return Response.json({ error: "That reason isn't available for the All Groups flag" }, { status: 400 });
    }

    // A day with a real session in any group can't also be excused for all groups.
    const conflicting = await prisma.event.findMany({
      where: { date: dateObj, group: { in: [...TSK_GROUPS] } },
      select: { group: true },
    });
    if (conflicting.length > 0) {
      const groups = [...new Set(conflicting.map((e) => e.group))];
      return Response.json({ error: `A session already exists for this date (${groups.join(", ")})` }, { status: 409 });
    }

    for (const tskGroup of TSK_GROUPS) {
      await prisma.excusedSession.upsert({
        where: { date_group: { date: dateObj, group: tskGroup } },
        create: { date: dateObj, group: tskGroup, reason: trimmedReason, createdBy: user.id },
        update: { reason: trimmedReason, reasonOther: null },
      });
    }
    return Response.json({ success: true });
  }

  if (!group || !isValidGroup(group)) return Response.json({ error: "A valid group is required" }, { status: 400 });
  if (!isValidReason(trimmedReason, "group")) {
    return Response.json({ error: "That reason isn't available for a single group" }, { status: 400 });
  }
  const tskGroup = group as TskGroupKey;

  // A day with a real session can't also be excused.
  const existingEvent = await prisma.event.findFirst({ where: { date: dateObj, group: tskGroup } });
  if (existingEvent) {
    return Response.json({ error: "A session already exists for this date" }, { status: 409 });
  }

  await prisma.excusedSession.upsert({
    where: { date_group: { date: dateObj, group: tskGroup } },
    create: { date: dateObj, group: tskGroup, reason: trimmedReason, createdBy: user.id },
    update: { reason: trimmedReason, reasonOther: null },
  });

  return Response.json({ success: true });
}

export async function DELETE(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, group, allGroups } = body as { date?: string; group?: string; allGroups?: boolean };

  const dateObj = parseDate(date);
  if (!dateObj) return Response.json({ error: "A valid date is required" }, { status: 400 });

  if (allGroups) {
    for (const tskGroup of TSK_GROUPS) {
      try {
        await prisma.excusedSession.delete({ where: { date_group: { date: dateObj, group: tskGroup } } });
      } catch (err) {
        if ((err as { code?: string }).code !== "P2025") throw err;
      }
    }
    return Response.json({ success: true });
  }

  if (!group || !isValidGroup(group)) return Response.json({ error: "A valid group is required" }, { status: 400 });

  try {
    await prisma.excusedSession.delete({ where: { date_group: { date: dateObj, group: group as TskGroupKey } } });
  } catch (err) {
    if ((err as { code?: string }).code !== "P2025") throw err;
  }

  return Response.json({ success: true });
}
