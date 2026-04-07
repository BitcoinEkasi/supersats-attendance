import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(["ADMINISTRATOR"]);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (!body.reviewDate) {
    return Response.json({ error: "Review date is required" }, { status: 400 });
  }

  const review = await prisma.tskReview.create({
    data: {
      participantId: id,
      reviewDate: new Date(body.reviewDate + "T00:00:00Z"),
      documentUrl: body.documentUrl?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  });

  return Response.json(review);
}
