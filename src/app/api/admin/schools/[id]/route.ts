import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as Record<string, string | undefined>;
  const name = body.name?.trim();
  if (!name) {
    return Response.json({ error: "School name is required" }, { status: 400 });
  }

  try {
    const school = await prisma.school.update({
      where: { id },
      data: {
        name,
        location: body.location?.trim() || null,
        principalName: body.principalName?.trim() || null,
        principalContact: body.principalContact?.trim() || null,
        principalEmail: body.principalEmail?.trim() || null,
        secretaryName: body.secretaryName?.trim() || null,
        secretaryContact: body.secretaryContact?.trim() || null,
        secretaryEmail: body.secretaryEmail?.trim() || null,
      },
    });
    return Response.json({ success: true, school });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Unique constraint")) {
      return Response.json({ error: "A school with this name already exists" }, { status: 409 });
    }
    return Response.json({ error: "Failed to update school" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.school.delete({ where: { id } }).catch(() => null);

  return Response.json({ success: true });
}
