import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { randomUUID } from "crypto";
import type { CertificationType } from "@prisma/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: participantId } = await params;
  const { type, fileUrl } = (await req.json()) as { type: CertificationType; fileUrl: string };

  const existing = await prisma.certification.findFirst({ where: { participantId, type } });

  await prisma.certification.upsert({
    where: { id: existing?.id ?? randomUUID() },
    update: { fileUrl, uploadedAt: new Date() },
    create: { id: randomUUID(), participantId, type, fileUrl },
  });

  return Response.json({ success: true });
}
