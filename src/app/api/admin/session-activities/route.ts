import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { randomUUID } from "crypto";
import { TSK_GROUPS } from "@/lib/tsk-groups";

function parseRestrictedToGroup(value: unknown): { ok: true; value: string | null } | { ok: false } {
  if (!value) return { ok: true, value: null };
  if (typeof value === "string" && (TSK_GROUPS as readonly string[]).includes(value)) return { ok: true, value };
  return { ok: false };
}

export async function GET() {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const activities = await prisma.sessionActivity.findMany({ orderBy: { createdAt: "asc" } });
  return Response.json(activities);
}

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = body.name?.trim();
  if (!name) {
    return Response.json({ error: "Activity name is required" }, { status: 400 });
  }

  const restricted = parseRestrictedToGroup(body.restrictedToGroup);
  if (!restricted.ok) {
    return Response.json({ error: "Invalid group" }, { status: 400 });
  }

  try {
    const activity = await prisma.sessionActivity.create({
      data: {
        id: randomUUID(),
        name,
        restrictedToGroup: restricted.value as any,
        requiresNote: !!body.requiresNote,
        createdBy: user.name ?? user.id,
      },
    });
    return Response.json({ success: true, activity });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Unique constraint")) {
      return Response.json({ error: "An activity with this name already exists" }, { status: 409 });
    }
    return Response.json({ error: "Failed to add activity" }, { status: 500 });
  }
}
