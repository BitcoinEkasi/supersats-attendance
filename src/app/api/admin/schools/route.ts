import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { randomUUID } from "crypto";

function fields(body: Record<string, unknown>) {
  const b = body as Record<string, string | undefined>;
  return {
    location: b.location?.trim() || null,
    principalName: b.principalName?.trim() || null,
    principalContact: b.principalContact?.trim() || null,
    principalEmail: b.principalEmail?.trim() || null,
    secretaryName: b.secretaryName?.trim() || null,
    secretaryContact: b.secretaryContact?.trim() || null,
    secretaryEmail: b.secretaryEmail?.trim() || null,
  };
}

export async function GET() {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const schools = await prisma.school.findMany({ orderBy: { name: "asc" } });
  return Response.json(schools);
}

export async function POST(req: Request) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = body.name?.trim();
  if (!name) {
    return Response.json({ error: "School name is required" }, { status: 400 });
  }

  try {
    const school = await prisma.school.create({
      data: { id: randomUUID(), name, ...fields(body), createdBy: user.name ?? user.id },
    });
    return Response.json({ success: true, school });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("Unique constraint")) {
      return Response.json({ error: "A school with this name already exists" }, { status: 409 });
    }
    return Response.json({ error: "Failed to add school" }, { status: 500 });
  }
}
