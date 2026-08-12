import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { TSK_GROUPS } from "@/lib/tsk-groups";

function parseRestrictedToGroup(value: unknown): { ok: true; value: string | null } | { ok: false } {
  if (!value) return { ok: true, value: null };
  if (typeof value === "string" && (TSK_GROUPS as readonly string[]).includes(value)) return { ok: true, value };
  return { ok: false };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
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
    const activity = await prisma.sessionActivity.update({
      where: { id },
      data: {
        name,
        restrictedToGroup: restricted.value as any,
        requiresNote: !!body.requiresNote,
      },
    });
    return Response.json({ success: true, activity });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Unique constraint")) {
      return Response.json({ error: "An activity with this name already exists" }, { status: 409 });
    }
    return Response.json({ error: "Failed to update activity" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.sessionActivity.delete({ where: { id } }).catch(() => null);

  return Response.json({ success: true });
}
