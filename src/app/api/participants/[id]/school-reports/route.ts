import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as {
    year: number;
    term1Result?: number | null;
    term1FileUrl?: string | null;
    term2Result?: number | null;
    term2FileUrl?: string | null;
    term3Result?: number | null;
    term3FileUrl?: string | null;
    term4Result?: number | null;
    term4FileUrl?: string | null;
  };

  if (!body.year || isNaN(body.year)) {
    return Response.json({ error: "year is required" }, { status: 400 });
  }

  const report = await prisma.schoolReport.upsert({
    where: { participantId_year: { participantId: id, year: body.year } },
    create: {
      participantId: id,
      year: body.year,
      term1Result: body.term1Result ?? null,
      term1FileUrl: body.term1FileUrl ?? null,
      term2Result: body.term2Result ?? null,
      term2FileUrl: body.term2FileUrl ?? null,
      term3Result: body.term3Result ?? null,
      term3FileUrl: body.term3FileUrl ?? null,
      term4Result: body.term4Result ?? null,
      term4FileUrl: body.term4FileUrl ?? null,
    },
    update: {
      term1Result: body.term1Result ?? null,
      term1FileUrl: body.term1FileUrl ?? null,
      term2Result: body.term2Result ?? null,
      term2FileUrl: body.term2FileUrl ?? null,
      term3Result: body.term3Result ?? null,
      term3FileUrl: body.term3FileUrl ?? null,
      term4Result: body.term4Result ?? null,
      term4FileUrl: body.term4FileUrl ?? null,
    },
  });

  return Response.json(report);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { year } = await req.json() as { year: number };

  await prisma.schoolReport.deleteMany({ where: { participantId: id, year } });
  return Response.json({ deleted: true });
}
